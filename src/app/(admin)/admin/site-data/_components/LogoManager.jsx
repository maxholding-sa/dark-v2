"use client";

import React, { useState } from "react";
import { createLogo, updateLogo, deleteLogo } from "@/actions/site-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit2, Plus, X, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { logger } from "@/lib/logger";

const LogoManager = ({ data, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [formData, setFormData] = useState({
    imageUrl: "",
    altText: "Company Logo",
    type: "main",
    isActive: true,
  });

  const logoTypes = ["main", "favicon", "navbar", "footer"];

  const handleEdit = (item) => {
    setFormData({
      imageUrl: item.imageUrl,
      altText: item.altText,
      type: item.type,
      isActive: item.isActive,
    });
    setFileName(item.altText);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({
        type: "error",
        text: "الرجاء اختيار ملف صورة صحيح",
      });
      return;
    }

    // Validate file size (max 10MB for logos)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({
        type: "error",
        text: `حجم الصورة كبير جداً (${(file.size / 1024 / 1024).toFixed(2)}MB). الحد الأقصى 10MB`,
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      logger.debug("[LogoManager] Uploading logo", { fileName: file.name });
      
      // Use the new API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      logger.debug("[LogoManager] Upload result", { success: result.success });

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: result.url,
        }));
        setFileName(file.name);
        setMessage({
          type: "success",
          text: "✓ تم رفع الشعار بنجاح",
        });
      } else {
        const errorMsg = result.error || "خطأ غير معروف";
        console.error("[LogoManager] Upload failed:", errorMsg);
        setMessage({
          type: "error",
          text: `خطأ: ${errorMsg}`,
        });
      }
    } catch (error) {
      console.error("[LogoManager] Exception during upload:", error);
      setMessage({
        type: "error",
        text: `خطأ: ${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let result;
      if (editingId) {
        result = await updateLogo(editingId, formData);
      } else {
        result = await createLogo(formData);
      }

      if (result.success) {
        setMessage({ type: "success", text: "تم الحفظ بنجاح" });
        setShowForm(false);
        setEditingId(null);
        setFileName("");
        setFormData({
          imageUrl: "",
          altText: "Company Logo",
          type: "main",
          isActive: true,
        });
        onRefresh();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل تريد حذف هذا الشعار؟")) return;

    setLoading(true);
    const result = await deleteLogo(id);
    if (result.success) {
      setMessage({ type: "success", text: "تم الحذف بنجاح" });
      onRefresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setLoading(false);
  };

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

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>{editingId ? "تعديل الشعار" : "إضافة شعار جديد"}</CardTitle>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              <X size={20} />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label className="block text-right mb-2">صورة الشعار</Label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-right">
                    {uploading ? "جاري الرفع..." : "اختر صورة"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {formData.imageUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          imageUrl: "",
                        }));
                        setFileName("");
                      }}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 flex-1">{fileName}</span>
                  </div>
                  <div className="relative w-full h-32 bg-gray-100 rounded border">
                    <Image
                      src={formData.imageUrl}
                      alt={formData.altText}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الشعار</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {logoTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>النص البديل</Label>
                  <Input
                    value={formData.altText}
                    onChange={(e) =>
                      setFormData({ ...formData, altText: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label>مفعل</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => setShowForm(!showForm)}
        className="gap-2 float-right"
      >
        <Plus size={18} />
        إضافة شعار
      </Button>

      <div className="clear-both grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item) => (
          <Card key={item.id} className={!item.isActive ? "opacity-50" : "border-2 border-blue-500"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-right">{item.type}</CardTitle>
              <p className="text-xs text-gray-500 text-right">{item.altText}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative w-full h-24 bg-gray-100 rounded border">
                <Image
                  src={item.imageUrl}
                  alt={item.altText}
                  fill
                  className="object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(item)}
                  className="flex-1"
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(item.id)}
                  className="flex-1"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="text-xs text-center">
                {item.isActive ? "✓ مفعل" : "✗ معطل"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">لا توجد شعارات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LogoManager;
