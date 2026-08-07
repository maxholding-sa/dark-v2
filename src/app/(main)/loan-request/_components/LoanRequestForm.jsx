"use client";

import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatSaudiRiyalReact } from "@/lib/helper";
import {
  LOAN_CALCULATOR_META,
  registerAprDisclosureBanks,
} from "@/lib/loan-calculator";
import { EMPLOYER_SECTORS } from "@/constants/employer-sectors";
import {
  logFinancingOfferScenario,
} from "@/lib/financing-scenario-log";
import {
  generateIslamicOffers,
  compareOffersBestFirst,
  formatPercent,
  getEmployerSectorLabel,
  getCarPrice,
  getMaxDownPaymentSar,
  resolveDownPaymentSar,
} from "@/lib/generate-islamic-offers";
import { getStoreInfo } from "@/actions/site-management";
import { NO_CATEGORY_VALUE, NO_CATEGORY_LABEL } from "@/lib/car-text";
import { Currency, User, Mail, Phone, MessageSquare, Calendar, ChevronLeft, ChevronRight, Upload, CheckCircle, Car, File, Key, Lock, Banknote, TrendingUp, AlertTriangle, Shield, Target, Award, BarChart3, DollarSign, Percent, Clock, Star } from "lucide-react";

const MAX_DOWN_PAYMENT_PCT = LOAN_CALCULATOR_META.maxDownPaymentPct;
const CURRENT_HIJRI_YEAR = 1447;
const CURRENT_GREGORIAN_YEAR = 2026;

const cleanPhoneNumber = (value) => String(value || "").replace(/\D/g, "");

// Arabic keyboards produce Arabic-Indic (٠١٢) and Persian (۰۱۲) digits. They are
// digits to the customer but not to /^\d+$/, so a perfectly valid ID number was
// being rejected — fold them to ASCII before anything else looks at the value.
const toWesternDigits = (value) =>
  String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const digitsOnly = (value) => toWesternDigits(value).replace(/\D/g, "");

const isAdminContactPricingBlock = (reason) => {
  if (!reason) return false;
  if (reason.includes("جاري تحميل")) return false;
  if (reason.includes("أقصى دفعة")) return false;
  if (reason.includes("أعلى دفعة")) return false;
  if (reason.includes("أقل من سعر")) return false;
  return true;
};

const formatBalloonPolicy = (offer) =>
  offer.loanPolicy || (offer.balloonPayment > 0 ? "دفعة أخيرة حسب جهة التمويل" : "غير محدد");

const DEFAULT_DOWN_PAYMENT_PCT = 0.2;

const BANKS_FETCH_ATTEMPTS = 3;
const BANKS_RETRY_BASE_DELAY_MS = 700;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDefaultDownPaymentSar = (carPrice, pct = DEFAULT_DOWN_PAYMENT_PCT) => {
  if (!Number.isFinite(carPrice) || carPrice <= 0) return "";
  const maxAllowed = getMaxDownPaymentSar(carPrice);
  const defaultAmount = Math.max(1, Math.round(carPrice * pct));
  return String(Math.min(defaultAmount, maxAllowed));
};

const getDownPaymentInputValue = (formData) => {
  const raw = formData?.downPayment;
  if (raw === "" || raw == null) return "0";
  const entered = Number(raw);
  if (!Number.isFinite(entered) || entered < 0) return "0";
  return String(entered);
};

const formatOfferMoney = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    return formatSaudiRiyalReact(0);
  }
  if (value === 0) {
    return <span>0</span>;
  }
  return formatSaudiRiyalReact(value);
};

/** Whole-riyal display that never throws on a missing/invalid amount. */
const formatOfferMoneyRounded = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    return formatSaudiRiyalReact(0);
  }
  return formatSaudiRiyalReact(Math.round(value).toFixed(0));
};

const formatOfferYears = (termMonths) => {
  const months = Number(termMonths);
  if (!Number.isFinite(months) || months <= 0) return "غير محدد";
  return `${Math.floor(months / 12)} سنة`;
};

/** Keep loan amount in sync with car price; keep first payment as entered (including 0). */
const syncDownPaymentFormData = (car, prev) => {
  const carPrice = getCarPrice(car, prev);
  if (carPrice <= 0) {
    if (!prev.loanAmount) return prev;
    return { ...prev, loanAmount: "" };
  }

  const maxAllowed = getMaxDownPaymentSar(carPrice);
  const raw = prev.downPayment;
  const entered = Number(raw);
  const isMissing = raw === "" || raw == null || !Number.isFinite(entered) || entered < 0;

  let downPayment = "0";
  if (!isMissing) {
    downPayment = entered > maxAllowed ? String(maxAllowed) : String(entered);
  }

  if (downPayment === String(prev.downPayment ?? "0") && Number(prev.loanAmount) === carPrice) {
    return prev;
  }

  return {
    ...prev,
    loanAmount: String(carPrice),
    downPayment,
  };
};

const createInitialFormData = (car) => {
  const carPrice = getCarPrice(car, null);
  return {
    idNumber: "",
    idImage: null,
    carMake: car?.make || "",
    carModel: car?.model || "",
    carCategory: car?.category || "",
    carYear: car?.year != null ? String(car.year) : "",
    mobileNumber: "",
    birthDateType: "hijri",
    birthMonth: "",
    birthYear: "",
    gender: "",
    loanAmount: carPrice > 0 ? String(carPrice) : "",
    downPayment: "0",
    loanTerm: "5",
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
};

const renderFinancingOfferCard = (offer, { recommended = false, onSelect }) => (
  <div
    key={offer.id}
    className={`relative border-2 rounded-lg p-3 sm:p-4 ${
      recommended
        ? "border-green-500 ring-2 ring-green-500/30 bg-gradient-to-br from-green-950/50 to-black"
        : "border-gold-dark bg-black"
    }`}
  >
    {recommended ? (
      <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <Star className="h-3 w-3 fill-current" />
        موصى
      </span>
    ) : null}

    <div className="mb-4 space-y-3 text-right">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {offer.bankLogo ? (
            <img
              src={offer.bankLogo}
              alt={`شعار ${offer.bankName || "البنك"}`}
              className="h-7 w-7 rounded-md object-contain bg-white/10 p-1 sm:h-8 sm:w-8"
            />
          ) : null}
          <span className="inline-flex items-center rounded-full border border-gold-dark/70 bg-gold-dark/50 px-2 py-1 text-[10px] font-semibold text-gold-light sm:px-3 sm:text-xs">
            مقدم من {offer.bankName || "البنك"}
          </span>
        </div>
        <span className="text-[10px] text-white/60 sm:text-xs">
          {offer.categoryTitle ? `عرض ${offer.categoryTitle}` : "عرض تمويلي"}
        </span>
      </div>
      <p className={`text-sm font-bold sm:text-lg ${recommended ? "text-green-400" : "text-gold-dark"}`}>
        قسطك الشهري المتوقع يبدأ من {formatOfferMoneyRounded(offer.monthlyPayment)}
      </p>
      <p className="hidden text-xs leading-relaxed text-white/60 sm:block">
        يشمل التمويل والتأمين التقديري، والرقم قابل للتغيير حسب موافقة البنك وشركة التأمين.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-center">
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">البنك</p>
        <p className="font-semibold">{offer.bankName || "غير محدد"}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">قطاع العميل</p>
        <p className="font-semibold">{offer.employerSectorLabel || "غير محدد"}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">سياسة القرض</p>
        <p className="font-semibold">{formatBalloonPolicy(offer)}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">قسط شهري</p>
        <p className="font-semibold">{formatOfferMoneyRounded(offer.monthlyPayment)}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">مدة القسط</p>
        <p className="font-semibold">{formatOfferYears(offer.termMonths)}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">الدفعة الاولى</p>
        <p className="font-semibold">{formatOfferMoney(offer.downPayment)}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">نسبة الدفعة الأولى</p>
        <p className="font-semibold">{formatPercent(offer.downPaymentPct)}</p>
      </div>
      <div className="bg-black p-2 rounded">
        <p className="text-xs text-white">الدفعة الأخيرة</p>
        <p className="font-semibold">{formatOfferMoney(offer.balloonPayment || 0)}</p>
      </div>
    </div>

    <p className="mt-2 text-center text-[10px] leading-relaxed text-white/50 sm:text-xs">
      ملاحظة الشروط والأحكام:
      <br />
      هذه النسب والأقساط تقريبية وليست نهائية، وتخضع لشروط وأحكام جهة التمويل والموافقة النهائية.
    </p>
    <Button
      className={`mt-3 w-full text-xs text-white sm:text-sm ${
        recommended ? "bg-green-600 hover:bg-green-700" : "bg-gold-dark hover:bg-gold-dark"
      }`}
      onClick={() => onSelect(offer)}
    >
      {recommended ? "اختر العرض الموصى به" : "اختر العرض"}
    </Button>
  </div>
);

const LoanRequestForm = ({ car: initialCar = null }) => {
  const allowCarSelect = !initialCar;
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCar, setSelectedCar] = useState(initialCar);
  const [formData, setFormData] = useState(() => createInitialFormData(initialCar));
  const carPriceValue = useMemo(
    () => getCarPrice(selectedCar, formData),
    [selectedCar, formData.loanAmount]
  );

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [carLookupLoading, setCarLookupLoading] = useState(false);
  const [carLookupError, setCarLookupError] = useState("");

  useLayoutEffect(() => {
    setFormData((prev) => syncDownPaymentFormData(selectedCar, prev));
  }, [selectedCar, selectedCar?.id, selectedCar?.price, currentStep]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");
  const [banksReloadKey, setBanksReloadKey] = useState(0);
  const [storeContact, setStoreContact] = useState({ phone: null, whatsapp: null, email: null });
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [comparisonAnalysis, setComparisonAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const offerResult = useMemo(() => {
    try {
      return generateIslamicOffers({ banks, formData, car: selectedCar });
    } catch (error) {
      // Never let an offer-pricing failure blank the page; show it as a blocked
      // quote so the customer can still reach the contact fallbacks.
      console.error("Error generating financing offers:", error);
      return {
        offers: [],
        scenarioInputs: null,
        pricingBlocked: true,
        pricingBlockReason:
          "تعذر حساب العروض التمويلية لهذه السيارة. يرجى التواصل مع الإدارة لمساعدتك.",
      };
    }
  }, [banks, formData, selectedCar]);

  useEffect(() => {
    if (!allowCarSelect) return;

    const loadMakes = async () => {
      try {
        const response = await fetch("/api/car-makes");
        const data = await response.json();
        setMakes(data.makes || []);
      } catch (error) {
        console.error("Error fetching car makes:", error);
        setMakes([]);
      }
    };

    loadMakes();
  }, [allowCarSelect]);

  useEffect(() => {
    if (!allowCarSelect || !formData.carMake) {
      setModels([]);
      return;
    }

    const controller = new AbortController();
    const loadModels = async () => {
      setOptionsLoading(true);
      try {
        const response = await fetch(
          `/api/car-models?make=${encodeURIComponent(formData.carMake)}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        setModels(data.models || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching car models:", error);
          setModels([]);
        }
      } finally {
        setOptionsLoading(false);
      }
    };

    loadModels();
    return () => controller.abort();
  }, [allowCarSelect, formData.carMake]);

  useEffect(() => {
    if (!allowCarSelect || !formData.carMake || !formData.carModel) {
      setYears([]);
      setCategories([]);
      return;
    }

    const controller = new AbortController();
    const loadYearsAndCategories = async () => {
      setOptionsLoading(true);
      try {
        const params = new URLSearchParams({
          make: formData.carMake,
          model: formData.carModel,
        });
        if (formData.carYear) params.set("year", formData.carYear);

        const [yearsRes, categoriesRes] = await Promise.all([
          fetch(
            `/api/car-years?make=${encodeURIComponent(formData.carMake)}&model=${encodeURIComponent(formData.carModel)}`,
            { signal: controller.signal }
          ),
          fetch(`/api/car-categories?${params.toString()}`, { signal: controller.signal }),
        ]);

        const yearsData = await yearsRes.json();
        const categoriesData = await categoriesRes.json();
        setYears(yearsData.years || []);
        setCategories(categoriesData.categories || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching car years/categories:", error);
          setYears([]);
          setCategories([]);
        }
      } finally {
        setOptionsLoading(false);
      }
    };

    loadYearsAndCategories();
    return () => controller.abort();
  }, [allowCarSelect, formData.carMake, formData.carModel, formData.carYear]);

  useEffect(() => {
    if (!allowCarSelect) return;
    if (categories.length === 1 && formData.carCategory !== categories[0]) {
      setFormData((prev) => ({ ...prev, carCategory: categories[0] }));
    }
  }, [allowCarSelect, categories, formData.carCategory]);

  useEffect(() => {
    if (!allowCarSelect) return;
    if (!formData.carMake || !formData.carModel || !formData.carYear) {
      setSelectedCar(null);
      setCarLookupError("");
      return;
    }

    if (categories.length > 1 && !formData.carCategory) {
      setSelectedCar(null);
      setCarLookupError("يرجى اختيار فئة السيارة");
      return;
    }

    const controller = new AbortController();
    const resolveCar = async () => {
      setCarLookupLoading(true);
      setCarLookupError("");
      try {
        const params = new URLSearchParams({
          make: formData.carMake,
          model: formData.carModel,
          year: formData.carYear,
        });
        if (formData.carCategory) params.set("category", formData.carCategory);

        const response = await fetch(`/api/car-search?${params.toString()}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!result.success || !result.data) {
          setSelectedCar(null);
          setCarLookupError(result.message || "لم يتم العثور على سيارة بهذه المواصفات");
          return;
        }

        setSelectedCar(result.data);
        setFormData((prev) =>
          syncDownPaymentFormData(result.data, {
            ...prev,
            loanAmount: String(result.data.price ?? prev.loanAmount ?? ""),
            carCategory: prev.carCategory || result.data.category || "",
          })
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error searching car:", error);
          setSelectedCar(null);
          setCarLookupError("حدث خطأ أثناء البحث عن السيارة");
        }
      } finally {
        setCarLookupLoading(false);
      }
    };

    const timeoutId = setTimeout(resolveCar, 200);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    allowCarSelect,
    formData.carMake,
    formData.carModel,
    formData.carYear,
    formData.carCategory,
    categories.length,
  ]);

  const handleCarFieldChange = (field, value) => {
    setSelectedCar(null);
    setCarLookupError("");
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "carMake") {
        next.carModel = "";
        next.carYear = "";
        next.carCategory = "";
        next.loanAmount = "";
      } else if (field === "carModel") {
        next.carYear = "";
        next.carCategory = "";
        next.loanAmount = "";
      } else if (field === "carYear") {
        next.carCategory = "";
        next.loanAmount = "";
      }

      return next;
    });
  };

  const selectOfferAndProceed = (offer) => {
    const offerDownPayment = Number(offer?.downPayment);
    const offerTermMonths = Number(offer?.termMonths);
    setFormData(prev => ({
      ...prev,
      downPayment: Number.isFinite(offerDownPayment)
        ? String(offerDownPayment)
        : prev.downPayment,
      loanTerm: Number.isFinite(offerTermMonths) && offerTermMonths > 0
        ? String(Math.floor(offerTermMonths / 12))
        : prev.loanTerm,
      loanAmount: String(selectedCar?.price ?? prev.loanAmount),
    }));
    setSelectedOffer(offer);
    if (typeof window !== "undefined" && window.__lastFinancingScenario?.inputs) {
      logFinancingOfferScenario({
        inputs: window.__lastFinancingScenario.inputs,
        offers: window.__lastFinancingScenario.outputs.offers,
        displayed: window.__lastFinancingScenario.outputs.displayedOnScreen,
        selectedOffer: offer,
        label: "offer-selected",
      });
    }
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
            carPrice: selectedCar?.price,
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
    let cancelled = false;

    // Under load the pooler can drop a request; retry before giving up so the
    // offers step never sits on "جاري تحميل البنوك" forever.
    const fetchBanks = async () => {
      setBanksLoading(true);
      setBanksError("");

      for (let attempt = 1; attempt <= BANKS_FETCH_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch('/api/bank', { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const result = await response.json();
          const data = Array.isArray(result?.data) ? result.data : null;
          if (!result?.success || !data) throw new Error(result?.error || 'Malformed bank payload');

          if (cancelled) return;
          setBanks(data);
          registerAprDisclosureBanks(data);
          setBanksError("");
          setBanksLoading(false);
          return;
        } catch (error) {
          if (cancelled) return;
          console.error(`Error fetching banks (attempt ${attempt}/${BANKS_FETCH_ATTEMPTS}):`, error);
          if (attempt < BANKS_FETCH_ATTEMPTS) {
            await sleep(BANKS_RETRY_BASE_DELAY_MS * attempt);
          }
        }
      }

      if (cancelled) return;
      setBanks([]);
      setBanksError("تعذر تحميل بيانات البنوك حالياً. يرجى المحاولة مرة أخرى.");
      setBanksLoading(false);
    };

    fetchBanks();
    return () => {
      cancelled = true;
    };
  }, [banksReloadKey]);

  useEffect(() => {
    const fetchStoreContact = async () => {
      try {
        const result = await getStoreInfo();
        if (result.success && result.data) {
          setStoreContact({
            phone: result.data.phone || null,
            whatsapp: result.data.whatsapp || null,
            email: result.data.email || null,
          });
        }
      } catch (error) {
        console.error("Error fetching store contact:", error);
      }
    };
    fetchStoreContact();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDownPaymentChange = (rawValue) => {
    setFormData((prev) => {
      const carPrice = getCarPrice(selectedCar, prev);
      const maxAllowed = getMaxDownPaymentSar(carPrice);

      if (rawValue === "") {
        return { ...prev, downPayment: "0" };
      }

      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) {
        return { ...prev, downPayment: rawValue };
      }

      if (numeric < 0) {
        return { ...prev, downPayment: "0" };
      }

      if (maxAllowed > 0 && numeric > maxAllowed) {
        toast.error(
          `أقصى دفعة أولى مسموحة هي ${maxAllowed.toLocaleString("en-US")} ريال (${formatPercent(MAX_DOWN_PAYMENT_PCT * 100, 0)} من سعر السيارة)`
        );
        return { ...prev, downPayment: String(maxAllowed) };
      }

      return { ...prev, downPayment: rawValue };
    });
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
        if (!/^\d{10}$/.test(digitsOnly(formData.idNumber))) {
          toast.error("يرجى ملء جميع الحقول المطلوبة: رقم الهوية الوطنية السعودية (10 أرقام)");
          return false;
        }
        break;
      case 1:
        if (!formData.carMake || !formData.carModel || !formData.carYear) {
          toast.error("يرجى اختيار ماركة وموديل وسنة السيارة");
          return false;
        }
        if (allowCarSelect && categories.length > 1 && !formData.carCategory) {
          toast.error("يرجى اختيار فئة السيارة");
          return false;
        }
        if (!selectedCar?.id) {
          toast.error(carLookupError || "يرجى اختيار سيارة متوفرة من القائمة");
          return false;
        }
        break;
      case 2:
        if (!formData.mobileNumber || !formData.birthMonth || !formData.birthYear || !formData.gender) {
          toast.error("يرجى ملء جميع الحقول المطلوبة: رقم الجوال، تاريخ الميلاد، والنوع");
          return false;
        }
        break;
      case 3:
        if (!formData.employerSector) {
          toast.error("يرجى اختيار قطاع جهة العمل حتى تظهر أسعار الربح حسب القطاع");
          return false;
        }
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
    if (!validateCurrentStep() || currentStep >= steps.length - 1) return;

    if (currentStep === 3) {
      setFormData((prev) => syncDownPaymentFormData(selectedCar, prev));
    }

    setCurrentStep((step) => step + 1);
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
    if (!selectedCar?.id) {
      toast.error("يرجى اختيار السيارة أولاً");
      setCurrentStep(1);
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // The "no trim" option is a UI sentinel, never something to store.
          carCategory:
            formData.carCategory === NO_CATEGORY_VALUE
              ? selectedCar.category || ""
              : formData.carCategory,
          idNumber: digitsOnly(formData.idNumber),
          mobileNumber: "+966" + digitsOnly(formData.mobileNumber),
          selectedOffer,
          carId: selectedCar.id,
          carDetails: {
            year: selectedCar.year,
            make: selectedCar.make,
            model: selectedCar.model,
            price: selectedCar.price,
          },
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
    setSelectedCar(initialCar);
    setFormData(createInitialFormData(initialCar));
    setCarLookupError("");
    setCurrentStep(0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات الهوية (السعودية)</h3>

              <div>
                <Label htmlFor="idNumber" className="mb-2">رقم الهوية *</Label>
                <Input
                  id="idNumber"
                  type="text"
                  inputMode="numeric"
                  value={formData.idNumber}
                  onChange={(e) =>
                    handleInputChange('idNumber', digitsOnly(e.target.value).slice(0, 10))
                  }
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
              {allowCarSelect ? (
                <>
                  <div>
                    <Label htmlFor="carMake" className="mb-2">ماركة السيارة *</Label>
                    <Select
                      value={formData.carMake || undefined}
                      onValueChange={(value) => handleCarFieldChange("carMake", value)}
                    >
                      <SelectTrigger id="carMake" className="w-full">
                        <SelectValue placeholder="اختر الماركة" />
                      </SelectTrigger>
                      <SelectContent>
                        {makes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="carModel" className="mb-2">موديل السيارة *</Label>
                    <Select
                      value={formData.carModel || undefined}
                      onValueChange={(value) => handleCarFieldChange("carModel", value)}
                      disabled={!formData.carMake}
                    >
                      <SelectTrigger id="carModel" className="w-full">
                        <SelectValue placeholder={formData.carMake ? "اختر الموديل" : "اختر الماركة أولاً"} />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="carYear" className="mb-2">سنة صنع السيارة *</Label>
                    <Select
                      value={formData.carYear || undefined}
                      onValueChange={(value) => handleCarFieldChange("carYear", value)}
                      disabled={!formData.carModel}
                    >
                      <SelectTrigger id="carYear" className="w-full">
                        <SelectValue placeholder={formData.carModel ? "اختر السنة" : "اختر الموديل أولاً"} />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="carCategory" className="mb-2">
                      فئة السيارة{categories.length > 1 ? " *" : ""}
                    </Label>
                    <Select
                      value={formData.carCategory || undefined}
                      onValueChange={(value) => handleCarFieldChange("carCategory", value)}
                      disabled={!formData.carYear || categories.length === 0}
                    >
                      <SelectTrigger id="carCategory" className="w-full">
                        <SelectValue
                          placeholder={
                            !formData.carYear
                              ? "اختر السنة أولاً"
                              : categories.length === 0
                                ? "لا توجد فئات"
                                : "اختر الفئة"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category === NO_CATEGORY_VALUE ? NO_CATEGORY_LABEL : category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(optionsLoading || carLookupLoading) && (
                    <p className="text-sm text-white/70">جاري تحميل بيانات السيارة...</p>
                  )}
                  {carLookupError && !carLookupLoading && (
                    <p className="text-sm text-red-400">{carLookupError}</p>
                  )}
                  {selectedCar?.id && !carLookupLoading && (
                    <div className="rounded-lg border border-gold-dark/50 bg-gold-dark/30 p-3 text-sm text-white/90">
                      <p className="font-semibold text-gold mb-1">السيارة المختارة</p>
                      <p>
                        {selectedCar.year} {selectedCar.make} {selectedCar.model}
                        {selectedCar.category ? ` — ${selectedCar.category}` : ""}
                      </p>
                      {Number(selectedCar.price) > 0 && (
                        <p className="mt-1">السعر: {formatSaudiRiyalReact(selectedCar.price)}</p>
                      )}
                    </div>
                  )}

                  {/* Say it here, not four steps later on the offers screen: an
                      unpriced car can never produce a financing quote. */}
                  {selectedCar?.id && !carLookupLoading && !(Number(selectedCar.price) > 0) && (
                    <div className="rounded-lg border border-amber-600/60 bg-amber-950/40 p-3 text-sm text-amber-100 space-y-2">
                      <p className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        سعر هذه السيارة غير محدد حالياً
                      </p>
                      <p className="text-amber-100/90 leading-relaxed">
                        لا يمكن حساب العروض التمويلية بدون سعر. يمكنك متابعة الخطوات وسنطلب منك
                        التواصل مع الإدارة لتحديد السعر، أو التواصل معنا الآن مباشرة.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {storeContact.whatsapp && (
                          <Button
                            asChild
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <a
                              href={`https://wa.me/${cleanPhoneNumber(storeContact.whatsapp)}?text=${encodeURIComponent(
                                `السلام عليكم، أحتاج سعر: ${selectedCar.year} ${selectedCar.make} ${selectedCar.model}${selectedCar.category ? ` — ${selectedCar.category}` : ""}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-4 w-4 ml-2" />
                              واتساب
                            </a>
                          </Button>
                        )}
                        {storeContact.phone && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-amber-500/50 text-amber-100 hover:bg-amber-900/40"
                          >
                            <a href={`tel:${cleanPhoneNumber(storeContact.phone)}`}>
                              <Phone className="h-4 w-4 ml-2" />
                              اتصال
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
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
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-black pointer-events-none">
                    966+
                  </span>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    inputMode="numeric"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', digitsOnly(e.target.value))}
                    required
                    placeholder="5xxxxxxxx"
                    className="pl-12"
                    maxLength="9"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2">نوع تاريخ الميلاد *</Label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { handleInputChange('birthDateType', 'hijri'); handleInputChange('birthMonth', ''); handleInputChange('birthYear', ''); }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${formData.birthDateType === 'hijri' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-white/20 text-white/70 hover:border-white/40'}`}
                  >
                    هجري
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleInputChange('birthDateType', 'gregorian'); handleInputChange('birthMonth', ''); handleInputChange('birthYear', ''); }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${formData.birthDateType === 'gregorian' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-white/20 text-white/70 hover:border-white/40'}`}
                  >
                    ميلادي
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthMonth" className="mb-4">
                    {formData.birthDateType === 'gregorian' ? 'شهر الميلاد (ميلادي)' : 'شهر الميلاد (هجري)'} *
                  </Label>
                  <Select value={formData.birthMonth} onValueChange={(value) => handleInputChange('birthMonth', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر شهر الميلاد" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.birthDateType === 'gregorian' ? (
                        <>
                          <SelectItem value="1">يناير</SelectItem>
                          <SelectItem value="2">فبراير</SelectItem>
                          <SelectItem value="3">مارس</SelectItem>
                          <SelectItem value="4">أبريل</SelectItem>
                          <SelectItem value="5">مايو</SelectItem>
                          <SelectItem value="6">يونيو</SelectItem>
                          <SelectItem value="7">يوليو</SelectItem>
                          <SelectItem value="8">أغسطس</SelectItem>
                          <SelectItem value="9">سبتمبر</SelectItem>
                          <SelectItem value="10">أكتوبر</SelectItem>
                          <SelectItem value="11">نوفمبر</SelectItem>
                          <SelectItem value="12">ديسمبر</SelectItem>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="birthYear" className="mb-4">
                    {formData.birthDateType === 'gregorian' ? 'سنة الميلاد (ميلادي)' : 'سنة الميلاد (هجري)'} *
                  </Label>
                  <Select value={formData.birthYear} onValueChange={(value) => handleInputChange('birthYear', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سنة الميلاد" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.birthDateType === 'gregorian'
                        ? Array.from({ length: 100 }, (_, i) => {
                            const gregYear = CURRENT_GREGORIAN_YEAR - i;
                            return (
                              <SelectItem key={gregYear} value={gregYear.toString()}>
                                {gregYear} م
                              </SelectItem>
                            );
                          })
                        : Array.from({ length: 100 }, (_, i) => {
                            const hijriYear = CURRENT_HIJRI_YEAR - i;
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
                <Label className="mb-2">جهة العمل (قطاع صاحب العمل) *</Label>
                <Select value={formData.employerSector} onValueChange={(value) => handleInputChange('employerSector', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر جهة العمل" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYER_SECTORS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
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
                    {banks
                      .filter((bank) => bank?.id != null)
                      .map((bank) => (
                        <SelectItem key={bank.id} value={String(bank.id)}>
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
        if (banksLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-gold-dark border-t-transparent rounded-full animate-spin" />
              <p className="text-white/70 text-sm">جاري تحميل البنوك...</p>
            </div>
          );
        }

        if (banksError) {
          return (
            <div className="space-y-4 rounded-lg border border-amber-600/60 bg-amber-950/40 p-6 text-right">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
                <AlertTriangle className="h-5 w-5" />
                تعذر تحميل العروض
              </h3>
              <p className="text-sm leading-relaxed text-amber-100/90">
                {banksError} قد يكون الضغط على الموقع مرتفعاً في هذه اللحظة، بياناتك المدخلة محفوظة.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setBanksReloadKey((key) => key + 1)}
                  className="bg-gold-dark text-white hover:bg-gold-dark"
                >
                  إعادة المحاولة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
              </div>
            </div>
          );
        }

        const allOffers = offerResult.offers;
        const scenarioInputs = offerResult.scenarioInputs;
        const carPrice = carPriceValue || getCarPrice(selectedCar, formData);
        const maxDownPaymentSar = getMaxDownPaymentSar(carPrice);
        const defaultDownPaymentSar = Number(getDefaultDownPaymentSar(carPrice)) || 0;
        const downPaymentInputValue = getDownPaymentInputValue(formData);
        const enteredDownPayment = resolveDownPaymentSar(formData, carPrice) ?? 0;
        const enteredDownPaymentPct = carPrice > 0 ? (enteredDownPayment / carPrice) * 100 : 0;
        const remainingLoanAmount = Math.max(0, carPrice - enteredDownPayment);
        const downPaymentEditor = (
          <div className="rounded-xl border border-gold-dark/60 bg-gold-dark/30 p-4 space-y-4 text-right">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                اختر دفعتك الأولى
              </h3>
              <p className="text-sm text-white/60">
                اكتب الدفعة الأولى التي تناسبك، وتظهر عروض البنوك بناءً على نفس الدفعة.
              </p>
            </div>
            <div>
              <Label htmlFor="downPayment" className="mb-2">الدفعة الأولى *</Label>
              <Input
                id="downPayment"
                type="number"
                min="0"
                max={Math.max(0, maxDownPaymentSar)}
                value={downPaymentInputValue}
                onChange={(e) => handleDownPaymentChange(e.target.value)}
                onBlur={(e) => {
                  const carPriceOnBlur = getCarPrice(selectedCar, formData);
                  const maxAllowed = getMaxDownPaymentSar(carPriceOnBlur);
                  const entered = Number(e.target.value);
                  if (!Number.isFinite(entered) || entered < 0) {
                    handleDownPaymentChange("0");
                  } else if (maxAllowed > 0 && entered > maxAllowed) {
                    handleDownPaymentChange(String(maxAllowed));
                  }
                }}
                placeholder="0"
              />
              <p className="mt-2 text-xs text-white/60">
                الحد الأقصى: {formatSaudiRiyalReact(maxDownPaymentSar)} ({formatPercent(MAX_DOWN_PAYMENT_PCT * 100, 0)} من سعر السيارة)
                {defaultDownPaymentSar > 0 ? ` · مثال شائع: ${defaultDownPaymentSar.toLocaleString("en-US")} (20%)` : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black p-3">
                <p className="text-xs text-white/60">سعر السيارة</p>
                <p className="font-semibold">{formatSaudiRiyalReact(carPrice)}</p>
              </div>
              <div className="rounded-lg bg-black p-3">
                <p className="text-xs text-white/60">نسبة الدفعة</p>
                <p className="font-semibold">{formatPercent(enteredDownPaymentPct)}</p>
              </div>
              <div className="rounded-lg bg-black p-3">
                <p className="text-xs text-white/60">المبلغ الممول تقريباً</p>
                <p className="font-semibold">{formatSaudiRiyalReact(remainingLoanAmount)}</p>
              </div>
            </div>
            <div className="rounded-lg bg-black p-3 text-center">
              <p className="text-xs text-white/60">العروض تُحسب حسب القطاع المختار</p>
              <p className="font-semibold">{getEmployerSectorLabel(formData.employerSector)}</p>
            </div>
          </div>
        );

        if (offerResult.pricingBlocked) {
          const showAdminContact = isAdminContactPricingBlock(offerResult.pricingBlockReason);
          const carLabel = [
            selectedCar?.year || formData.carYear,
            selectedCar?.make || formData.carMake,
            selectedCar?.model || formData.carModel,
            selectedCar?.category ||
              (formData.carCategory === NO_CATEGORY_VALUE ? "" : formData.carCategory),
          ]
            .filter(Boolean)
            .join(" ");
          const carId = selectedCar?.id;
          const carUrl =
            carId && typeof window !== "undefined"
              ? `${window.location.origin}/cars/${carId}`
              : carId
                ? `/cars/${carId}`
                : null;
          const whatsappMessage = [
            "السلام عليكم، أحتاج مساعدة بخصوص طلب تمويل.",
            carLabel ? `السيارة: ${carLabel}` : null,
            "السبب: يرجى التواصل مع الادمن لتحديد السعر",
            carUrl ? `الرابط: ${carUrl}` : "الرابط:",
          ]
            .filter(Boolean)
            .join("\n");
          const whatsappHref = storeContact.whatsapp
            ? `https://wa.me/${cleanPhoneNumber(storeContact.whatsapp)}?text=${encodeURIComponent(whatsappMessage)}`
            : null;
          const phoneHref = storeContact.phone
            ? `tel:${cleanPhoneNumber(storeContact.phone)}`
            : null;

          return (
            <div className="space-y-6">
              {downPaymentEditor}
              <div className="space-y-4 rounded-lg border border-amber-600/60 bg-amber-950/40 p-6 text-right">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                  العروض التمويلية — مراجعة مطلوبة
                </h3>
                <p className="text-sm text-amber-100/90 leading-relaxed">
                  {offerResult.pricingBlockReason}
                </p>
                <p className="text-xs text-white/60">
                  ماركة السيارة: {selectedCar?.make || formData.carMake} · فئة التأمين المحفوظة: {selectedCar?.insuranceSegment || "غير محددة"}
                </p>
                {showAdminContact && (
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                    {whatsappHref && (
                      <Button
                        asChild
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="h-4 w-4 ml-2" />
                          تواصل مع الإدارة عبر واتساب
                        </a>
                      </Button>
                    )}
                    {phoneHref && (
                      <Button
                        asChild
                        variant="outline"
                        className="border-amber-500/50 text-amber-100 hover:bg-amber-900/40"
                      >
                        <a href={phoneHref}>
                          <Phone className="h-4 w-4 ml-2" />
                          اتصال بالإدارة
                        </a>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      className="border-amber-500/50 text-amber-100 hover:bg-amber-900/40"
                    >
                      <Link href="/contact">
                        <Mail className="h-4 w-4 ml-2" />
                        صفحة التواصل
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
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
        }

        const recommendedOffer = [...allOffers].sort(compareOffersBestFirst)[0] ?? null;

        const offersByBank = Array.from(
          allOffers.reduce((map, offer) => {
            const key = offer.bankId || offer.bankName || "unknown";
            if (!map.has(key)) {
              map.set(key, {
                id: key,
                title: offer.bankName || "بنك غير محدد",
                offers: [],
              });
            }
            map.get(key).offers.push(offer);
            return map;
          }, new Map()).values()
        ).map((section) => ({
          ...section,
          offers: section.offers.sort(compareOffersBestFirst),
        }));

        logFinancingOfferScenario({
          inputs: scenarioInputs,
          offers: allOffers,
          displayed: {
            recommendedOffer: recommendedOffer ? [recommendedOffer] : [],
            byBank: offersByBank.map((section) => ({
              bankId: section.id,
              title: section.title,
              offers: section.offers,
            })),
          },
          label: "offers-generated",
        });

        return (
          <div className="space-y-6">
            {downPaymentEditor}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                عروض البنوك المتاحة
              </h3>
              <p className="text-sm text-white/60">{allOffers.length} عرض متاح</p>
            </div>

            {recommendedOffer ? (
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-green-500">العرض الموصى به</h4>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {renderFinancingOfferCard(recommendedOffer, {
                    recommended: true,
                    onSelect: selectOfferAndProceed,
                  })}
                </div>
              </div>
            ) : null}

            {offersByBank.map((section) => (
              <div key={section.id} className="space-y-4">
                <h4 className="text-md font-semibold text-gold-dark">عروض {section.title}</h4>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {section.offers
                    .filter((offer) => offer.id !== recommendedOffer?.id)
                    .map((offer) =>
                    renderFinancingOfferCard(offer, {
                      recommended: false,
                      onSelect: selectOfferAndProceed,
                    })
                  )}
                </div>
              </div>
            ))}

            {/* Selected Offers for Comparison */}
            {selectedOffers.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gold-dark">العروض المختارة للمقارنة</h4>
                <div className="grid grid-cols-1 gap-4">
                  {selectedOffers.map((offer) => (
                    <div key={offer.id} className="border-2 rounded-lg p-4 border-green-500 bg-white">
                      <div className="text-center mb-4">
                        <p className="text-lg font-bold text-green-800">
                          عرض {formatOfferMoney(offer.downPayment)} دفعة اولى و قسط {formatOfferMoney(offer.monthlyPayment)}
                        </p>
                      </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-center">
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">قسط شهري</p>
                        <p className="font-semibold">{formatOfferMoney(offer.monthlyPayment)}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">مدة القسط</p>
                        <p className="font-semibold">{formatOfferYears(offer.termMonths)}</p>
                      </div>
                      <div className="bg-black p-2 rounded">
                        <p className="text-xs text-white">الدفعة الاولى</p>
                        <p className="font-semibold">{formatOfferMoney(offer.downPayment)}</p>
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
                  <div className="bg-gradient-to-br from-yellow-50/80 via-gold-light/80 to-gold-light/80 border-2 border-gold-light rounded-xl p-6 shadow-lg backdrop-blur-lg">
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
                                      <p className="font-semibold">عرض {formatOfferMoney(offer.downPayment)} دفعة أولى، {formatOfferMoney(offer.monthlyPayment)} قسط شهري</p>
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
                  name="email"
                  type="email"
                  autoComplete="email"
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
                <p>جهة تحويل الراتب: {banks.find(b => String(b?.id) === formData.salaryTransferBank)?.name || ''}</p>
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
      <Card className="w-full max-w-2xl mx-auto bg-black text-white" dir="rtl">
        <CardHeader>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>التقدم</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gold-dark h-2 rounded-full transition-all duration-300"
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
                    index <= currentStep ? 'bg-gold-dark text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs mt-1 text-center ${
                    index <= currentStep ? 'text-gold-dark font-medium' : 'text-gray-500'
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
                    className="bg-gold-dark hover:bg-gold-dark text-white flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "جاري التسجيل..." : "سجل الطلب"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={currentStep === 1 && (carLookupLoading || (allowCarSelect && !selectedCar?.id))}
                    className="bg-gold-dark hover:bg-gold-dark text-white flex items-center gap-2"
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
                    className="bg-gold-dark hover:bg-gold-dark text-white px-6 py-2"
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
