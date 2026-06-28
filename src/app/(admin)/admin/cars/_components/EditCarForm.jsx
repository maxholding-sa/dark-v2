"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateCar, getCarForEdit } from "@/actions/cars";
import { fuelTypes, transmissions, bodyTypeOptions, carStatuses, driveTypeOptions } from "@/lib/data";
import CarImageGalleryEditor from "./CarImageGalleryEditor";
import useFetch from "@/hooks/use-fetch";

const EditCarForm = ({ carId }) => {
  // Define form schema with Zod
  const carFormSchema = z.object({
    make: z.string().min(1, "الشركة المصنعة مطلوبة"),
    model: z.string().min(1, "الموديل مطلوب"),
    year: z.string().refine((val) => {
      const year = parseInt(val);
      return (
        !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1
      );
    }, "يرجى إدخال سنة صالحة"),
    price: z.string().min(1, "السعر مطلوب"),
    mileage: z.string().min(1, "المسافة المقطوعة مطلوبة"),
    color: z.string().min(1, "اللون مطلوب"),
    fuelType: z.string().min(1, "نوع الوقود مطلوب"),
    transmission: z.string().min(1, "ناقل الحركة مطلوب"),
    bodyType: z.enum([
      "إقتصادية",
      "سيدان",
      "مركبة تجارية",
      "بيك اب",
      "كروس أوفر",
      "هاتشباك",
      "suv",
      "فان",
      "ميني فان",
      "رياضية",
    ], {
      errorMap: () => ({ message: "نوع الهيكل مطلوب" }),
    }),
    seats: z.string().optional(),
    description: z
      .string()
      .min(10, "يجب أن يكون الوصف 10 أحرف على الأقل"),
    category: z.string().optional(),
    videoUrl: z.string().optional(),
    status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
    featured: z.boolean().default(false),
    isLuxury: z.boolean().default(false),
    driveType: z.string().min(1, "نوع الدفع مطلوب"),
    testDriveAvailable: z.boolean().default(true),
    // Images are handled separately
  });

  const {
    register,
    setValue,
    getValues,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      category: "",
      videoUrl: "",
      status: "AVAILABLE",
      featured: false,
      isLuxury: false,
      driveType: "",
      testDriveAvailable: true,
    },
  });

  const watchedFuelType = watch("fuelType");
  const watchedTransmission = watch("transmission");
  const watchedBodyType = watch("bodyType");
  const watchedDriveType = watch("driveType");
  const watchedStatus = watch("status");

  const [imageError, setImageError] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const router = useRouter();

  // Fetch car data for editing
  const {
    loading: getCarLoading,
    fn: getCarFn,
    data: getCarResult,
    error: getCarError,
  } = useFetch(getCarForEdit);

  // Update car
  const {
    data: updateCarResult,
    loading: updateCarLoading,
    fn: updateCarFn,
  } = useFetch(updateCar);

  // Load car data on component mount
  useEffect(() => {
    if (carId) {
      getCarFn(carId);
    }
  }, [carId]);

  // Handle car data loading
  useEffect(() => {
    if (getCarResult?.success && getCarResult.data) {
      const car = getCarResult.data;

      reset({
        make: car.make,
        model: car.model,
        year: car.year.toString(),
        price: car.price.toString(),
        mileage: car.mileage.toString(),
        color: car.color,
        fuelType: car.fuelType,
        transmission: car.transmission,
        bodyType: car.bodyType,
        seats: car.seats ? car.seats.toString() : "",
        description: car.description,
        category: car.category || "",
        videoUrl: car.videoUrl || "",
        status: car.status,
        featured: car.featured,
        isLuxury: car.isLuxury || false,
        driveType: car.driveType || "",
        testDriveAvailable: car.testDriveAvailable,
      });

      setUploadedImages(car.images || []);
    }
  }, [getCarResult, reset]);

  // Handle update success
  useEffect(() => {
    if (updateCarResult?.success) {
      toast.success("تم تحديث السيارة بنجاح");
      router.push("/admin/cars");
    }
  }, [updateCarResult, router]);

  // Handle errors
  useEffect(() => {
    if (getCarError) {
      toast.error("فشل في تحميل بيانات السيارة");
    }
  }, [getCarError]);

  // Handle form submit
  const onSubmitForm = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("يرجى رفع صورة واحدة على الأقل");
      return;
    }

    // Restructure the carData
    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseInt(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,
    };

    await updateCarFn(carId, carData, uploadedImages);
  };

  // Multi-image dropbox logic
  const onMultiImagesDrop = (acceptedFiles) => {
    // Filter the images by file size
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} يتجاوز 5 ميجابايت وسيتم تجاهله`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImages = []; // Store images here

    // Loop through each file and store it in reader
    validFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        // Image
        newImages.push(e.target.result);
        if (newImages.length === validFiles.length) {
          setUploadedImages((prev) => [...prev, ...newImages]);
          setImageError("");
          toast.success(`Successfully uploaded ${newImages.length} images`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Multi-image dropzone
  const {
    getRootProps: getMultiImageRootProps,
    getInputProps: getMultiImageInputProps,
  } = useDropzone({
    onDrop: onMultiImagesDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  if (getCarLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2">جاري تحميل بيانات السيارة...</span>
      </div>
    );
  }

  if (getCarError || !getCarResult?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">فشل في تحميل بيانات السيارة</p>
        <Button onClick={() => router.push("/admin/cars")}>
          العودة إلى قائمة السيارات
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader className="text-right">
          <CardTitle>تعديل تفاصيل السيارة</CardTitle>
          <CardDescription>
            قم بتعديل تفاصيل السيارة حسب الحاجة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Make */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="make" className="text-right block">
                  الشركة المصنعة
                </Label>
                <Input
                  id="make"
                  {...register("make")}
                  placeholder="مثال: تويوتا"
                  className={errors.make ? "border-red-500 text-right" : "text-right"}
                />
                {errors.make && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.make.message}
                  </p>
                )}
              </div>

              {/* Model */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="model" className="text-right block">
                  الموديل
                </Label>
                <Input
                  id="model"
                  {...register("model")}
                  placeholder="مثال: كامري"
                  className={errors.model ? "border-red-500 text-right" : "text-right"}
                />
                {errors.model && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.model.message}
                  </p>
                )}
              </div>

              {/* Year */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="year" className="text-right block">
                  السنة
                </Label>
                <Input
                  id="year"
                  {...register("year")}
                  placeholder="مثال: 2022"
                  className={errors.year ? "border-red-500 text-right" : "text-right"}
                />
                {errors.year && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.year.message}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="price" className="text-right block">
                  السعر ($)
                </Label>
                <Input
                  id="price"
                  {...register("price")}
                  placeholder="مثال: 25000"
                  className={errors.price ? "border-red-500 text-right" : "text-right"}
                />
                {errors.price && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.price.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="category" className="text-right block">
                  الفئة{" "}
                  <span className="text-sm text-gray-500">(اختياري)</span>
                </Label>
                <Input
                  id="category"
                  {...register("category")}
                  placeholder="مثال: سيدان فاخر"
                  className="text-right"
                />
              </div>

              {/* Mileage */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="mileage" className="text-right block">
                  المسافة المقطوعة
                </Label>
                <Input
                  id="mileage"
                  {...register("mileage")}
                  placeholder="مثال: 15000"
                  className={errors.mileage ? "border-red-500 text-right" : "text-right"}
                />
                {errors.mileage && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.mileage.message}
                  </p>
                )}
              </div>

              {/* Color */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="color" className="text-right block">
                  اللون
                </Label>
                <Input
                  id="color"
                  {...register("color")}
                  placeholder="مثال: أزرق"
                  className={errors.color ? "border-red-500 text-right" : "text-right"}
                />
                {errors.color && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.color.message}
                  </p>
                )}
              </div>

              {/* Fuel Type */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="fuelType" className="text-right block">
                  نوع الوقود
                </Label>
                <Select
                  key={watchedFuelType}
                  value={watchedFuelType}
                  onValueChange={(value) => setValue("fuelType", value)}
                >
                  <SelectTrigger
                    className={errors.fuelType ? "border-red-500 text-right" : "text-right"}
                  >
                    <SelectValue placeholder="اختر نوع الوقود" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fuelType && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.fuelType.message}
                  </p>
                )}
              </div>

              {/* Transmission */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="transmission" className="text-right block">
                  ناقل الحركة
                </Label>
                <Select
                  key={watchedTransmission}
                  value={watchedTransmission}
                  onValueChange={(value) => setValue("transmission", value)}
                >
                  <SelectTrigger
                    className={errors.transmission ? "border-red-500 text-right" : "text-right"}
                  >
                    <SelectValue placeholder="اختر ناقل الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    {transmissions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.transmission && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.transmission.message}
                  </p>
                )}
              </div>

              {/* Body Type */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="bodyType" className="text-right block">
                  نوع الهيكل
                </Label>
                <Select
                  key={watchedBodyType}
                  value={watchedBodyType}
                  onValueChange={(value) => setValue("bodyType", value)}
                >
                  <SelectTrigger
                    className={errors.bodyType ? "border-red-500 text-right" : "text-right"}
                  >
                    <SelectValue placeholder="اختر نوع الهيكل" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bodyType && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.bodyType.message}
                  </p>
                )}
              </div>

              {/* Drive Type */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="driveType" className="text-right block">نوع الدفع</Label>
                <Select
                  key={watchedDriveType}
                  value={watchedDriveType}
                  onValueChange={(value) => setValue("driveType", value)}
                >
                  <SelectTrigger
                    className={errors.driveType ? "border-red-500 text-right" : "text-right"}
                  >
                    <SelectValue placeholder="اختر نوع الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {driveTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.driveType && (
                  <p className="text-xs text-red-500 text-right">
                    {errors.driveType.message}
                  </p>
                )}
              </div>

              {/* Seats */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="seats" className="text-right block">
                  عدد المقاعد{" "}
                  <span className="text-sm text-gray-500">(اختياري)</span>
                </Label>
                <Input
                  id="seats"
                  {...register("seats")}
                  placeholder="مثال: 5"
                  className="text-right"
                />
              </div>

              {/* Status */}
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="status" className="text-right block">
                  الحالة
                </Label>
                <Select
                  key={watchedStatus}
                  value={watchedStatus}
                  onValueChange={(value) => setValue("status", value)}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {carStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "AVAILABLE" ? "متاحة" : status === "UNAVAILABLE" ? "غير متاحة" : "مباعة"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2" dir="rtl">
              <Label htmlFor="description" className="text-right block">
                الوصف
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                value={watch("description")}
                onChange={(e) => setValue("description", e.target.value)}
                placeholder="أدخل وصفاً تفصيلياً للسيارة..."
                className={`min-h-32 text-right ${
                  errors.description ? "border-red-500" : ""
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 text-right">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Video URL */}
            <div className="space-y-2" dir="rtl">
              <Label htmlFor="videoUrl" className="text-right block">
                رابط الفيديو{" "}
                <span className="text-sm text-gray-500">(اختياري)</span>
              </Label>
              <Input
                id="videoUrl"
                {...register("videoUrl")}
                placeholder="مثال: https://youtube.com/watch?v=..."
                className="text-right"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Featured */}
              <div className="flex items-start space-x-reverse space-x-3 space-y-0 rounded-md border p-4" dir="rtl">
                <Checkbox
                  id="featured"
                  checked={watch("featured")}
                  onCheckedChange={(checked) => {
                    setValue("featured", checked);
                  }}
                />
                <div className="space-y-1 leading-none text-right">
                  <Label htmlFor="featured">جعل هذه السيارة مميزة</Label>
                  <p className="text-sm text-gray-500">
                    السيارات المميزة تظهر في الصفحة الرئيسية
                  </p>
                </div>
              </div>

              {/* Luxury */}
              <div className="flex items-start space-x-reverse space-x-3 space-y-0 rounded-md border p-4" dir="rtl">
                <Checkbox
                  id="isLuxury"
                  checked={watch("isLuxury")}
                  onCheckedChange={(checked) => {
                    setValue("isLuxury", checked);
                  }}
                />
                <div className="space-y-1 leading-none text-right">
                  <Label htmlFor="isLuxury">سيارة فارهة</Label>
                  <p className="text-sm text-gray-500">
                    سيتم عرض وسم "فارهة" على هذه السيارة
                  </p>
                </div>
              </div>
            </div>

            {/* Image Upload Dropzone */}
            <div dir="rtl">
              <Label
                htmlFor="images"
                className={imageError ? "text-red-500 text-right block" : "text-right block"}
              >
                الصور
                {imageError && <span className="text-red-500">*</span>}
              </Label>

              {/* Image Dropzone UI */}
              <div
                {...getMultiImageRootProps()}
                className={`cursor-pointer border-2 border-dashed rounded-lg mt-2 p-6 text-center cursor-pointer hover:bg-gray-50 transition ${
                  imageError ? "border-red-500" : "border-gray-300"
                } `}
              >
                <input {...getMultiImageInputProps()} />
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-3 " />
                  <p className="text-sm text-gray-600">
                    {`اسحب وأفلت أو انقر لرفع صور متعددة`}
                  </p>

                  <p className="text-gray-400 text-xs">
                    يدعم: JPG، PNG، Webp (بحد أقصى 5 ميجابايت)
                  </p>
                </div>
              </div>

              {imageError && (
                <p className="text-xs text-red-500 mt-1 text-right">{imageError}</p>
              )}

              <CarImageGalleryEditor
                images={uploadedImages}
                setImages={setUploadedImages}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/cars")}
                disabled={updateCarLoading}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={updateCarLoading}
              >
                {updateCarLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  "تحديث السيارة"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCarForm;
