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
import useFetch from "../../../../../../hooks/use-fetch";
import LoadingBar from "@/components/LoadingBar";
import {
  createFeaturedBrand,
  updateFeaturedBrand,
  getCarMakes,
} from "@/actions/featured-brands";

const FeaturedBrandDialog = ({ open, onClose, brand, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    image: "",
    order: 0,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [carMakes, setCarMakes] = useState([]);

  // Get car makes
  const {
    loading: makesLoading,
    fn: getMakesFn,
    data: makesData,
    error: makesError,
  } = useFetch(getCarMakes);

  // Create brand
  const {
    loading: createLoading,
    fn: createFn,
    data: createData,
    error: createError,
  } = useFetch(createFeaturedBrand);

  // Update brand
  const {
    loading: updateLoading,
    fn: updateFn,
    data: updateData,
    error: updateError,
  } = useFetch(updateFeaturedBrand);

  // Fetch car makes when dialog opens
  useEffect(() => {
    if (open) {
      getMakesFn();
    }
  }, [open]);

  // Update car makes list when data is loaded
  useEffect(() => {
    if (makesData?.success && makesData?.data) {
      setCarMakes(makesData.data);
    }
  }, [makesData]);

  // Initialize form with brand data if editing
  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name || "",
        nameAr: brand.nameAr || "",
        image: brand.image || "",
        order: brand.order || 0,
      });
      setImagePreview(brand.image || "");
    } else {
      // Reset form for new brand
      setFormData({
        name: "",
        nameAr: "",
        image: "",
        order: 0,
      });
      setImagePreview("");
    }
    setImageFile(null);
  }, [brand, open]);

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
      toast.error("يرجى إدخال اسم العلامة التجارية بالعربية");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("يرجى اختيار العلامة التجارية");
      return;
    }

    if (!formData.image) {
      toast.error("يرجى اختيار صورة للعلامة التجارية");
      return;
    }

    // Submit
    if (brand) {
      // Update existing brand
      await updateFn(brand.id, formData);
    } else {
      // Create new brand
      await createFn(formData);
    }
  };

  // Handle success
  useEffect(() => {
    if (createData?.success) {
      toast.success("تم إضافة العلامة التجارية بنجاح");
      onSuccess?.();
    }
    if (updateData?.success) {
      toast.success("تم تحديث العلامة التجارية بنجاح");
      onSuccess?.();
    }
  }, [createData, updateData]);

  // Handle errors
  useEffect(() => {
    if (createError) {
      toast.error("فشل في إضافة العلامة التجارية");
    }
    if (updateError) {
      toast.error("فشل في تحديث العلامة التجارية");
    }
  }, [createError, updateError]);

  const isLoading = createLoading || updateLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a] text-white border-zinc-800" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-bold text-white">
            {brand ? "تعديل العلامة التجارية" : "إضافة علامة تجارية جديدة"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {brand
              ? "قم بتعديل بيانات العلامة التجارية"
              : "أضف علامة تجارية جديدة للقسم المميز"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brand Name - Select from existing car makes */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">اسم العلامة التجارية *</Label>
            <Select
              value={formData.name}
              onValueChange={(value) => setFormData({ ...formData, name: value })}
              disabled={isLoading || makesLoading}
            >
              <SelectTrigger className="focus:ring-yellow-500/50">
                <SelectValue placeholder="اختر العلامة التجارية" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-zinc-800 text-white">
                {makesLoading ? (
                  <SelectItem value="loading" disabled>
                    <LoadingBar fullScreen={false} size="sm" />
                  </SelectItem>
                ) : carMakes.length > 0 ? (
                  carMakes.map((make) => (
                    <SelectItem key={make} value={make} className="hover:bg-zinc-900 focus:bg-zinc-900">
                      {make}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-makes" disabled>
                    لا توجد علامات تجارية
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              اختر من العلامات التجارية الموجودة في قاعدة البيانات
            </p>
          </div>

          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="nameAr" className="text-zinc-300">الاسم بالعربية *</Label>
            <Input
              id="nameAr"
              name="nameAr"
              value={formData.nameAr}
              onChange={handleInputChange}
              placeholder="مثال: هيونداي"
              required
              disabled={isLoading}
              className="focus-visible:ring-yellow-500/50"
            />
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="order" className="text-zinc-300">ترتيب العرض</Label>
            <Input
              id="order"
              name="order"
              type="number"
              value={formData.order}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              disabled={isLoading}
              className="focus-visible:ring-yellow-500/50"
            />
            <p className="text-xs text-zinc-500">
              يحدد ترتيب ظهور العلامة التجارية (الأصغر يظهر أولاً)
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-zinc-300">صورة العلامة التجارية *</Label>
            {imagePreview ? (
              <div className="relative w-full h-40 border-2 border-dashed border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
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
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700"
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
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-900/50 bg-zinc-900/20 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-zinc-500" />
                    <p className="mb-2 text-sm text-zinc-400">
                      <span className="font-semibold text-yellow-500">اضغط لرفع الصورة</span>
                    </p>
                    <p className="text-xs text-zinc-500">
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

          <DialogFooter className="gap-2 sm:gap-0 sm:justify-start flex-row mt-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {isLoading ? (
                <>
                  <LoadingBar fullScreen={false} size="sm" className="ml-2" />
                  جاري الحفظ...
                </>
              ) : brand ? (
                "تحديث"
              ) : (
                "إضافة"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedBrandDialog;
