// One-off backfill: clean Car.make / Car.model / Car.category so the
// make / model / trim dropdowns stop showing the same name several times.
//
//   node scripts/normalize-car-names.mjs           # dry run, prints the diff
//   node scripts/normalize-car-names.mjs --apply   # writes (backs up first)
//
// Two passes:
//  1. whitespace — trim, collapse doubled spaces, drop tatweel/bidi marks.
//  2. spelling   — names that differ only in hamza/alef form (أوربان vs اوربان)
//     collapse onto the spelling used by the most cars.
//
// Trims get the same treatment: "GLX" and "GLX " are one trim to a customer,
// so they must be one option in the dropdown.

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿ـ]/g;
const ARABIC_DIACRITICS = /[ً-ْٰ]/g;

function normalizeCarText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function carTextKey(value) {
  return normalizeCarText(value)
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      })
  );
}

const apply = process.argv.includes("--apply");
const env = { ...readEnv(".env"), ...readEnv(".env.local") };
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const sql = postgres(connectionString, { ssl: "require" });

try {
  const cars = await sql`select id, make, model, category from "Car"`;

  // Pass 1 — whitespace only.
  const cleaned = cars.map((car) => ({
    id: car.id,
    make: normalizeCarText(car.make),
    model: normalizeCarText(car.model),
    category: normalizeCarText(car.category),
    original: { make: car.make, model: car.model, category: car.category },
  }));

  // Pass 2 — pick the most common spelling within each variant group.
  const groups = new Map();
  for (const car of cleaned) {
    for (const field of ["make", "model", "category"]) {
      if (!car[field]) continue;
      const scope =
        field === "model"
          ? `${carTextKey(car.make)}|`
          : field === "category"
            ? `${carTextKey(car.make)}|${carTextKey(car.model)}|`
            : "";
      const key = `${field}|${scope}${carTextKey(car[field])}`;
      const counts = groups.get(key) ?? new Map();
      counts.set(car[field], (counts.get(car[field]) ?? 0) + 1);
      groups.set(key, counts);
    }
  }
  const canonical = new Map();
  for (const [key, counts] of groups) {
    // most cars wins; ties go to the plain-alef spelling for consistency
    const best = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || carTextKey(a[0]).localeCompare(a[0]) - carTextKey(b[0]).localeCompare(b[0]) || a[0].localeCompare(b[0])
    )[0][0];
    canonical.set(key, best);
  }

  const changes = [];
  for (const car of cleaned) {
    const make = canonical.get(`make|${carTextKey(car.make)}`) ?? car.make;
    const model =
      canonical.get(`model|${carTextKey(car.make)}|${carTextKey(car.model)}`) ?? car.model;
    const category = car.category
      ? canonical.get(
          `category|${carTextKey(car.make)}|${carTextKey(car.model)}|${carTextKey(car.category)}`
        ) ?? car.category
      : car.category;
    if (
      make !== car.original.make ||
      model !== car.original.model ||
      category !== (car.original.category ?? "")
    ) {
      changes.push({ id: car.id, make, model, category, original: car.original });
    }
  }

  const distinctBefore = new Set(cars.map((c) => `${c.make}|${c.model}`)).size;
  const applied = new Map(changes.map((c) => [c.id, c]));
  const distinctAfter = new Set(
    cars.map((c) => {
      const next = applied.get(c.id);
      return next ? `${next.make}|${next.model}` : `${c.make}|${c.model}`;
    })
  ).size;

  const renames = new Map();
  for (const change of changes) {
    const from = `${change.original.make} / ${change.original.model} / ${change.original.category ?? ""}`;
    const to = `${change.make} / ${change.model} / ${change.category ?? ""}`;
    if (from !== to) renames.set(from, to);
  }
  for (const [from, to] of [...renames].sort()) {
    console.log(`  ${JSON.stringify(from)}  ->  ${JSON.stringify(to)}`);
  }

  console.log(`\n${changes.length} of ${cars.length} cars need cleaning`);
  console.log(`distinct make+model: ${distinctBefore} -> ${distinctAfter}`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
  } else if (changes.length) {
    const backupPath = path.join(
      "scripts",
      `car-names-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        cars.map(({ id, make, model, category }) => ({ id, make, model, category })),
        null,
        2
      )
    );
    console.log(`\nBackup of all ${cars.length} rows written to ${backupPath}`);

    await sql.begin((tx) =>
      changes.map(
        (c) =>
          tx`update "Car" set make = ${c.make}, model = ${c.model}, category = ${c.category} where id = ${c.id}`
      )
    );
    console.log(`Updated ${changes.length} cars.`);
  }
} finally {
  await sql.end();
}
