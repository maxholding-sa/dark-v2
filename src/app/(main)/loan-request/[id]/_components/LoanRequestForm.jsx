"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatSaudiRiyalReact } from "@/lib/helper";
import { calculateIslamicAutoFinance, createBankConfigFromBank } from "@/lib/loan-calculator";
import { Currency, User, Mail, Phone, MessageSquare, Calendar, ChevronLeft, ChevronRight, Upload, CheckCircle, Car, File, Key, Lock, Banknote, TrendingUp, AlertTriangle, Shield, Target, Award, BarChart3, DollarSign, Percent, Clock, Star } from "lucide-react";

const CURRENT_HIJRI_YEAR = 1447;

/** Car summary for loan flow: no price (handled in financing steps). */
function LoanRequestCarSummary({ car, variant = "step" }) {
  const headline = [car.make, car.model].filter(Boolean).join(" ");
  const specRows = [
    { label: "سنة الصنع", value: car.year },
    {
      label: "مسافة الاستخدام",
      value:
        car.mileage != null && car.mileage !== ""
          ? `${Number(car.mileage).toLocaleString("ar-SA")} كم`
          : "غير محدد",
    },
    { label: "اللون", value: car.color || "غير محدد" },
    { label: "نوع الوقود", value: car.fuelType || "غير محدد" },
    { label: "ناقل الحركة", value: car.transmission || "غير محدد" },
    { label: "نوع الهيكل", value: car.bodyType || "غير محدد" },
    {
      label: "عدد المقاعد",
      value: car.seats != null && car.seats !== "" ? String(car.seats) : "غير محدد",
    },
  ];
  if (car.category) {
    specRows.push({ label: "فئة السيارة", value: car.category });
  }

  const wrap =
    variant === "review"
      ? "rounded-xl border border-white/15 bg-zinc-900/80 p-5 text-right text-white"
      : "rounded-xl border border-yellow-600/50 bg-gradient-to-br from-yellow-800/90 to-yellow-950/90 p-5 text-right text-white shadow-lg";

  return (
    <div className={wrap}>
      <div className="flex flex-col gap-1 border-b border-white/20 pb-4 mb-4">
        <span className="text-xs font-medium text-white/70">المركبة المرتبطة بطلبك</span>
        <h3 className="text-xl font-bold leading-snug">{headline || "—"}</h3>
        <p className="text-sm text-white/85">موديل {car.year}</p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {specRows.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5"
          >
            <dt className="text-xs text-white/60">{label}</dt>
            <dd className="mt-0.5 font-semibold text-white">{value}</dd>
          </div>
        ))}
      </dl>
      {car.description ? (
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="text-xs font-medium text-white/60 mb-1">نبذة</p>
          <p className="text-sm leading-relaxed text-white/90 line-clamp-4">{car.description}</p>
        </div>
      ) : null}
      {car.id ? (
        <div className="mt-4 text-center sm:text-right">
          <Link
            href={`/cars/${car.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 underline-offset-4 hover:underline"
          >
            عرض صفحة السيارة كاملة
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const getAgeBracketFromHijriBirthYear = (birthYear) => {
  const year = Number.parseInt(birthYear, 10);
  if (!year) return "31 to 35";
  const age = CURRENT_HIJRI_YEAR - year;
  if (age <= 24) return "18 to 24";
  if (age <= 30) return "25 to 30";
  if (age <= 35) return "31 to 35";
  if (age <= 40) return "36 to 40";
  if (age <= 45) return "41 to 45";
  if (age <= 50) return "46 to 50";
  if (age <= 60) return "51 to 60";
  return "61+";
};

/** Top N offers by sort, skipping duplicates on distinctKey. */
const pickTopDistinctOffers = (offers, compareFn, distinctKeyFn, limit = 5) => {
  const sorted = [...offers].sort(compareFn);
  const picked = [];
  const seen = new Set();
  for (const offer of sorted) {
    const key = distinctKeyFn(offer);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(offer);
    if (picked.length >= limit) break;
  }
  return picked;
};

const generateIslamicOffers = ({ banks, formData, car }) => {
  const carPrice = Number(car.price) || 0;
  const selectedBank =
    banks.find((b) => b.id.toString() === formData.salaryTransferBank) || banks[0];
  const selectedBankRate = selectedBank?.interestRate ? Number(selectedBank.interestRate) : 4.5;
  const ageBracket = getAgeBracketFromHijriBirthYear(formData.birthYear);
  const gender = formData.gender || "male";

  const downOptions = [0.1, 0.2, 0.3, 0.4, 0.5];
  const terms = [12, 24, 36, 48, 60];
  const balloonOptions = [0, 0.1, 0.2];
  const adminOptions = [0.01, 0.015, 0.02];
  const rateOffsets = [-0.75, -0.25, 0, 0.25, 0.75];

  const offers = [];
  let offerId = 1;

  for (const termMonths of terms) {
    for (const downPct of downOptions) {
      for (const balloonPct of balloonOptions) {
        const effectiveRate = Math.max(0.01, (selectedBankRate + rateOffsets[(offerId - 1) % rateOffsets.length]) / 100);
        const adminPct = adminOptions[(offerId - 1) % adminOptions.length];
        const result = calculateIslamicAutoFinance(createBankConfigFromBank(selectedBank), {
          car_price: carPrice,
          down_payment_pct: downPct,
          term_months: termMonths,
          profit_rate: effectiveRate,
          admin_fees_pct: adminPct,
          balloon_payment_pct: balloonPct,
          gender,
          age_bracket: ageBracket,
          car_brand: car.make,
          rebate: 0,
        });

        offers.push({
          id: offerId,
          bankName: selectedBank?.name || "بنك افتراضي",
          downPayment: result.derived.down_payment_sar,
          downPaymentPct: downPct * 100,
          monthlyPayment: result.totals.total_monthly_payment,
          baseInstallment: result.totals.installment,
          monthlyInsurance: result.totals.monthly_insurance,
          termMonths,
          interestRate: effectiveRate * 100,
          adminFees: result.derived.admin_fees,
          balloonPayment: result.derived.balloon_payment,
          balloonPaymentPct: balloonPct * 100,
          finalPayment: result.derived.last_month_payment,
          lastMonthPayment: result.derived.last_month_payment,
          totalPayment: result.totals.grand_total,
          totalProfit: result.totals.total_profit,
          totalInsurance: result.totals.total_insurance,
          apr: result.metrics.apr,
          irr: result.metrics.irr,
          netMargin: result.metrics.net_margin,
          irrGap: result.metrics.irr_gap,
        });

        offerId += 1;
      }
    }
  }

  return offers;
};

const LoanRequestForm = ({ car }) => {
  const initialFormData = {
    idNumber: "",
    idImage: null,
    carMake: car.make,
    carModel: car.model,
    carCategory: car.category || "",
    carYear: car.year.toString(),
    mobileNumber: "",
    birthMonth: "",
    birthYear: "",
    gender: "",
    loanAmount: car.price.toString(),
    downPayment: (car.price * 0.2).toString(), // 20% of car price
    loanTerm: "5", // 5 years
    monthlyIncome: "",
    employmentStatus: "",
    additionalInfo: "",
    employerSector: "",
    employer: "",
    salaryTransferBank: "",
    netSalary: "",
    hasRealEstateFinance: "",
    hasCreditDefault: "",
    totalMonthlyObligations: "",
    fullName: "",
    email: "",
    city: "",
    time: "",
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [comparisonAnalysis, setComparisonAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);




  const selectOfferAndProceed = (offer) => {
    setFormData(prev => ({
      ...prev,
      downPayment: offer.downPayment.toString(),
      loanTerm: Math.floor(offer.termMonths / 12).toString(),
      loanAmount: String(car.price),
    }));
    setSelectedOffer(offer);
    nextStep();
  };

  const addToComparison = (offer) => {
    if (selectedOffers.find(o => o.id === offer.id)) {
      toast.error("هذا العرض موجود بالفعل في المقارنة");
      return;
    }
    setSelectedOffers([...selectedOffers, offer]);
    toast.success("تم إضافة العرض للمقارنة");
  };

  const removeFromComparison = (offerId) => {
    setSelectedOffers(selectedOffers.filter(o => o.id !== offerId));
  };

  const analyzeOffers = async () => {
    if (selectedOffers.length < 2) {
      toast.error("يجب اختيار عرضين على الأقل للمقارنة");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offers: selectedOffers,
          userData: {
            netSalary: formData.netSalary,
            totalMonthlyObligations: formData.totalMonthlyObligations,
            employerSector: formData.employerSector,
            hasRealEstateFinance: formData.hasRealEstateFinance,
            hasCreditDefault: formData.hasCreditDefault,
            carPrice: car.price,
            gender: formData.gender,
            birthYear: formData.birthYear,
          }
        }),
      });

      const result = await response.json();
      if (result.success) {
        setComparisonAnalysis(result.data);
      } else {
        toast.error("حدث خطأ في تحليل العروض");
      }
    } catch (error) {
      console.error('Error analyzing offers:', error);
      toast.error("حدث خطأ في تحليل العروض");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const steps = [
    { title: "تفاصيل السيارة والهوية", icon: File },
    { title: "معلومات السيارة ", icon: Car },
    { title: "البيانات الشخصية", icon: User },
    { title: "البيانات الإئتمانية", icon: Lock },
    { title: "العروض التمويلية", icon: Banknote },
    { title: "معلومات إضافية", icon: MessageSquare },
  ];

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/bank');
        const result = await response.json();
        if (result.success) {
          setBanks(result.data);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      }
    };
    fetchBanks();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          idImage: reader.result // base64 string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        if (!formData.idNumber || formData.idNumber.length !== 10 || !/^\d{10}$/.test(formData.idNumber)) {
          toast.error("يرجى ملء جميع الحقول المطلوبة: رقم الهوية الوطنية السعودية (10 أرقام)");
          return false;
        }
        break;
      case 1:
        // Car details are pre-filled and disabled, no validation needed
        break;
      case 2:
        if (!formData.mobileNumber || !formData.birthMonth || !formData.birthYear || !formData.gender) {
          toast.error("يرجى ملء جميع الحقول المطلوبة: رقم الجوال، تاريخ الميلاد، والنوع");
          return false;
        }
        break;
      case 3:
        // Credit data fields are optional, no validation needed
        break;
      case 4:
        // Financing offers step, validation handled separately
        break;
      case 5:
        if (!formData.fullName || !formData.email || !formData.city || !formData.time) {
          toast.error("يرجى ملء جميع الحقول المطلوبة: الاسم الكامل، البريد الإلكتروني، المدينة، والوقت المفضل");
          return false;
        }
        break;
      case 6:
        // Review step, no additional validation needed
        break;
      default:
        return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      if (currentStep === 4) {
        // Clear selected offers and comparison analysis when going back from financing offers step
        setSelectedOffers([]);
        setComparisonAnalysis(null);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          mobileNumber: "+966" + formData.mobileNumber,
          monthlyPayment: selectedOffer?.monthlyPayment,
          interestRate: selectedOffer?.interestRate,
          finalPayment: selectedOffer?.finalPayment,
          carId: car.id,
          carDetails: {
            year: car.year,
            make: car.make,
            model: car.model,
            price: car.price,
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error submitting loan request:', error);
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setFormData(initialFormData);
    setCurrentStep(0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <LoanRequestCarSummary car={car} variant="step" />

            {/* ID Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات الهوية (السعودية)</h3>

              <div>
                <Label htmlFor="idNumber" className="mb-2">رقم الهوية *</Label>
                <Input
                  id="idNumber"
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  required
                  placeholder="أدخل رقم الهوية"
                  maxLength="10"
                />
              </div>

              {/* <div>
                <Label htmlFor="idImage" className="mb-2">صورة الهوية *</Label>
                <div className="mt-1">
                  <input
                    id="idImage"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <label
                    htmlFor="idImage"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {formData.idImage ? "تم تحميل الصورة" : "انقر لتحميل صورة الهوية"}
                      </p>
                    </div>
                  </label>
                </div>
              </div> */}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              معلومات السيارة
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="carMake" className="mb-2">ماركة السيارة *</Label>
                <Input
                  id="carMake"
                  type="text"
                  value={formData.carMake}
                  disabled
                  placeholder="أدخل ماركة السيارة"
                />
              </div>

              <div>
                <Label htmlFor="carModel" className="mb-2">موديل السيارة *</Label>
                <Input
                  id="carModel"
                  type="text"
                  value={formData.carModel}
                  disabled
                  placeholder="أدخل موديل السيارة"
                />
              </div>

              <div>
                <Label htmlFor="carCategory" className="mb-2">فئة السيارة</Label>
                <Input
                  id="carCategory"
                  type="text"
                  value={formData.carCategory}
                  disabled
                  placeholder="أدخل فئة السيارة"
                />
              </div>

              <div>
                <Label htmlFor="carYear" className="mb-2">سنة صنع السيارة *</Label>
                <Input
                  id="carYear"
                  type="number"
                  value={formData.carYear}
                  disabled
                  placeholder="أدخل سنة صنع السيارة"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              البيانات الشخصية
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mobileNumber" className="mb-4">رقم الجوال *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-white pointer-events-none">
                    966+
                  </span>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    required
                    placeholder="5xxxxxxxx"
                    className="pl-12"
                    maxLength="9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthMonth" className="mb-4">شهر الميلاد (هجري) *</Label>
                  <Select value={formData.birthMonth} onValueChange={(value) => handleInputChange('birthMonth', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر شهر الميلاد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">محرم</SelectItem>
                      <SelectItem value="2">صفر</SelectItem>
                      <SelectItem value="3">ربيع الأول</SelectItem>
                      <SelectItem value="4">ربيع الآخر</SelectItem>
                      <SelectItem value="5">جمادى الأولى</SelectItem>
                      <SelectItem value="6">جمادى الآخرة</SelectItem>
                      <SelectItem value="7">رجب</SelectItem>
                      <SelectItem value="8">شعبان</SelectItem>
                      <SelectItem value="9">رمضان</SelectItem>
                      <SelectItem value="10">شوال</SelectItem>
                      <SelectItem value="11">ذو القعدة</SelectItem>
                      <SelectItem value="12">ذو الحجة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="birthYear" className="mb-4">سنة الميلاد (هجري) *</Label>
                  <Select value={formData.birthYear} onValueChange={(value) => handleInputChange('birthYear', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سنة الميلاد" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 100 }, (_, i) => {
                        const hijriYear = 1445 - i; // Current Hijri year is approximately 1445 AH
                        return (
                          <SelectItem key={hijriYear} value={hijriYear.toString()}>
                            {hijriYear} هـ
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-4">النوع *</Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === "male"}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      required
                      className="ml-2"
                    />
                    ذكر
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === "female"}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      required
                      className="ml-2"
                    />
                    أنثى
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              البيانات الإئتمانية
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="mb-2">جهة العمل (قطاع صاحب العمل)</Label>
                <Select value={formData.employerSector} onValueChange={(value) => handleInputChange('employerSector', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر جهة العمل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="خاص">خاص</SelectItem>
                    <SelectItem value="حكومي مدني">حكومي مدني</SelectItem>
                    <SelectItem value="حكومي عسكرى">حكومي عسكرى</SelectItem>
                    <SelectItem value="متقاعد">متقاعد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employer" className="mb-2">ادخل جهة العمل</Label>
                <Input
                  id="employer"
                  type="text"
                  value={formData.employer}
                  onChange={(e) => handleInputChange('employer', e.target.value)}
                  placeholder="ادخل جهة العمل"
                />
              </div>

              <div>
                <Label className="mb-2">جهة تحويل الراتب</Label>
                <Select value={formData.salaryTransferBank} onValueChange={(value) => handleInputChange('salaryTransferBank', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر جهة تحويل الراتب" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id.toString()}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="netSalary" className="mb-2">صافي الراتب</Label>
                <Input
                  id="netSalary"
                  type="number"
                  value={formData.netSalary}
                  onChange={(e) => handleInputChange('netSalary', e.target.value)}
                  placeholder="ادخل صافي الراتب"
                />
              </div>

              <div>
                <Label className="mb-2">هل لديك تمويل عقاري ؟</Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasRealEstateFinance"
                      value="no"
                      checked={formData.hasRealEstateFinance === "no"}
                      onChange={(e) => handleInputChange('hasRealEstateFinance', e.target.value)}
                      className="ml-2"
                    />
                    لا
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasRealEstateFinance"
                      value="yes"
                      checked={formData.hasRealEstateFinance === "yes"}
                      onChange={(e) => handleInputChange('hasRealEstateFinance', e.target.value)}
                      className="ml-2"
                    />
                    نعم
                  </label>
                </div>
              </div>

              <div>
                <Label className="mb-2">هل لديك تعثر في سمة؟</Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasCreditDefault"
                      value="no"
                      checked={formData.hasCreditDefault === "no"}
                      onChange={(e) => handleInputChange('hasCreditDefault', e.target.value)}
                      className="ml-2"
                    />
                    لا
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasCreditDefault"
                      value="yes"
                      checked={formData.hasCreditDefault === "yes"}
                      onChange={(e) => handleInputChange('hasCreditDefault', e.target.value)}
                      className="ml-2"
                    />
                    نعم
                  </label>
                </div>
              </div>



              <div>
                <Label htmlFor="totalMonthlyObligations" className="mb-2">إجمالي الإلتزامات الشهرية</Label>
                <Input
                  id="totalMonthlyObligations"
                  type="number"
                  value={formData.totalMonthlyObligations}
                  onChange={(e) => handleInputChange('totalMonthlyObligations', e.target.value)}
                  placeholder="ادخل إجمالي الإلتزامات الشهرية"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        const allOffers = generateIslamicOffers({ banks, formData, car });

        // Group offers by term
        const offersByTerm = {};
        allOffers.forEach(offer => {
          if (!offersByTerm[offer.termMonths]) offersByTerm[offer.termMonths] = [];
          offersByTerm[offer.termMonths].push(offer);
        });

        const allOffersFlat = allOffers;

        const lowestDownOffers = pickTopDistinctOffers(
          allOffersFlat,
          (a, b) => a.downPayment - b.downPayment,
          (o) => `${Math.round(o.downPayment)}-${o.termMonths}`
        );

        const lowestMonthlyOffers = pickTopDistinctOffers(
          allOffersFlat,
          (a, b) => a.monthlyPayment - b.monthlyPayment,
          (o) => `${Math.round(o.monthlyPayment)}-${o.termMonths}`
        );

        // أعلى دفعة أخيرة = إجمالي دفعة الشهر الأخير (قسط + ربح + أصل بالون + تأمين)
        const highestFinalOffers = pickTopDistinctOffers(
          allOffersFlat.filter((o) => o.lastMonthPayment > 0),
          (a, b) => b.lastMonthPayment - a.lastMonthPayment,
          (o) => `${Math.round(o.lastMonthPayment)}-${o.termMonths}-${Math.round(o.balloonPaymentPct)}`
        );

        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              العروض التمويلية
            </h3>

            {/* Category: Lowest Initial Payment */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-yellow-700">أقل دفعة اولى</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowestDownOffers.map((offer) => (
                  <div key={offer.id} className="border-2 rounded-lg p-4 border-yellow-700 bg-black">
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-yellow-800">
                        عرض {formatSaudiRiyalReact(offer.downPayment.toFixed(0))} دفعة اولى و قسط {formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-center">
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">قسط شهري</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">مدة القسط</p>
                        <p className="font-semibold">{Math.floor(offer.termMonths / 12)} سنة</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">الدفعة الاولى</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.downPayment.toFixed(0))}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-yellow-700 hover:bg-yellow-800 text-white text-sm"
                        onClick={() => selectOfferAndProceed(offer)}
                      >
                        اختر العرض
                      </Button>
                      {/* <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        onClick={() => addToComparison(offer)}
                      >
                        اضف للمقارنة
                      </Button> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category: Lowest Monthly Installment */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-yellow-700">أقل قسط شهري</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowestMonthlyOffers.map((offer) => (
                  <div key={offer.id} className="border-2 rounded-lg p-4 border-yellow-700 bg-black">
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-yellow-800">
                        عرض {formatSaudiRiyalReact(offer.downPayment.toFixed(0))} دفعة اولى و قسط {formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-center">
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">قسط شهري</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">مدة القسط</p>
                        <p className="font-semibold">{Math.floor(offer.termMonths / 12)} سنة</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">الدفعة الاولى</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.downPayment.toFixed(0))}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-yellow-700 hover:bg-yellow-800 text-white text-sm"
                        onClick={() => selectOfferAndProceed(offer)}
                      >
                        سجل طلبك
                      </Button>
                      {/* <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        onClick={() => addToComparison(offer)}
                      >
                        اضف للمقارنة
                      </Button> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category: Highest Final Payment */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-yellow-700">أعلى دفعة اخيرة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highestFinalOffers.map((offer) => (
                  <div key={offer.id} className="border-2 rounded-lg p-4 border-yellow-700 bg-black">
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-yellow-800">
                        عرض قسط {formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))} و دفعة اخيرة {formatSaudiRiyalReact(offer.lastMonthPayment.toFixed(0))}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-center">
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">قسط شهري</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">مدة القسط</p>
                        <p className="font-semibold">{Math.floor(offer.termMonths / 12)} سنة</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">الدفعة الاخيرة (شهر أخير)</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.lastMonthPayment.toFixed(0))}</p>
                      </div>
                      {offer.balloonPayment > 0 ? (
                        <div className="bg-black p-2 rounded">
                          <p className="text-xs text-white">مكون البالون</p>
                          <p className="font-semibold">{formatSaudiRiyalReact(offer.balloonPayment.toFixed(0))}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-yellow-700 hover:bg-yellow-800 text-white text-sm"
                        onClick={() => selectOfferAndProceed(offer)}
                      >
                        اختر العرض
                      </Button>
                      {/* <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        onClick={() => addToComparison(offer)}
                      >
                        اضف للمقارنة
                      </Button> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Offers for Comparison */}
            {selectedOffers.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-yellow-700">العروض المختارة للمقارنة</h4>
                <div className="grid grid-cols-1 gap-4">
                  {selectedOffers.map((offer) => (
                    <div key={offer.id} className="border-2 rounded-lg p-4 border-green-500 bg-white">
                      <div className="text-center mb-4">
                        <p className="text-lg font-bold text-green-800">
                          عرض {formatSaudiRiyalReact(offer.downPayment.toFixed(0))} دفعة اولى و قسط {formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}
                        </p>
                      </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-center">
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">قسط شهري</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.monthlyPayment.toFixed(0))}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">مدة القسط</p>
                        <p className="font-semibold">{Math.floor(offer.termMonths / 12)} سنة</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">الدفعة الاولى</p>
                        <p className="font-semibold">{formatSaudiRiyalReact(offer.downPayment.toFixed(0))}</p>
                      </div>
                    </div>

                      <Button
                    
                        className="w-full text-sm border-red-500 text-red-600 bg-red"
                        onClick={() => removeFromComparison(offer.id)}
                      >
                        إزالة من المقارنة
                      </Button>
                    </div>
                  ))}
                </div>

                {/* AI Analysis Button */}
                <div className="text-center">
                  <Button
                    onClick={analyzeOffers}
                    disabled={isAnalyzing || selectedOffers.length < 2}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    {isAnalyzing ? "جاري التحليل..." : "تحليل بالذكاء الاصطناعي"}
                  </Button>
                </div>

                {/* AI Analysis Results */}
                {comparisonAnalysis && (
                  <div className="bg-gradient-to-br from-yellow-50/80 via-yellow-100/80 to-yellow-200/80 border-2 border-yellow-200 rounded-xl p-6 shadow-lg backdrop-blur-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <h5 className="text-xl font-bold text-gray-800">نتائج التحليل بالذكاء الاصطناعي</h5>
                    </div>

                    <div className="space-y-6">
                      {/* User Profile Summary */}
                      <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <h6 className="text-lg font-semibold text-gray-800">ملف العميل</h6>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-600">صافي الراتب</span>
                            </div>
                            <p className="text-lg font-bold text-green-700">{formatSaudiRiyalReact(comparisonAnalysis.userProfile?.netSalary || 0)}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-gray-600">الإلتزامات الشهرية</span>
                            </div>
                            <p className="text-lg font-bold text-red-700">{formatSaudiRiyalReact(comparisonAnalysis.userProfile?.totalMonthlyObligations || 0)}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-600">الدخل المتاح</span>
                            </div>
                            <p className="text-lg font-bold text-blue-700">{formatSaudiRiyalReact(comparisonAnalysis.userProfile?.availableIncome || 0)}</p>
                          </div>

                        </div>
                      </div>

                      {/* Recommendations */}
                      {comparisonAnalysis.recommendations && comparisonAnalysis.recommendations.primary && comparisonAnalysis.recommendations.primary.length > 0 && (
                        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-100 p-2 rounded-lg">
                              <Target className="h-5 w-5 text-green-600" />
                            </div>
                            <h6 className="text-lg font-semibold text-gray-800">التوصيات</h6>
                          </div>
                          <div className="space-y-3">
                            {comparisonAnalysis.recommendations.primary.map((rec, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-800 leading-relaxed">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {comparisonAnalysis.recommendations?.warnings && comparisonAnalysis.recommendations.warnings.length > 0 && (
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 rounded-xl shadow-md border border-red-200 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-100 p-2 rounded-lg">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <h6 className="text-lg font-semibold text-red-800">تحذيرات مهمة</h6>
                          </div>
                          <div className="space-y-3">
                            {comparisonAnalysis.recommendations.warnings.map((warning, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-800 leading-relaxed font-medium">{warning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {comparisonAnalysis.recommendations?.suggestions && comparisonAnalysis.recommendations.suggestions.length > 0 && (
                        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Award className="h-5 w-5 text-blue-600" />
                            </div>
                            <h6 className="text-lg font-semibold text-gray-800">اقتراحات</h6>
                          </div>
                          <div className="space-y-3">
                            {comparisonAnalysis.recommendations.suggestions.map((suggestion, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <Star className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-800 leading-relaxed">{suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {comparisonAnalysis.summary && (
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl shadow-md border border-purple-200 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-purple-600" />
                            </div>
                            <h6 className="text-lg font-semibold text-gray-800">ملخص التحليل</h6>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <File className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-600">العروض المحللة</span>
                              </div>
                              <p className="text-2xl font-bold text-gray-800">{comparisonAnalysis.summary.totalOffersAnalyzed || 0}</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-600">العروض المناسبة</span>
                              </div>
                              {comparisonAnalysis.summary.affordableOffers && comparisonAnalysis.summary.affordableOffers.length > 0 ? (
                                <div className="space-y-2">
                                  {comparisonAnalysis.summary.affordableOffers.map((offer, index) => (
                                    <div key={index} className="text-sm text-green-700">
                                      <p className="font-semibold">عرض {formatSaudiRiyalReact(offer.downPayment?.toFixed(0) || 0)} دفعة أولى، {formatSaudiRiyalReact(offer.monthlyPayment?.toFixed(0) || 0)} قسط شهري</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-2xl font-bold text-green-700">{comparisonAnalysis.summary.affordableOffersCount || 0}</p>
                              )}
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-600">أقل قسط شهري</span>
                              </div>
                              <p className="text-xl font-bold text-blue-700">{formatSaudiRiyalReact(comparisonAnalysis.summary.lowestMonthlyPayment || 0)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Percent className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-gray-600">أقل تكلفة إجمالية</span>
                              </div>
                              <p className="text-xl font-bold text-purple-700">{formatSaudiRiyalReact(comparisonAnalysis.summary.lowestTotalCost || 0)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons for Financing Offers Step */}
            <div className="flex justify-start pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              معلومات إضافية
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="mb-2">الاسم كامل *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                  placeholder="أدخل الاسم كامل"
                />
              </div>

              <div>
                <Label htmlFor="email" className="mb-2">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">المدينة *</Label>
                  <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="الرياض">الرياض</SelectItem>
                      <SelectItem value="جدة">جدة</SelectItem>
                      <SelectItem value="مكة">مكة</SelectItem>
                      <SelectItem value="المدينة">المدينة</SelectItem>
                      <SelectItem value="الدمام">الدمام</SelectItem>
                      <SelectItem value="الخبر">الخبر</SelectItem>
                      <SelectItem value="الطائف">الطائف</SelectItem>
                      <SelectItem value="تبوك">تبوك</SelectItem>
                      <SelectItem value="أبها">أبها</SelectItem>
                      <SelectItem value="حائل">حائل</SelectItem>
                      <SelectItem value="الجوف">الجوف</SelectItem>
                      <SelectItem value="نجران">نجران</SelectItem>
                      <SelectItem value="جازان">جازان</SelectItem>
                      <SelectItem value="الباحة">الباحة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2">الوقت المفضل *</Label>
                  <Select value={formData.time} onValueChange={(value) => handleInputChange('time', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الوقت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8:00 AM">ص 8:00</SelectItem>
                      <SelectItem value="9:00 AM">ص 9:00</SelectItem>
                      <SelectItem value="10:00 AM">ص 10:00</SelectItem>
                      <SelectItem value="11:00 AM">ص 11:00</SelectItem>
                      <SelectItem value="12:00 PM">م 12:00</SelectItem>
                      <SelectItem value="1:00 PM">م 1:00</SelectItem>
                      <SelectItem value="2:00 PM">م 2:00</SelectItem>
                      <SelectItem value="3:00 PM">م 3:00</SelectItem>
                      <SelectItem value="4:00 PM">م 4:00</SelectItem>
                      <SelectItem value="5:00 PM">م 5:00</SelectItem>
                      <SelectItem value="6:00 PM">م 6:00</SelectItem>
                      <SelectItem value="7:00 PM">م 7:00</SelectItem>
                      <SelectItem value="8:00 PM">م 8:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">مراجعة البيانات</h3>

            <div className="space-y-4">
              <LoanRequestCarSummary car={car} variant="review" />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">معلومات الهوية</h4>
                <p>رقم الهوية: {formData.idNumber}</p>
                <p>صورة الهوية: {formData.idImage ? formData.idImage.name : "لم يتم تحميل الصورة"}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">البيانات الشخصية</h4>
                <p>رقم الجوال: +966 {formData.mobileNumber}</p>
                <p>شهر الميلاد: {formData.birthMonth === "1" ? "محرم" :
                  formData.birthMonth === "2" ? "صفر" :
                  formData.birthMonth === "3" ? "ربيع الأول" :
                  formData.birthMonth === "4" ? "ربيع الآخر" :
                  formData.birthMonth === "5" ? "جمادى الأولى" :
                  formData.birthMonth === "6" ? "جمادى الآخرة" :
                  formData.birthMonth === "7" ? "رجب" :
                  formData.birthMonth === "8" ? "شعبان" :
                  formData.birthMonth === "9" ? "رمضان" :
                  formData.birthMonth === "10" ? "شوال" :
                  formData.birthMonth === "11" ? "ذو القعدة" :
                  formData.birthMonth === "12" ? "ذو الحجة" : ""}</p>
                <p>سنة الميلاد: {formData.birthYear} هـ</p>
                <p>النوع: {formData.gender === "male" ? "ذكر" : formData.gender === "female" ? "أنثى" : ""}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">البيانات الإئتمانية</h4>
                <p>جهة العمل: {formData.employerSector}</p>
                <p>ادخل جهة العمل: {formData.employer}</p>
                <p>جهة تحويل الراتب: {banks.find(b => b.id.toString() === formData.salaryTransferBank)?.name || ''}</p>
                <p>صافي الراتب: {formData.netSalary ? formatSaudiRiyalReact(parseFloat(formData.netSalary)) : ''}</p>
                <p>هل لديك تمويل عقاري: {formData.hasRealEstateFinance === 'yes' ? 'نعم' : 'لا'}</p>
                <p>هل لديك تعثر في سمة: {formData.hasCreditDefault === 'yes' ? 'نعم' : 'لا'}</p>
                <p>إجمالي الإلتزامات الشهرية: {formData.totalMonthlyObligations ? formatSaudiRiyalReact(parseFloat(formData.totalMonthlyObligations)) : ''}</p>
              </div>

              {formData.additionalInfo && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">معلومات إضافية</h4>
                  <p>{formData.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto bg-black text-white">
        <CardHeader>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>التقدم</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index <= currentStep ? 'bg-yellow-700 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs mt-1 text-center ${
                    index <= currentStep ? 'text-yellow-700 font-medium' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={currentStep === steps.length - 1 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            {currentStep !== 4 && (
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>

                {currentStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    className="bg-yellow-700 hover:bg-yellow-800 text-white flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "جاري التسجيل..." : "سجل الطلب"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white flex items-center gap-2"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCloseModal}></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-lg">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">تم إرسال الطلب بنجاح!</h3>
                <p className="text-gray-600 mb-6">سيتم التواصل معك قريباً من قبل فريقنا.</p>
                <Link href="/">
                  <Button
                    onClick={handleCloseModal}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2"
                  >
                    موافق
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LoanRequestForm;
