"use client";

import React, { useEffect, useState } from "react";
import {
  updateAboutPage,
  createAboutFeature,
  updateAboutFeature,
  deleteAboutFeature,
} from "@/actions/site-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, Plus, Trash2, Upload, X } from "lucide-react";

const ICON_OPTIONS = ["Target", "Users", "Award", "Heart", "Sparkles", "Shield", "Star", "Zap"];

const rtlInputClass = "text-right";
const rtlFieldClass = "space-y-2 text-right";

function ImageField({ label, urlName, altName, formData, onChange, onUpload }) {
  return (
    <div className={`${rtlFieldClass} p-4 border rounded-lg bg-gray-50`} dir="rtl">
      <Label className="block text-right">{label}</Label>
      <div className="flex flex-row-reverse gap-2">
        <Input
          name={urlName}
          value={formData[urlName] || ""}
          onChange={onChange}
          placeholder="/about-saudi-vision.jpg أو رابط كامل"
          className={`flex-1 ${rtlInputClass}`}
          dir="rtl"
        />
        <label className="cursor-pointer shrink-0">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e, urlName)}
          />
          <Button type="button" variant="outline" size="sm" asChild>
            <span className="flex items-center gap-1">
              <Upload size={16} />
              رفع
            </span>
          </Button>
        </label>
      </div>
      <Input
        name={altName}
        value={formData[altName] || ""}
        onChange={onChange}
        placeholder="النص البديل للصورة"
        className={rtlInputClass}
        dir="rtl"
      />
      {formData[urlName] && (
        <img
          src={formData[urlName]}
          alt={formData[altName] || label}
          className="max-h-40 rounded-lg object-cover border ms-auto"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

const emptyPage = {
  title: "من نحن",
  introText: "",
  visionTitle: "رؤيتنا",
  visionParagraph1: "",
  visionParagraph2: "",
  visionImage: "",
  visionImageAlt: "",
  missionTitle: "رسالتنا",
  missionParagraph1: "",
  missionParagraph2: "",
  missionImage: "",
  missionImageAlt: "",
  whyUsTitle: "لماذا يختار العملاء ماكس موتورز؟",
  ctaTitle: "",
  ctaText: "",
  isPublished: true,
  metaDescription: "",
  metaKeywords: "",
};

const emptyFeature = {
  title: "",
  description: "",
  icon: "Target",
  order: 0,
  isActive: true,
};

function FormField({ label, htmlFor, children }) {
  return (
    <div className={rtlFieldClass} dir="rtl">
      <Label htmlFor={htmlFor} className="block text-right">
        {label}
      </Label>
      {children}
    </div>
  );
}

const AboutPageEditor = ({ data, onRefresh }) => {
  const [pageData, setPageData] = useState(emptyPage);
  const [features, setFeatures] = useState([]);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState(null);
  const [featureForm, setFeatureForm] = useState(emptyFeature);
  const [pageLoading, setPageLoading] = useState(false);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (data) {
      setPageData({
        title: data.title || emptyPage.title,
        introText: data.introText || "",
        visionTitle: data.visionTitle || emptyPage.visionTitle,
        visionParagraph1: data.visionParagraph1 || "",
        visionParagraph2: data.visionParagraph2 || "",
        visionImage: data.visionImage || "",
        visionImageAlt: data.visionImageAlt || "",
        missionTitle: data.missionTitle || emptyPage.missionTitle,
        missionParagraph1: data.missionParagraph1 || "",
        missionParagraph2: data.missionParagraph2 || "",
        missionImage: data.missionImage || "",
        missionImageAlt: data.missionImageAlt || "",
        whyUsTitle: data.whyUsTitle || emptyPage.whyUsTitle,
        ctaTitle: data.ctaTitle || "",
        ctaText: data.ctaText || "",
        isPublished: data.isPublished ?? true,
        metaDescription: data.metaDescription || "",
        metaKeywords: data.metaKeywords || "",
      });
      setFeatures(data.features || []);
    }
  }, [data]);

  const handlePageChange = (e) => {
    const { name, value } = e.target;
    setPageData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "يرجى اختيار ملف صورة" });
      return;
    }

    setUploadingField(fieldName);
    setMessage(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "about-images");

      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();

      if (result.success) {
        setPageData((prev) => ({ ...prev, [fieldName]: result.url }));
        setMessage({ type: "success", text: "تم رفع الصورة بنجاح" });
      } else {
        setMessage({ type: "error", text: result.error || "فشل رفع الصورة" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const handlePageSubmit = async (e) => {
    e.preventDefault();
    setPageLoading(true);
    setMessage(null);

    try {
      const result = await updateAboutPage(pageData);
      if (result.success) {
        setMessage({ type: "success", text: "تم حفظ محتوى الصفحة بنجاح" });
        onRefresh?.();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPageLoading(false);
    }
  };

  const openFeatureForm = (feature = null) => {
    if (feature) {
      setFeatureForm({
        title: feature.title,
        description: feature.description,
        icon: feature.icon || "Target",
        order: feature.order ?? 0,
        isActive: feature.isActive ?? true,
      });
      setEditingFeatureId(feature.id);
    } else {
      setFeatureForm({
        ...emptyFeature,
        order: features.length + 1,
      });
      setEditingFeatureId(null);
    }
    setShowFeatureForm(true);
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    setFeatureLoading(true);
    setMessage(null);

    try {
      const result = editingFeatureId
        ? await updateAboutFeature(editingFeatureId, featureForm)
        : await createAboutFeature(featureForm);

      if (result.success) {
        setMessage({ type: "success", text: editingFeatureId ? "تم تحديث الميزة" : "تمت إضافة الميزة" });
        setShowFeatureForm(false);
        setEditingFeatureId(null);
        setFeatureForm(emptyFeature);
        onRefresh?.();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleFeatureDelete = async (id) => {
    if (!confirm("هل تريد حذف هذه الميزة؟")) return;

    setFeatureLoading(true);
    const result = await deleteAboutFeature(id);
    if (result.success) {
      setMessage({ type: "success", text: "تم حذف الميزة" });
      onRefresh?.();
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setFeatureLoading(false);
  };

  return (
    <div dir="rtl" className="space-y-4">
      {message && (
        <Alert className={message.type === "success" ? "bg-green-50" : "bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="intro" dir="rtl" className="space-y-4">
        <TabsList className="inline-flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="intro">من نحن</TabsTrigger>
          <TabsTrigger value="vision">رؤيتنا</TabsTrigger>
          <TabsTrigger value="mission">رسالتنا</TabsTrigger>
          <TabsTrigger value="features">المميزات</TabsTrigger>
          <TabsTrigger value="cta">دعوة للإجراء</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <form onSubmit={handlePageSubmit} dir="rtl" className="text-right">
          <TabsContent value="intro" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="text-right w-full">من نحن</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="عنوان القسم (يظهر في القائمة العلوية)" htmlFor="title">
                  <Input id="title" name="title" value={pageData.title} onChange={handlePageChange} className={rtlInputClass} dir="rtl" required />
                </FormField>
                <FormField label="النص التعريفي" htmlFor="introText">
                  <Textarea id="introText" name="introText" value={pageData.introText} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={5} required />
                </FormField>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vision" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="text-right w-full">رؤيتنا</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="عنوان القسم" htmlFor="visionTitle">
                  <Input id="visionTitle" name="visionTitle" value={pageData.visionTitle} onChange={handlePageChange} className={rtlInputClass} dir="rtl" required />
                </FormField>
                <FormField label="الفقرة الأولى" htmlFor="visionParagraph1">
                  <Textarea id="visionParagraph1" name="visionParagraph1" value={pageData.visionParagraph1} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={3} required />
                </FormField>
                <FormField label="الفقرة الثانية" htmlFor="visionParagraph2">
                  <Textarea id="visionParagraph2" name="visionParagraph2" value={pageData.visionParagraph2} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={3} required />
                </FormField>
                <ImageField label="صورة الرؤية" urlName="visionImage" altName="visionImageAlt" formData={pageData} onChange={handlePageChange} onUpload={handleImageUpload} />
                {uploadingField === "visionImage" && <p className="text-sm text-gray-500 text-right">جاري رفع الصورة...</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mission" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="text-right w-full">رسالتنا</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="عنوان القسم" htmlFor="missionTitle">
                  <Input id="missionTitle" name="missionTitle" value={pageData.missionTitle} onChange={handlePageChange} className={rtlInputClass} dir="rtl" required />
                </FormField>
                <FormField label="الفقرة الأولى" htmlFor="missionParagraph1">
                  <Textarea id="missionParagraph1" name="missionParagraph1" value={pageData.missionParagraph1} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={3} required />
                </FormField>
                <FormField label="الفقرة الثانية" htmlFor="missionParagraph2">
                  <Textarea id="missionParagraph2" name="missionParagraph2" value={pageData.missionParagraph2} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={3} required />
                </FormField>
                <ImageField label="صورة الرسالة" urlName="missionImage" altName="missionImageAlt" formData={pageData} onChange={handlePageChange} onUpload={handleImageUpload} />
                {uploadingField === "missionImage" && <p className="text-sm text-gray-500 text-right">جاري رفع الصورة...</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader className="flex items-center justify-between gap-4">
                <CardTitle className="text-right flex-1">لماذا يختار العملاء ماكس موتورز؟</CardTitle>
                <Button type="button" size="sm" onClick={() => openFeatureForm()} className="gap-1 shrink-0">
                  <Plus size={16} />
                  إضافة ميزة
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="عنوان القسم" htmlFor="whyUsTitle">
                  <Input id="whyUsTitle" name="whyUsTitle" value={pageData.whyUsTitle} onChange={handlePageChange} className={rtlInputClass} dir="rtl" required />
                </FormField>

                {showFeatureForm && (
                  <Card className="border-blue-200 bg-blue-50/50" dir="rtl">
                    <CardHeader className="flex items-center justify-between gap-4 pb-2">
                      <CardTitle className="text-base text-right flex-1">{editingFeatureId ? "تعديل الميزة" : "ميزة جديدة"}</CardTitle>
                      <button type="button" onClick={() => setShowFeatureForm(false)} className="shrink-0">
                        <X size={18} />
                      </button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <FormField label="العنوان">
                          <Input value={featureForm.title} onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })} className={rtlInputClass} dir="rtl" required />
                        </FormField>
                        <FormField label="الوصف">
                          <Textarea value={featureForm.description} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} className={rtlInputClass} dir="rtl" rows={3} required />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="الأيقونة">
                            <Select value={featureForm.icon} onValueChange={(value) => setFeatureForm({ ...featureForm, icon: value })}>
                              <SelectTrigger className={`${rtlInputClass} w-full`} dir="rtl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {ICON_OPTIONS.map((icon) => (
                                  <SelectItem key={icon} value={icon} className="text-right">
                                    {icon}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                          <FormField label="الترتيب">
                            <Input type="number" value={featureForm.order} onChange={(e) => setFeatureForm({ ...featureForm, order: parseInt(e.target.value, 10) || 0 })} className={rtlInputClass} dir="rtl" />
                          </FormField>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Label>مفعّلة</Label>
                          <Checkbox checked={featureForm.isActive} onCheckedChange={(checked) => setFeatureForm({ ...featureForm, isActive: checked })} />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" onClick={handleFeatureSubmit} disabled={featureLoading}>
                            {featureLoading ? "جاري الحفظ..." : editingFeatureId ? "تحديث" : "إضافة"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {features.map((feature) => (
                    <Card key={feature.id} className={!feature.isActive ? "opacity-50" : ""} dir="rtl">
                      <CardContent className="pt-4 space-y-2 text-right">
                        <div>
                          <p className="font-semibold">{feature.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2">{feature.description}</p>
                          <p className="text-xs text-gray-400 mt-1">أيقونة: {feature.icon} | ترتيب: {feature.order}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openFeatureForm(feature)} className="flex-1">
                            <Edit2 size={14} />
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleFeatureDelete(feature.id)} className="flex-1">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {features.length === 0 && !showFeatureForm && (
                  <p className="text-center text-gray-500 py-4">لا توجد مميزات بعد</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cta" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="text-right w-full">دعوة للإجراء</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="العنوان" htmlFor="ctaTitle">
                  <Input id="ctaTitle" name="ctaTitle" value={pageData.ctaTitle} onChange={handlePageChange} className={rtlInputClass} dir="rtl" required />
                </FormField>
                <FormField label="النص" htmlFor="ctaText">
                  <Textarea id="ctaText" name="ctaText" value={pageData.ctaText} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={3} required />
                </FormField>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 mt-4">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="text-right w-full">SEO والنشر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="وصف الصفحة (Meta Description)" htmlFor="metaDescription">
                  <Textarea id="metaDescription" name="metaDescription" value={pageData.metaDescription} onChange={handlePageChange} className={rtlInputClass} dir="rtl" rows={2} />
                </FormField>
                <FormField label="الكلمات المفتاحية" htmlFor="metaKeywords">
                  <Input id="metaKeywords" name="metaKeywords" value={pageData.metaKeywords} onChange={handlePageChange} className={rtlInputClass} dir="rtl" />
                </FormField>
                <div className="flex items-center justify-end gap-2 p-3 bg-blue-50 rounded">
                  <Label htmlFor="isPublished" className="cursor-pointer">
                    نشر الصفحة (عرض للزوار)
                  </Label>
                  <Checkbox id="isPublished" checked={pageData.isPublished} onCheckedChange={(checked) => setPageData((prev) => ({ ...prev, isPublished: checked }))} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-start pt-4">
            <Button type="submit" disabled={pageLoading}>
              {pageLoading ? "جاري الحفظ..." : "حفظ محتوى الصفحة"}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
};

export default AboutPageEditor;
