"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LoadingBar from "@/components/LoadingBar";
import {
  bankFinanceFormStateFromRecord,
  emptyBankFinanceFormState,
  emptySectorInterestRatesFormState,
  newBankFinanceFormState,
  sectorInterestRatesFormStateFromRecord,
} from "@/lib/bank-finance";
import { EMPLOYER_SECTORS } from "@/constants/employer-sectors";
import BrandSegmentMapEditor from "./_components/BrandSegmentMapEditor";

const baseFormState = () => ({
  id: null,
  name: "",
  logoImage: "",
  sectorInterestRates: emptySectorInterestRatesFormState(),
  defaultBalloonPaymentPct: "",
  loanPolicy: "",
  ...newBankFinanceFormState(),
});

const bankHasCustomJson = (bank) =>
  Boolean(bank?.ftpAnchors || bank?.brandSegmentMap || bank?.insuranceTable);

const BankCRUDPage = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [activeJsonTab, setActiveJsonTab] = useState("ftpAnchors");

  const [formState, setFormState] = useState(baseFormState());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState(null);
  const [brandEditorKey, setBrandEditorKey] = useState("new");

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bank");
      const json = await res.json();
      if (json.success) {
        setBanks(json.data);
      } else {
        toast.error(json.error || "Failed to fetch banks");
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch banks");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const moveUp = (index) => {
    if (index === 0) return;
    const newBanks = [...banks];
    const temp = newBanks[index];
    newBanks[index] = newBanks[index - 1];
    newBanks[index - 1] = temp;
    setBanks(newBanks);
  };

  const moveDown = (index) => {
    if (index === banks.length - 1) return;
    const newBanks = [...banks];
    const temp = newBanks[index];
    newBanks[index] = newBanks[index + 1];
    newBanks[index + 1] = temp;
    setBanks(newBanks);
  };

  const saveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const orderData = banks.map((bank, index) => ({ id: bank.id, order: index }));
      const res = await fetch("/api/bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم حفظ الترتيب بنجاح!");
        fetchBanks();
      } else {
        toast.error(json.error || "فشل حفظ الترتيب");
      }
    } catch (error) {
      toast.error(error.message || "فشل حفظ الترتيب");
    }
    setIsSavingOrder(false);
  };

  const handleInputChange = (e) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandSegmentMapChange = (brandSegmentMap) => {
    setFormState((prev) => ({ ...prev, brandSegmentMap }));
  };

  const openNewDialog = () => {
    setFormState(baseFormState());
    setImageFile(null);
    setImagePreview("");
    setIsEditMode(false);
    setShowAdvancedJson(false);
    setActiveJsonTab("ftpAnchors");
    setBrandEditorKey(`new-${Date.now()}`);
    setDialogOpen(true);
  };

  const openEditDialog = (bank) => {
    setFormState({
      id: bank.id,
      name: bank.name,
      logoImage: bank.logoImage,
      sectorInterestRates: sectorInterestRatesFormStateFromRecord(bank),
      defaultBalloonPaymentPct:
        bank.defaultBalloonPaymentPct != null ? String(bank.defaultBalloonPaymentPct) : "",
      loanPolicy: bank.loanPolicy || "",
      ...bankFinanceFormStateFromRecord(bank),
    });
    setImageFile(null);
    setImagePreview(bank.logoImage);
    setIsEditMode(true);
    setShowAdvancedJson(bankHasCustomJson(bank));
    setActiveJsonTab("ftpAnchors");
    setBrandEditorKey(bank.id);
    setDialogOpen(true);
  };

  const toggleAdvancedJson = () => {
    setShowAdvancedJson((prev) => {
      const next = !prev;
      if (next && !formState.ftpAnchors && !formState.insuranceTable) {
        const defaults = emptyBankFinanceFormState();
        setFormState((current) => ({
          ...current,
          ftpAnchors: defaults.ftpAnchors,
          insuranceTable: defaults.insuranceTable,
        }));
      }
      if (next) {
        setActiveJsonTab("ftpAnchors");
      }
      return next;
    });
  };

  const jsonTabs = [
    { id: "ftpAnchors", label: "مراسي FTP" },
    { id: "insuranceTable", label: "جدول التأمين" },
  ];

  const confirmDelete = async () => {
    if (!bankToDelete) return;

    try {
      const res = await fetch("/api/bank", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: bankToDelete.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم حذف البنك بنجاح!");
        fetchBanks();
      } else {
        toast.error(json.error || "فشل حذف البنك");
      }
    } catch (error) {
      toast.error(error.message || "فشل حذف البنك");
    }
    setDeleteDialogOpen(false);
    setBankToDelete(null);
  };

  const handleSectorRateChange = (sector, value) => {
    setFormState((prev) => ({
      ...prev,
      sectorInterestRates: {
        ...prev.sectorInterestRates,
        [sector]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id, name, loanPolicy, sectorInterestRates, defaultBalloonPaymentPct } = formState;

    const missingSector = EMPLOYER_SECTORS.find(
      ({ value }) => sectorInterestRates[value] === "" || sectorInterestRates[value] == null
    );
    if (!name || missingSector) {
      toast.error(
        missingSector
          ? `الرجاء إدخال سعر الفائدة لـ ${missingSector.label}`
          : "الرجاء ملء كافة الحقول المطلوبة"
      );
      return;
    }

    if (!imageFile && !imagePreview) {
      toast.error("الرجاء إضافة شعار البنك");
      return;
    }

    let logoImageUrl = formState.logoImage;

    if (imageFile) {
      logoImageUrl = imagePreview;
    }

    const method = isEditMode ? "PUT" : "POST";
    const payload = {
      ...(isEditMode ? { id } : {}),
      name,
      logoImage: logoImageUrl,
      sectorInterestRates,
      defaultBalloonPaymentPct: defaultBalloonPaymentPct || null,
      loanPolicy,
      adminFeesCap: formState.adminFeesCap,
      defaultAdminFeesPct: formState.defaultAdminFeesPct,
      minInsurancePremium: formState.minInsurancePremium,
      assetDepreciationRate: formState.assetDepreciationRate,
      cor: formState.cor,
      opex: formState.opex,
      irrTarget: formState.irrTarget,
      ftpAnchors: formState.ftpAnchors,
      brandSegmentMap: formState.brandSegmentMap,
      insuranceTable: formState.insuranceTable,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bank", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          isEditMode ? "تم تحديث البنك بنجاح!" : "تم إضافة البنك بنجاح!"
        );
        setDialogOpen(false);
        fetchBanks();
      } else {
        toast.error(json.error || "فشل الحفظ");
      }
    } catch (error) {
      toast.error(error.message || "فشل الحفظ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة البنوك</h1>
        <div className="flex gap-3">
          <Button 
            onClick={saveOrder} 
            size="lg" 
            variant="outline"
            disabled={isSavingOrder || banks.length === 0}
          >
            {isSavingOrder ? <LoadingBar fullScreen={false} /> : <><Save className="ml-2 w-4 h-4" /> حفظ الترتيب</>}
          </Button>
          <Button onClick={openNewDialog} size="lg">
            + إضافة بنك جديد
          </Button>
        </div>
      </div>

      <div className="bg-black rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-center">الشعار</TableHead>
              <TableHead className="font-semibold text-center">الاسم</TableHead>
              <TableHead className="font-semibold text-center">سعر الفائدة (حسب القطاع)</TableHead>
              <TableHead className="font-semibold text-center">الدفعة الآخيرة</TableHead>
              <TableHead className="font-semibold text-center">سياسة القرض</TableHead>
              <TableHead className="font-semibold text-center">الترتيب</TableHead>
              <TableHead className="font-semibold text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <LoadingBar fullScreen={false} />
                </TableCell>
              </TableRow>
            ) : banks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  لا توجد بنوك للعرض
                </TableCell>
              </TableRow>
            ) : (
              banks.map((bank, index) => (
                <TableRow key={bank.id} className="hover:bg-black-50">
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <img
                        src={bank.logoImage}
                        alt={bank.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{bank.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {bank.sectorInterestRates && typeof bank.sectorInterestRates === "object" ? (
                        EMPLOYER_SECTORS.map(({ value, label }) =>
                          bank.sectorInterestRates[value] != null ? (
                            <span
                              key={value}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              title={label}
                            >
                              {label.split(" ").pop()}: {Number(bank.sectorInterestRates[value]).toFixed(2)}%
                            </span>
                          ) : null
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {typeof bank.interestRate === "number"
                            ? bank.interestRate.toFixed(2)
                            : parseFloat(bank.interestRate).toFixed(2)}
                          %
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {bank.defaultBalloonPaymentPct != null ? (
                      <span className="text-sm font-medium">{Number(bank.defaultBalloonPaymentPct).toFixed(0)}%</span>
                    ) : (
                      <span className="text-sm text-gray-500">افتراضي</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {bank.loanPolicy
                      ? bank.loanPolicy.length > 50
                        ? bank.loanPolicy.substring(0, 50) + "..."
                        : bank.loanPolicy
                      : "غير محدد"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveUp(index)}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === banks.length - 1}
                        onClick={() => moveDown(index)}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(bank)}
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setBankToDelete(bank); setDeleteDialogOpen(true); }}
                      >
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!top-[4vh] !flex !max-h-[92vh] !translate-y-0 w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden bg-black p-0 text-white sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-white/10 px-5 py-4 text-right sm:px-6">
            <DialogTitle className="text-xl">
              {isEditMode ? "تعديل البنك" : "إضافة بنك جديد"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {isEditMode
                ? "عدّل بيانات البنك وإعدادات محرك التمويل ثم احفظ التغييرات."
                : "أدخل البيانات الأساسية. جداول JSON اختيارية — تُستخدم الإعدادات الافتراضية إذا تُركت فارغة."}
            </DialogDescription>
          </DialogHeader>

          <div
            className="overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
            style={{ maxHeight: "calc(92vh - 10.5rem)" }}
          >
            <form id="bank-form" onSubmit={handleSubmit} className="px-5 py-4 sm:px-6 sm:py-5" dir="rtl">
              <div className="space-y-6">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">البيانات الأساسية</h3>
                    <p className="text-xs text-white/50">الاسم، الشعار، سعر الفائدة حسب القطاع، والدفعة الآخيرة</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        اسم البنك <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleInputChange}
                        placeholder="أدخل اسم البنك"
                        className="mt-1.5"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="logoImage" className="text-sm font-medium">
                        شعار البنك <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="logoImage"
                        name="logoImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mt-1.5"
                      />
                      {imagePreview ? (
                        <div className="mt-3 flex justify-start">
                          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 sm:h-28 sm:w-28">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 rounded-md border border-dashed border-white/10 px-3 py-2 text-xs text-white/50">
                          لم يتم اختيار شعار بعد
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          سعر الفائدة حسب القطاع (%) <span className="text-red-500">*</span>
                        </p>
                        <p className="text-xs text-white/50">
                          يُستخدم عند طلب التمويل حسب قطاع صاحب العمل الذي يختاره العميل
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {EMPLOYER_SECTORS.map(({ value, label }) => (
                          <div key={value}>
                            <Label htmlFor={`sectorRate-${value}`} className="text-sm font-medium">
                              {label}
                            </Label>
                            <Input
                              id={`sectorRate-${value}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formState.sectorInterestRates[value] ?? ""}
                              onChange={(e) => handleSectorRateChange(value, e.target.value)}
                              placeholder="مثال: 5.50"
                              className="mt-1.5"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="defaultBalloonPaymentPct" className="text-sm font-medium">
                        الدفعة الآخيرة (%)
                      </Label>
                      <Input
                        id="defaultBalloonPaymentPct"
                        name="defaultBalloonPaymentPct"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formState.defaultBalloonPaymentPct}
                        onChange={handleInputChange}
                        placeholder="مثال: 20 (اتركه فارغاً للخيارات الافتراضية)"
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-white/50">
                        نسبة الدفعة الأخيرة من سعر السيارة — تُستخدم في حساب العروض التمويلية
                      </p>
                    </div>

                    <div className="hidden sm:block" aria-hidden="true" />

                    <div className="sm:col-span-2">
                      <Label htmlFor="loanPolicy" className="text-sm font-medium">
                        سياسة القرض
                      </Label>
                      <Textarea
                        id="loanPolicy"
                        name="loanPolicy"
                        value={formState.loanPolicy}
                        onChange={handleInputChange}
                        placeholder="أدخل سياسة القرض"
                        className="mt-1.5 field-sizing-fixed min-h-20 resize-y"
                        rows={3}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
                  <div>
                    <h3 className="text-base font-semibold text-white">إعدادات محرك التمويل</h3>
                    <p className="text-xs text-white/50">
                      الرسوم، التأمين، ومعاملات التسعير. القيم الافتراضية تُستخدم عند ترك الحقل فارغاً.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="mb-3 text-sm font-medium text-white/80">الرسوم والتأمين</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="adminFeesCap">حد الرسوم الإدارية (ريال)</Label>
                          <Input
                            id="adminFeesCap"
                            name="adminFeesCap"
                            type="number"
                            min="0"
                            value={formState.adminFeesCap}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="defaultAdminFeesPct">نسبة الرسوم الإدارية (%)</Label>
                          <Input
                            id="defaultAdminFeesPct"
                            name="defaultAdminFeesPct"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formState.defaultAdminFeesPct}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="minInsurancePremium">الحد الأدنى للتأمين السنوي (ريال)</Label>
                          <Input
                            id="minInsurancePremium"
                            name="minInsurancePremium"
                            type="number"
                            min="0"
                            value={formState.minInsurancePremium}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="assetDepreciationRate">إهلاك الأصل السنوي (0.15 = 15%)</Label>
                          <Input
                            id="assetDepreciationRate"
                            name="assetDepreciationRate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={formState.assetDepreciationRate}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-white/80">معاملات التسعير الداخلية</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <Label htmlFor="cor">تكلفة المخاطر (COR)</Label>
                          <Input
                            id="cor"
                            name="cor"
                            type="number"
                            step="0.0001"
                            value={formState.cor}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="opex">المصاريف التشغيلية (OPEX)</Label>
                          <Input
                            id="opex"
                            name="opex"
                            type="number"
                            step="0.0001"
                            value={formState.opex}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="irrTarget">هدف العائد (IRR Target)</Label>
                          <Input
                            id="irrTarget"
                            name="irrTarget"
                            type="number"
                            step="0.0001"
                            value={formState.irrTarget}
                            onChange={handleInputChange}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-3 sm:p-4">
                      <BrandSegmentMapEditor
                        key={brandEditorKey}
                        initialValue={formState.brandSegmentMap}
                        onChange={handleBrandSegmentMapChange}
                      />
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-3 sm:p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0 text-right">
                          <p className="text-sm font-medium text-white">جداول JSON المتقدمة</p>
                          <p className="text-xs leading-relaxed text-white/50">
                            {showAdvancedJson
                              ? "اختر الجدول من التبويبات أدناه وعدّله داخل منطقة التمرير."
                              : "اختياري — اضغط «عرض» لتخصيص الجداول أو اتركها فارغة للافتراضي."}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleAdvancedJson}
                          className="w-full shrink-0 sm:w-auto"
                        >
                          {showAdvancedJson ? (
                            <>
                              <ChevronUp className="ml-1 h-4 w-4" />
                              إخفاء
                            </>
                          ) : (
                            <>
                              <ChevronDown className="ml-1 h-4 w-4" />
                              عرض
                            </>
                          )}
                        </Button>
                      </div>

                      {showAdvancedJson ? (
                        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                          <div className="flex flex-wrap gap-2">
                            {jsonTabs.map((tab) => (
                              <Button
                                key={tab.id}
                                type="button"
                                size="sm"
                                variant={activeJsonTab === tab.id ? "default" : "outline"}
                                onClick={() => setActiveJsonTab(tab.id)}
                                className="text-xs sm:text-sm"
                              >
                                {tab.label}
                              </Button>
                            ))}
                          </div>

                          <div className="rounded-md border border-white/10 bg-zinc-950/80 p-3">
                            {activeJsonTab === "ftpAnchors" ? (
                              <div>
                                <Label htmlFor="ftpAnchors">مراسي FTP (مصفوفة JSON)</Label>
                                <Textarea
                                  id="ftpAnchors"
                                  name="ftpAnchors"
                                  value={formState.ftpAnchors}
                                  onChange={handleInputChange}
                                  dir="ltr"
                                  spellCheck={false}
                                  className="mt-2 h-48 max-h-48 field-sizing-fixed overflow-y-auto resize-none bg-zinc-900 font-mono text-xs leading-5"
                                />
                              </div>
                            ) : null}

                            {activeJsonTab === "insuranceTable" ? (
                              <div>
                                <Label htmlFor="insuranceTable">جدول أسعار التأمين (JSON)</Label>
                                <Textarea
                                  id="insuranceTable"
                                  name="insuranceTable"
                                  value={formState.insuranceTable}
                                  onChange={handleInputChange}
                                  dir="ltr"
                                  spellCheck={false}
                                  className="mt-2 h-48 max-h-48 field-sizing-fixed overflow-y-auto resize-none bg-zinc-900 font-mono text-xs leading-5"
                                />
                              </div>
                            ) : null}

                            <p className="mt-2 text-xs text-white/45">
                              استخدم التمرير داخل المربع لعرض JSON الكامل دون توسيع النافذة.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-white/10 bg-black px-5 py-3 sm:px-6 sm:py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" form="bank-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : isEditMode ? (
                "تحديث البنك"
              ) : (
                "إضافة البنك"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-black text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-500">تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف البنك "{bankToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setDeleteDialogOpen(false); setBankToDelete(null); }}
            >
              إلغاء
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              نعم، أحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankCRUDPage;