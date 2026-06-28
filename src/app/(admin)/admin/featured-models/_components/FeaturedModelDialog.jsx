"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import LoadingBar from "@/components/LoadingBar";
import {
  createFeaturedModel,
  updateFeaturedModel,
  getCarBodyTypes,
} from "@/actions/featured-models";

const FeaturedModelDialog = ({ open, onClose, model, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    image: "",
    order: 0,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [carModels, setCarModels] = useState([]);

  // Get car body types
  const {
    loading: modelsLoading,
    fn: getModelsFn,
    data: modelsData,
    error: modelsError,
  } = useFetch(getCarBodyTypes);

  // Create model
  const {
    loading: createLoading,
    fn: createFn,
    data: createData,
    error: createError,
  } = useFetch(createFeaturedModel);

  // Update model
  const {
    loading: updateLoading,
    fn: updateFn,
    data: updateData,
    error: updateError,
  } = useFetch(updateFeaturedModel);

  // Fetch car body types when dialog opens
  useEffect(() => {
    if (open) {
      getModelsFn();
    }
  }, [open]);

  // Update car models list when data is loaded
  useEffect(() => {
    if (modelsData?.success && modelsData?.data) {
      setCarModels(modelsData.data);
    }
  }, [modelsData]);

  // Initialize form with model data if editing
  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || "",
        nameAr: model.nameAr || "",
        image: model.image || "",
        order: model.order || 0,
      });
      setImagePreview(model.image || "");
    } else {
      // Reset form for new model
      setFormData({
        name: "",
        nameAr: "",
        image: "",
        order: 0,
      });
      setImagePreview("");
    }
    setImageFile(null);
  }, [model, open]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("يرجى اختيار ملف صورة صالح");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData({ ...formData, image: "" });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "order" ? parseInt(value) || 0 : value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.nameAr.trim()) {
      toast.error("يرجى إدخال اسم نوع الهيكل بالعربية");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("يرجى اختيار نوع الهيكل");
      return;
    }

    if (!formData.image) {
      toast.error("يرجى اختيار صورة لنوع الهيكل");
      return;
    }

    // Submit
    if (model) {
      // Update existing model
      await updateFn(model.id, formData);
    } else {
      // Create new model
      await createFn(formData);
    }
  };

  // Handle success
  useEffect(() => {
    if (createData?.success) {
      toast.success("تم إضافة نوع الهيكل بنجاح");
      onSuccess?.();
    }
    if (updateData?.success) {
      toast.success("تم تحديث نوع الهيكل بنجاح");
      onSuccess?.();
    }
  }, [createData, updateData]);

  // Handle errors
  useEffect(() => {
    if (createError) {
      toast.error("فشل في إضافة نوع الهيكل");
    }
    if (updateError) {
      toast.error("فشل في تحديث نوع الهيكل");
    }
  }, [createError, updateError]);

  const isLoading = createLoading || updateLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-black text-white sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {model ? "تعديل نوع الهيكل" : "إضافة نوع هيكل جديد"}
          </DialogTitle>
          <DialogDescription>
            {model
              ? "قم بتعديل بيانات نوع الهيكل"
              : "أضف نوع هيكل جديد للقسم المميز"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Model Name - Select from existing car models */}
          <div className="space-y-2">
            <Label htmlFor="name">نوع الهيكل *</Label>
            <Select
              value={formData.name}
              onValueChange={(value) => setFormData({ ...formData, name: value })}
              disabled={isLoading || modelsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الهيكل" />
              </SelectTrigger>
              <SelectContent>
                {modelsLoading ? (
                  <SelectItem value="loading" disabled>
                    <LoadingBar fullScreen={false} size="sm" />
                  </SelectItem>
                ) : carModels.length > 0 ? (
                  carModels.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-models" disabled>
                    لا توجد أنواع هيكل
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              اختر من أنواع الهيكل الموجودة في قاعدة البيانات
            </p>
          </div>

          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="nameAr">الاسم بالعربية *</Label>
            <Input
              id="nameAr"
              name="nameAr"
              value={formData.nameAr}
              onChange={handleInputChange}
              placeholder="مثال: سيدان"
              required
              disabled={isLoading}
            />
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="order">ترتيب العرض</Label>
            <Input
              id="order"
              name="order"
              type="number"
              value={formData.order}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              يحدد ترتيب ظهور نوع الهيكل (الأصغر يظهر أولاً)
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image">صورة نوع الهيكل *</Label>
            {imagePreview ? (
              <div className="relative w-full h-40 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-contain p-2"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">اضغط لرفع الصورة</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP (حتى 5MB)
                    </p>
                  </div>
                  <input
                    id="image"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isLoading}
                  />
                </label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingBar fullScreen={false} size="sm" className="ml-2" />
                  جاري الحفظ...
                </>
              ) : model ? (
                "تحديث"
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedModelDialog;
