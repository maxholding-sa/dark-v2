/**
 * Arabic dictionary — the source of truth for copy.
 *
 * `en.ts` is typed against this object, so adding a key here without adding it
 * there is a compile error. That is the mechanism that stops translations from
 * silently drifting, which is what happened in v1 where 160 files carried
 * inline Arabic literals and English was never possible at all.
 */
export const ar = {
  common: {
    appName: "ماكس موتورز",
    loading: "جارِ التحميل…",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    create: "إضافة",
    search: "بحث",
    filter: "تصفية",
    clear: "مسح",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    confirm: "تأكيد",
    retry: "إعادة المحاولة",
    noResults: "لا توجد نتائج",
    required: "مطلوب",
    optional: "اختياري",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    currency: "ريال سعودي",
    onRequest: "متوفر عند الطلب",
  },

  nav: {
    home: "الرئيسية",
    cars: "السيارات",
    savedCars: "المفضلة",
    admin: "لوحة التحكم",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
  },

  cars: {
    title: "السيارات المتاحة",
    subtitle: "تصفح مجموعتنا من السيارات",
    resultsCount: "{count} سيارة",
    viewDetails: "عرض التفاصيل",
    save: "حفظ في المفضلة",
    unsave: "إزالة من المفضلة",
    saved: "تم الحفظ في المفضلة",
    unsaved: "تمت الإزالة من المفضلة",
    similar: "سيارات مشابهة",
    empty: "لا توجد سيارات مطابقة لبحثك",
    emptyHint: "جرّب تعديل عوامل التصفية أو مسحها",

    fields: {
      make: "الشركة المصنعة",
      model: "الموديل",
      year: "سنة الصنع",
      price: "السعر",
      mileage: "الممشى",
      color: "اللون",
      fuelType: "نوع الوقود",
      transmission: "ناقل الحركة",
      bodyType: "نوع الهيكل",
      driveType: "نظام الدفع",
      seats: "عدد المقاعد",
      category: "الفئة",
      description: "الوصف",
      status: "الحالة",
      featured: "مميزة",
      images: "الصور",
      videoUrl: "رابط الفيديو",
      testDriveAvailable: "متاحة لتجربة القيادة",
    },

    status: {
      AVAILABLE: "متوفرة",
      UNAVAILABLE: "غير متوفرة",
      SOLD: "مباعة",
    },

    filters: {
      title: "تصفية النتائج",
      make: "الشركة المصنعة",
      bodyType: "نوع الهيكل",
      fuelType: "نوع الوقود",
      transmission: "ناقل الحركة",
      color: "اللون",
      priceRange: "نطاق السعر",
      minPrice: "أقل سعر",
      maxPrice: "أعلى سعر",
      economic: "اقتصادية",
      commercial: "تجارية",
      luxury: "فاخرة",
      apply: "تطبيق",
      clearAll: "مسح الكل",
      activeCount: "{count} عامل تصفية",
    },

    sort: {
      label: "ترتيب حسب",
      newest: "الأحدث",
      priceAsc: "السعر: من الأقل",
      priceDesc: "السعر: من الأعلى",
      mileageAsc: "الأقل ممشى",
      yearDesc: "الأحدث موديلاً",
    },
  },

  admin: {
    cars: {
      title: "إدارة السيارات",
      create: "إضافة سيارة",
      edit: "تعديل السيارة",
      deleteConfirm: "هل أنت متأكد من حذف هذه السيارة؟ لا يمكن التراجع.",
      created: "تمت إضافة السيارة",
      updated: "تم تحديث السيارة",
      deleted: "تم حذف السيارة",
      statusUpdated: "تم تحديث الحالة",
    },
  },

  errors: {
    validation: "تحقق من البيانات المدخلة",
    unauthenticated: "يجب تسجيل الدخول للمتابعة",
    forbidden: "ليس لديك صلاحية لهذا الإجراء",
    notFound: "العنصر المطلوب غير موجود",
    conflict: "هذا العنصر موجود بالفعل",
    rate_limited: "عدد كبير من المحاولات، حاول لاحقاً",
    external_service: "تعذر الاتصال بالخدمة، حاول لاحقاً",
    internal: "حدث خطأ غير متوقع، حاول لاحقاً",
    unexpected: "حدث خطأ غير متوقع",
  },

  validation: {
    required: "هذا الحقل مطلوب",
    tooShort: "القيمة قصيرة جداً",
    tooLong: "القيمة طويلة جداً",
    invalidNumber: "أدخل رقماً صحيحاً",
    invalidUrl: "أدخل رابطاً صحيحاً",
    priceMin: "السعر يجب أن يكون أكبر من صفر",
    yearRange: "سنة الصنع غير منطقية",
    imagesRequired: "أضف صورة واحدة على الأقل",
  },
} as const;

export type Dictionary = typeof ar;
