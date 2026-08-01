export const COMPARE_CHAT_MODES = {
  SELECT_1: "compare_select_1",
  SELECT_2: "compare_select_2",
};

export function emptyCompareState() {
  return {
    flow: "compare",
    car1: null,
    car2: null,
    completed: false,
  };
}

export function isCompareMode(mode) {
  return mode === COMPARE_CHAT_MODES.SELECT_1 || mode === COMPARE_CHAT_MODES.SELECT_2;
}

export function isCompareState(state) {
  return state?.flow === "compare";
}

export function wantsCompareFlow(message) {
  return /مقارنة|قارن|مقارنه|compare|versus|\bvs\b|ضد\b|بين\s*موديل/i.test(
    String(message || "")
  );
}

export function wantsCancelCompareFlow(message) {
  return /الغاء|إلغاء|cancel|توقف|مو ببغى مقارنة|ما ابغى مقارنة/i.test(
    String(message || "")
  );
}

/**
 * Detect "change first/second car" during or after a comparison.
 * @returns {1|2|"ask"|null}
 */
export function parseChangeCompareSlot(message) {
  const t = String(message || "").trim();
  if (!t) return null;

  const wantsChange =
    /تغيير|غيّر|غير|بد[ّل]|استبدال|change|switch|replace|swap/i.test(t) &&
    /سيار|اول|أول|أولى|اولى|ثان|ثاني|first|second|1|2|١|٢/i.test(t);

  if (!wantsChange) return null;

  if (
    /ثان(?:ي|ية|يه)?|الثانية|التانيه|التانية|second|\b2\b|٢/i.test(t)
  ) {
    return 2;
  }
  if (
    /أول(?:ى|ي)?|الاولى|الأولى|الاول|الأول|first|\b1\b|١/i.test(t)
  ) {
    return 1;
  }

  return "ask";
}

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "السعر عند الطلب";
  return `${n.toLocaleString("en-US")} ر.س`;
}

export function carLabel(car) {
  if (!car) return "—";
  return `${car.make || ""} ${car.model || ""} ${car.year || ""}`.replace(/\s+/g, " ").trim();
}

function displayValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

function boolLabel(value, yes = "نعم", no = "لا") {
  if (value == null) return "—";
  return value ? yes : no;
}

/** Structured rows for the comparison table UI. */
export function buildComparisonRows(car1, car2) {
  const p1 = Number(car1?.price);
  const p2 = Number(car2?.price);
  const bothPriced =
    Number.isFinite(p1) && p1 > 0 && Number.isFinite(p2) && p2 > 0;
  const priceDiff = bothPriced ? Math.abs(p1 - p2) : null;

  const rows = [
    {
      key: "price",
      label: "السعر",
      a: formatPrice(car1?.price),
      b: formatPrice(car2?.price),
      highlight: true,
    },
    priceDiff != null
      ? {
          key: "priceDiff",
          label: "فرق السعر",
          a: p1 <= p2 ? "—" : `+${priceDiff.toLocaleString("en-US")} ر.س`,
          b: p2 <= p1 ? "—" : `+${priceDiff.toLocaleString("en-US")} ر.س`,
          highlight: false,
        }
      : null,
    {
      key: "year",
      label: "سنة الصنع",
      a: displayValue(car1?.year),
      b: displayValue(car2?.year),
    },
    {
      key: "make",
      label: "الماركة",
      a: displayValue(car1?.make),
      b: displayValue(car2?.make),
    },
    {
      key: "model",
      label: "الموديل",
      a: displayValue(car1?.model),
      b: displayValue(car2?.model),
    },
    {
      key: "bodyType",
      label: "نوع الهيكل",
      a: displayValue(car1?.bodyType),
      b: displayValue(car2?.bodyType),
    },
    {
      key: "fuelType",
      label: "نوع الوقود",
      a: displayValue(car1?.fuelType),
      b: displayValue(car2?.fuelType),
    },
    {
      key: "transmission",
      label: "ناقل الحركة",
      a: displayValue(car1?.transmission),
      b: displayValue(car2?.transmission),
    },
    {
      key: "driveType",
      label: "نظام الدفع",
      a: displayValue(car1?.driveType),
      b: displayValue(car2?.driveType),
    },
    {
      key: "seats",
      label: "عدد المقاعد",
      a: displayValue(car1?.seats),
      b: displayValue(car2?.seats),
    },
    {
      key: "color",
      label: "اللون",
      a: displayValue(car1?.color),
      b: displayValue(car2?.color),
    },
    {
      key: "mileage",
      label: "المسافة المقطوعة",
      a:
        car1?.mileage != null
          ? `${Number(car1.mileage).toLocaleString("en-US")} كم`
          : "—",
      b:
        car2?.mileage != null
          ? `${Number(car2.mileage).toLocaleString("en-US")} كم`
          : "—",
    },
    {
      key: "category",
      label: "الفئة",
      a: displayValue(car1?.category),
      b: displayValue(car2?.category),
    },
    {
      key: "insurance",
      label: "شريحة التأمين",
      a: displayValue(car1?.insuranceSegment),
      b: displayValue(car2?.insuranceSegment),
    },
    {
      key: "luxury",
      label: "فاخرة",
      a: boolLabel(car1?.isLuxury),
      b: boolLabel(car2?.isLuxury),
    },
    {
      key: "economic",
      label: "اقتصادية",
      a: boolLabel(car1?.isEconomic),
      b: boolLabel(car2?.isEconomic),
    },
    {
      key: "commercial",
      label: "تجارية",
      a: boolLabel(car1?.isCommercial),
      b: boolLabel(car2?.isCommercial),
    },
    {
      key: "featured",
      label: "عرض مميز",
      a: boolLabel(car1?.featured),
      b: boolLabel(car2?.featured),
    },
    {
      key: "testDrive",
      label: "تجربة قيادة",
      a: boolLabel(car1?.testDriveAvailable, "متاحة", "غير متاحة"),
      b: boolLabel(car2?.testDriveAvailable, "متاحة", "غير متاحة"),
    },
  ].filter(Boolean);

  return rows.map((row) => ({
    ...row,
    differs: String(row.a) !== String(row.b),
  }));
}

export function buildComparisonIntro(car1, car2) {
  return `📊 مقارنة تفصيلية بين:\n1️⃣ **${carLabel(car1)}**\n2️⃣ **${carLabel(car2)}**\n\nراجع الجدول أدناه.\nيمكنك تغيير أي سيارة بالزر أو بكتابة: «تغيير السيارة الأولى» / «تغيير السيارة الثانية».`;
}

export function buildComparisonPayload(car1, car2) {
  return {
    car1Label: carLabel(car1),
    car2Label: carLabel(car2),
    rows: buildComparisonRows(car1, car2),
  };
}
