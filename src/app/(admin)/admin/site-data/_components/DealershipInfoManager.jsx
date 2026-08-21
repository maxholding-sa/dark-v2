"use client";

import React, { useState, useEffect } from "react";
import { getDealershipInfo, updateDealershipInfo } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Phone, Mail, Building, Loader2, Save } from "lucide-react";

const DealershipInfoManager = ({ onRefresh }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getDealershipInfo();
      if (result.success && result.data) {
        setFormData({
          name: result.data.name || "",
          address: result.data.address || "",
          phone: result.data.phone || "",
          email: result.data.email || "",
        });
      }
    } catch (err) {
      console.error("Error loading dealership info:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await updateDealershipInfo(formData);
      if (result.success) {
        setMessage({ type: "success", text: "تم حفظ بيانات المعرض بنجاح" });
        if (onRefresh) onRefresh();
      } else {
        setMessage({ type: "error", text: result.error || "فشل حفظ البيانات" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {message && (
        <Alert className={message.type === "success" ? "bg-green-50" : "bg-red-50"}>
          <AlertDescription
            className={
              message.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-right flex items-center justify-end gap-2">
            بيانات موقع المعرض
            <Building className="h-5 w-5 text-gray-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dealership-name" className="flex items-center justify-end gap-2">
                  اسم المعرض
                  <Building className="h-4 w-4" />
                </Label>
                <Input
                  id="dealership-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Max Motors"
                  className="text-right"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealership-email" className="flex items-center justify-end gap-2">
                  البريد الإلكتروني للمعرض
                  <Mail className="h-4 w-4" />
                </Label>
                <Input
                  id="dealership-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="info@maxmotors.sa"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealership-phone" className="flex items-center justify-end gap-2">
                  هاتف المعرض
                  <Phone className="h-4 w-4" />
                </Label>
                <Input
                  id="dealership-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="920018915"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealership-address" className="flex items-center justify-end gap-2">
                  عنوان المعرض
                  <MapPin className="h-4 w-4" />
                </Label>
                <Input
                  id="dealership-address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="الرياض، المملكة العربية السعودية"
                  className="text-right"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving} className="flex gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    حفظ بيانات المعرض
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6">
        <h4 className="text-blue-800 font-bold mb-2 text-right">ملاحظة</h4>
        <p className="text-blue-700 text-sm text-right">
          هذه البيانات تُستخدم في قسم "موقع المعرض" وفي ترويسة الموقع لتقديم معلومات التواصل للعملاء.
        </p>
      </div>
    </div>
  );
};

export default DealershipInfoManager;
