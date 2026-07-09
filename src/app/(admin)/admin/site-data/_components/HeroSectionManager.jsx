"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { updateHeroSection } from "@/actions/site-management";
import LoadingBar from "@/components/LoadingBar";
import { logger } from "@/lib/logger";

export default function HeroSectionManager({ initialData }) {
  const [formData, setFormData] = useState(
    initialData || {
      videoUrl: "",
      title: "مرحباً بك",
      subtitle: "",
      posterImage: "",
      isActive: true,
      autoplay: true,
      loop: true,
      muted: true,
    }
  );

  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [message, setMessage] = useState(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [posterFileName, setPosterFileName] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setMessage({
        type: "error",
        text: "الرجاء اختيار ملف فيديو صحيح",
      });
      return;
    }

    // Validate file size (max 150MB)
    const maxSize = 150 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      setMessage({
        type: "error",
        text: `حجم الفيديو كبير جداً (${sizeMB}MB). الحد الأقصى 150MB`,
      });
      return;
    }

    setUploadingVideo(true);
    setMessage(null);

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    try {
      logger.debug("[HeroSection] Uploading video", {
        fileName: file.name,
        sizeMb: fileSizeMB,
      });
      
      // Use the new API route for large file uploads
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'hero-videos');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      logger.debug("[HeroSection] Upload result", { success: result.success });

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          videoUrl: result.url,
        }));
        setVideoFileName(file.name);
        setMessage({
          type: "success",
          text: `✓ تم رفع الفيديو بنجاح (${fileSizeMB}MB)`,
        });
      } else {
        const errorMsg = result.error || "خطأ غير معروف";
        console.error("[HeroSection] Upload failed:", errorMsg);
        setMessage({
          type: "error",
          text: `خطأ: ${errorMsg}`,
        });
      }
    } catch (error) {
      console.error("[HeroSection] Exception during upload:", error);
      setMessage({
        type: "error",
        text: `خطأ: ${error.message}`,
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePosterUpload = async (e) => {
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

    // Validate file size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({
        type: "error",
        text: "حجم الصورة كبير جداً. الحد الأقصى 10MB",
      });
      return;
    }

    setUploadingPoster(true);
    setMessage(null);

    try {
      logger.debug("[HeroSectionManager] Starting poster upload", { fileName: file.name });
      
      // Use the new API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'hero-posters');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          posterImage: result.url,
        }));
        setPosterFileName(file.name);
        setMessage({
          type: "success",
          text: "تم رفع صورة الغلاف بنجاح ✓",
        });
      } else {
        setMessage({
          type: "error",
          text: `خطأ في الرفع: ${result.error}`,
        });
      }
    } catch (error) {
      console.error("[HeroSectionManager] Poster upload error:", error);
      setMessage({
        type: "error",
        text: "خطأ في الرفع: " + error.message,
      });
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleClearVideo = () => {
    setFormData((prev) => ({
      ...prev,
      videoUrl: "",
    }));
    setVideoFileName("");
  };

  const handleClearPoster = () => {
    setFormData((prev) => ({
      ...prev,
      posterImage: "",
    }));
    setPosterFileName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await updateHeroSection(formData);

      if (result.success) {
        setMessage({
          type: "success",
          text: "تم تحديث قسم البطل بنجاح",
        });
        if (result.data) {
          setFormData(result.data);
        }
      } else {
        setMessage({
          type: "error",
          text: result.error || "حدث خطأ أثناء التحديث",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "حدث خطأ غير متوقع",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">إدارة قسم البطل (الفيديو)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <Alert
                variant={message.type === "success" ? "default" : "destructive"}
                className={
                  message.type === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription
                  className={
                    message.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Video Upload */}
            <div className="space-y-2">
              <Label className="block text-right">فيديو البطل</Label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-right">
                    {uploadingVideo ? "جاري الرفع..." : "اختر فيديو"}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                    className="hidden"
                  />
                </label>
              </div>
              {formData.videoUrl && (
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearVideo}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 text-right flex-1">
                    {videoFileName || "فيديو تم رفعه"}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 text-right">
                الصيغ المدعومة: MP4, WebM, Ogg وغيرها
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="block text-right">
                العنوان
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="مرحباً بك"
                className="text-right"
                dir="rtl"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle" className="block text-right">
                العنوان الفرعي
              </Label>
              <Input
                id="subtitle"
                name="subtitle"
                value={formData.subtitle || ""}
                onChange={handleChange}
                placeholder="نص إضافي (اختياري)"
                className="text-right"
                dir="rtl"
              />
            </div>

            {/* Poster Image Upload */}
            <div className="space-y-2">
              <Label className="block text-right">صورة الغلاف (الصورة المصغرة)</Label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm text-right">
                    {uploadingPoster ? "جاري الرفع..." : "اختر صورة"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterUpload}
                    disabled={uploadingPoster}
                    className="hidden"
                  />
                </label>
              </div>
              {formData.posterImage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearPoster}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 text-right flex-1">
                      {posterFileName || "صورة تم رفعها"}
                    </span>
                  </div>
                  <div className="w-full h-40 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={formData.posterImage}
                      alt="Poster preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 text-right">
                الصيغ المدعومة: JPG, PNG, WebP وغيرها
              </p>
            </div>

            {/* Video Settings */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-right">إعدادات الفيديو</h3>

              <div className="space-y-3">
                {/* Autoplay */}
                <div className="flex items-center justify-end gap-3">
                  <Label
                    htmlFor="autoplay"
                    className="text-sm cursor-pointer flex-1"
                  >
                    تشغيل تلقائي
                  </Label>
                  <Checkbox
                    id="autoplay"
                    name="autoplay"
                    checked={formData.autoplay}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        autoplay: checked,
                      }))
                    }
                  />
                </div>

                {/* Loop */}
                <div className="flex items-center justify-end gap-3">
                  <Label
                    htmlFor="loop"
                    className="text-sm cursor-pointer flex-1"
                  >
                    إعادة التشغيل
                  </Label>
                  <Checkbox
                    id="loop"
                    name="loop"
                    checked={formData.loop}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        loop: checked,
                      }))
                    }
                  />
                </div>

                {/* Muted */}
                <div className="flex items-center justify-end gap-3">
                  <Label
                    htmlFor="muted"
                    className="text-sm cursor-pointer flex-1"
                  >
                    بدون صوت
                  </Label>
                  <Checkbox
                    id="muted"
                    name="muted"
                    checked={formData.muted}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        muted: checked,
                      }))
                    }
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-end gap-3">
                  <Label
                    htmlFor="isActive"
                    className="text-sm cursor-pointer flex-1"
                  >
                    نشط
                  </Label>
                  <Checkbox
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <LoadingBar fullScreen={false} size="sm" className="ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Video Preview */}
      {formData.videoUrl && formData.isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-right">معاينة الفيديو</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full bg-black rounded-lg overflow-hidden">
              <video
                src={formData.videoUrl}
                poster={formData.posterImage}
                autoPlay={formData.autoplay}
                loop={formData.loop}
                muted={formData.muted}
                controls
                className="w-full h-auto max-h-96"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
