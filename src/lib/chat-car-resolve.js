import { normalizeSearchText, expandTerm } from "@/lib/car-search";
import { generateContentResilient } from "@/lib/gemini";

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const rows = s.length + 1;
  const cols = t.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[s.length][t.length];
}

/** 0..1 similarity after Arabic/English normalization. */
export function textSimilarity(a, b) {
  const na = normalizeSearchText(a);
  const nb = normalizeSearchText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return 0.82 + ratio * 0.18;
  }
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - dist / maxLen);
}

function uniqueByKey(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Best similarity between any expanded form of `query` and `candidate`. */
function aliasedSimilarity(query, candidate) {
  const queryVariants = [query, ...expandTerm(query)];
  const candidateVariants = [candidate, ...expandTerm(candidate)];
  let best = 0;
  for (const q of queryVariants) {
    for (const c of candidateVariants) {
      best = Math.max(best, textSimilarity(q, c));
      if (best >= 0.99) return best;
    }
  }
  return best;
}

/**
 * Score user query against inventory make/model pairs.
 * Works for known aliases and unknown inventory-only names (typos, partials).
 * Keeps only the top-score cluster so weak near-misses (e.g. لكزس for هليكس) drop out.
 */
export function fuzzyMatchInventory(query, catalog, { limit = 8, minScore = 0.64 } = {}) {
  const q = String(query || "").trim();
  if (!q || !catalog?.pairs?.length) return [];

  const tokens = normalizeSearchText(q)
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = [];

  for (const pair of catalog.pairs) {
    const label = `${pair.make} ${pair.model}`.trim();
    const scores = [
      aliasedSimilarity(q, label),
      aliasedSimilarity(q, pair.model),
      aliasedSimilarity(q, pair.make),
    ];

    if (tokens.length >= 2) {
      const makeScore = Math.max(...tokens.map((t) => aliasedSimilarity(t, pair.make)));
      const modelScore = Math.max(...tokens.map((t) => aliasedSimilarity(t, pair.model)));
      scores.push((makeScore + modelScore) / 2);
      scores.push(
        Math.min(makeScore, modelScore) * 0.95 + Math.max(makeScore, modelScore) * 0.05
      );
    } else if (tokens.length === 1) {
      // Prefer model match over make for single-token queries (هليكس → هايلوكس, not لكزس)
      const modelScore = aliasedSimilarity(tokens[0], pair.model);
      const makeScore = aliasedSimilarity(tokens[0], pair.make);
      scores.push(modelScore);
      scores.push(makeScore * 0.85);
    }

    const score = Math.max(...scores);
    if (score >= minScore) {
      scored.push({ make: pair.make, model: pair.model, score, label });
    }
  }

  for (const make of catalog.makes || []) {
    const score = Math.max(
      aliasedSimilarity(q, make),
      ...tokens.map((t) => aliasedSimilarity(t, make))
    );
    if (score >= Math.max(minScore, 0.78)) {
      scored.push({ make, model: null, score: score * 0.95, label: make });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const unique = uniqueByKey(scored, (m) => `${m.make}::${m.model || "*"}`);
  if (!unique.length) return [];

  const topScore = unique[0].score;
  // Only keep close peers of the best hit (avoids mixing Hilux + Lexus)
  const clusterGap = topScore >= 0.85 ? 0.08 : 0.05;
  const clustered = unique.filter((m) => m.score >= topScore - clusterGap);

  // If best hit named a model, stick to that make (and preferably that model family)
  const top = clustered[0];
  if (top?.model) {
    const sameMake = clustered.filter((m) => m.make === top.make);
    const sameModel = sameMake.filter(
      (m) =>
        !m.model ||
        normalizeSearchText(m.model) === normalizeSearchText(top.model) ||
        normalizeSearchText(m.model).includes(normalizeSearchText(top.model)) ||
        normalizeSearchText(top.model).includes(normalizeSearchText(m.model))
    );
    return (sameModel.length ? sameModel : sameMake).slice(0, limit);
  }

  return clustered.slice(0, limit);
}

/**
 * Ask Gemini to map a free-text query onto inventory makes/models.
 * Used when exact + fuzzy search find nothing (Arabic↔English, rare names).
 */
export async function aiResolveInventoryMatches(query, catalog, { limit = 5 } = {}) {
  const q = String(query || "").trim();
  if (!q || q.length < 2 || !catalog?.pairs?.length) return [];

  const makes = (catalog.makes || []).slice(0, 80);
  const pairs = catalog.pairs.slice(0, 200).map((p) => `${p.make} | ${p.model}`);

  try {
    const prompt = `You help a Saudi car dealership chatbot map a customer search to inventory.

User query: """${q}"""

Available makes:
${makes.join(", ")}

Available make|model pairs:
${pairs.join("\n")}

Rules:
- Return ONLY valid JSON: {"matches":[{"make":"...","model":"..."}]}
- make and model MUST be copied EXACTLY from the inventory lists above
- model may be null if only the make is clear
- Max ${limit} matches, best first
- Understand Arabic and English, typos, and common Gulf spellings
- If nothing in inventory fits, return {"matches":[]}

JSON:`;

    const { text } = await generateContentResilient(prompt, {
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 400,
      },
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];

    const makeSet = new Set((catalog.makes || []).map((m) => m.toLowerCase()));
    const pairSet = new Set(
      (catalog.pairs || []).map(
        (p) => `${p.make.toLowerCase()}::${p.model.toLowerCase()}`
      )
    );

    return matches
      .map((m) => ({
        make: String(m?.make || "").trim(),
        model: m?.model == null || m?.model === "" ? null : String(m.model).trim(),
        score: 0.75,
      }))
      .filter((m) => m.make && makeSet.has(m.make.toLowerCase()))
      .filter((m) => {
        if (!m.model) return true;
        return pairSet.has(`${m.make.toLowerCase()}::${m.model.toLowerCase()}`);
      })
      .slice(0, limit);
  } catch (error) {
    console.error("[chat-car-resolve] AI resolve failed:", error?.message || error);
    return [];
  }
}

/** Build Prisma OR conditions from resolved make/model matches. */
export function buildMatchWhereConditions(matches = []) {
  const conditions = [];

  for (const match of matches) {
    if (!match?.make) continue;
    if (match.model) {
      conditions.push({
        AND: [
          { make: { equals: match.make, mode: "insensitive" } },
          { model: { equals: match.model, mode: "insensitive" } },
        ],
      });
      // Also allow contains for slight inventory variants (Camry LE, etc.)
      conditions.push({
        AND: [
          { make: { contains: match.make, mode: "insensitive" } },
          { model: { contains: match.model, mode: "insensitive" } },
        ],
      });
    } else {
      conditions.push({ make: { equals: match.make, mode: "insensitive" } });
      conditions.push({ make: { contains: match.make, mode: "insensitive" } });
    }
  }

  return uniqueByKey(conditions, (c) => JSON.stringify(c));
}
