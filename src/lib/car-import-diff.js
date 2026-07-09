const UPDATABLE_FIELDS = [
  "make", "model", "year", "price", "mileage", "color",
  "fuelType", "transmission", "bodyType", "driveType", "seats",
  "category", "videoUrl", "status", "description",
];

const BOOL_FIELDS = ["isLuxury", "isEconomic", "isCommercial", "featured", "testDriveAvailable"];

export function normalizeStr(val) {
  if (val == null) return "";
  return String(val)
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function toBool(val) {
  return val === "نعم" || val === true;
}

export function buildCarDiff(row, car) {
  const fieldChanges = [];
  const updateData = {};

  for (const field of UPDATABLE_FIELDS) {
    if (!(field in row)) continue;
    const incoming =
      field === "year" || field === "mileage" || field === "seats"
        ? row[field] !== "" && row[field] != null ? Number(row[field]) : null
        : field === "price"
          ? row[field] !== "" && row[field] != null ? parseFloat(row[field]) : null
          : row[field];

    const current =
      field === "price" ? parseFloat(car[field]?.toString() ?? "0") : car[field];

    const isNumeric = field === "year" || field === "mileage" || field === "seats" || field === "price";
    const isDifferent = isNumeric
      ? String(incoming ?? "") !== String(current ?? "")
      : normalizeStr(incoming) !== normalizeStr(current);

    if (isDifferent) {
      fieldChanges.push({ field, from: current, to: incoming });
      updateData[field] = incoming;
    }
  }

  for (const boolField of BOOL_FIELDS) {
    if (!(boolField in row)) continue;
    const incoming = toBool(row[boolField]);
    const current = toBool(car[boolField]);
    if (incoming !== current) {
      fieldChanges.push({ field: boolField, from: current, to: incoming });
      updateData[boolField] = incoming;
    }
  }

  return { fieldChanges, updateData };
}

export function compareImportRows(rows, existingCars) {
  const existingMap = Object.fromEntries(existingCars.map((c) => [c.id, c]));
  const changes = [];
  const toUpdate = [];

  for (const row of rows) {
    if (!row.id) continue;
    const car = existingMap[row.id];
    if (!car) continue;

    const { fieldChanges, updateData } = buildCarDiff(row, car);

    if (fieldChanges.length > 0) {
      changes.push({
        id: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        fieldChanges,
      });
      toUpdate.push({ id: car.id, data: updateData });
    }
  }

  return { changes, toUpdate };
}
