export const featuredCars = [
  {
    id: 1,
    make: "Hyudai",
    model: "Elantran",
    year: 2023,
    price: 28999,
    images: ["/1.png"],
    transmission: "Automatic",
    fuelType: "Gasoline",
    bodyType: "Sedan",
    mileage: 15000,
    color: "White",
    wishlisted: false,
  },
  {
    id: 2,
    make: "Range Rover",
    model: "",
    year: 2023,
    price: 26499,
    images: ["/2.webp"],
    transmission: "Manual",
    fuelType: "Gasoline",
    bodyType: "SUV",
    mileage: 12000,
    color: "Blue",
    wishlisted: true,
  },
  {
    id: 3,
    make: "Tesla",
    model: "Model 3",
    year: 2022,
    price: 42999,
    images: ["/3.jpg"],
    transmission: "Automatic",
    fuelType: "Electric",
    bodyType: "Sedan",
    mileage: 8000,
    color: "Red",
    wishlisted: false,
  },
];

export const carMakes = [
  { id: 1, name: "Hyundai", image: "/make/hyundai.webp" },
  { id: 2, name: "Honda", image: "/make/honda.webp" },
  { id: 3, name: "BMW", image: "/make/bmw.webp" },
  { id: 4, name: "Tata", image: "/make/tata.webp" },
  { id: 5, name: "Mahindra", image: "/make/mahindra.webp" },
  { id: 6, name: "Ford", image: "/make/ford.webp" },
];

export const bodyTypes = [
  { id: 1, name: "SUV", image: "/body/suv.webp" },
  { id: 2, name: "Sedan", image: "/body/sedan.webp" },
  { id: 3, name: "Hatchback", image: "/body/hatchback.webp" },
  { id: 4, name: "Convertible", image: "/body/convertible.webp" },
];

// Predefined filter options for car listings (used in admin and search filters)
export const fuelTypes = ["بنزين", "ديزل", "كهربائي", "هجين", "هجين قابل للشحن"];
export const transmissions = ["أوتوماتيك", "يدوي", "نصف أوتوماتيك"];
export const bodyTypeOptions = [
  "سيدان",
  "بيك اب",
  "كروس أوفر",
  "هاتشباك",
  "suv",
  "فان",
  "ميني فان",
  "رياضية",
];
export const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];
export const driveTypeOptions = ["دفع رباعي", "دفع خلفي", "دفع أمامي"];

/** Prisma orderBy prefix: فاخرة (luxury) first, then featured, then normal. Append createdAt or price. */
export const carDisplayPriorityOrderBy = [
  { isLuxury: "desc" },
  { featured: "desc" },
];

export const faqItems = [
  {
    question: "كيف يعمل حجز اختبار القيادة؟",
    answer:
      "ببساطة، ابحث عن السيارة التي تهمك، واضغط على زر 'حجز اختبار القيادة'، ثم اختر وقتًا متاحًا. سيقوم نظامنا بتأكيد الحجز وتوفير جميع التفاصيل اللازمة.",
  },
  {
    question: "هل يمكنني البحث عن السيارات باستخدام صورة؟",
    answer:
      "نعم! يتيح لك البحث باستخدام الصور المدعوم بالذكاء الاصطناعي رفع صورة لسيارة تعجبك، وسنبحث عن نماذج مشابهة في مخزوننا.",
  },
  {
    question: "هل جميع السيارات معتمدة ومتحقق منها؟",
    answer:
      "جميع السيارات المدرجة على منصتنا تمر بعملية تحقق. نحن وكلاء معتمدين وبائعون خاصون موثوقون.",
  },
  {
    question: "ماذا يحدث بعد حجز اختبار القيادة؟",
    answer:
      "بعد الحجز، ستتلقى بريدًا إلكترونيًا يؤكد الحجز مع جميع التفاصيل. سنتواصل معك أيضًا لتأكيد الحجز وتوفير أي معلومات إضافية.",
  },
  {
    question: "هل خدمة العملاء متوفرة على مدار الساعة؟",
    answer:
      "نعم! خدمة العملاء متوفرة على مدار الساعة عبر الشات بوت. يمكنك التواصل معنا في أي وقت للحصول على المساعدة.",
  },
];

