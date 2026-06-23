"use client";

import React, { useState } from "react";
import { updateStoreInfo } from "@/actions/site-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const StoreInfoForm = ({ storeInfo, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: storeInfo?.name || "",
    description: storeInfo?.description || "",
    address: storeInfo?.address || "",
    city: storeInfo?.city || "",
    country: storeInfo?.country || "",
    phone: storeInfo?.phone || "",
    whatsapp: storeInfo?.whatsapp || "",
    email: storeInfo?.email || "",
    latitude: storeInfo?.latitude || "",
    longitude: storeInfo?.longitude || "",
    whatsappEnabled: storeInfo?.whatsappEnabled !== undefined ? storeInfo.whatsappEnabled : true,
    whatsappLabel: storeInfo?.whatsappLabel || "",
    whatsappText: storeInfo?.whatsappText || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const result = await updateStoreInfo(formData);

      if (result.success) {
        setSuccess(true);
        onSubmit();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">تم الحفظ بنجاح</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">اسم المتجر</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">رقم واتس آب</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="address">العنوان</Label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="city">المدينة</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="country">الدولة</Label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">الوصف</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="وصف المتجر"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-100 rounded">
        <div>
          <Label htmlFor="latitude">خط العرض (GPS)</Label>
          <Input
            id="latitude"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            placeholder="24.7136"
          />
        </div>

        <div>
          <Label htmlFor="longitude">خط الطول (GPS)</Label>
          <Input
            id="longitude"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            placeholder="46.6753"
          />
        </div>
      </div>

      {/* WhatsApp Floating Button Settings */}
      <div className="p-4 border border-green-200 bg-green-50 rounded space-y-4">
        <h3 className="font-semibold text-green-800 text-sm">⚙️ إعدادات زر واتساب العائم</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="whatsappEnabled" className="text-sm font-medium">
            إظهار زر واتساب العائم
          </Label>
          <Switch
            id="whatsappEnabled"
            checked={formData.whatsappEnabled}
            onCheckedChange={(val) => handleToggle("whatsappEnabled", val)}
          />
        </div>

        <div>
          <Label htmlFor="whatsappLabel">نص التسمية فوق الزر</Label>
          <Input
            id="whatsappLabel"
            name="whatsappLabel"
            value={formData.whatsappLabel}
            onChange={handleChange}
            placeholder="تواصل معنا"
            disabled={!formData.whatsappEnabled}
          />
          <p className="text-xs text-gray-500 mt-1">يظهر فوق زر واتساب. اتركه فارغاً للنص الافتراضي.</p>
        </div>

        <div>
          <Label htmlFor="whatsappText">رسالة مسبقة الملء عند الضغط على الزر</Label>
          <Textarea
            id="whatsappText"
            name="whatsappText"
            value={formData.whatsappText}
            onChange={handleChange}
            placeholder="مرحباً، أود الاستفسار عن..."
            rows={3}
            disabled={!formData.whatsappEnabled}
          />
          <p className="text-xs text-gray-500 mt-1">تظهر هذه الرسالة مكتوبة مسبقاً عند فتح المحادثة.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </form>
  );
};

export default StoreInfoForm;
