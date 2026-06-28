"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Camera, Loader2, Upload, Loader } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { addCarToDB, processCarImageWithAI } from "@/actions/cars";
import { fuelTypes, transmissions, bodyTypeOptions, carStatuses, driveTypeOptions } from "@/lib/data";
import CarImageGalleryEditor from "./CarImageGalleryEditor";

import useFetch from "@/hooks/use-fetch";

const AddCarForm = () => {
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
    driveType: z.string().min(1, "نوع الدفع مطلوب"),
    seats: z.string().optional(),
    description: z
      .string()
      .min(10, "يجب أن يكون الوصف 10 أحرف على الأقل"),
    category: z.string().optional(),
    videoUrl: z.string().optional(),
    status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
    featured: z.boolean().default(false),
    isLuxury: z.boolean().default(false),
    testDriveAvailable: z.boolean().default(true),
    // Images are handled separately
  });

  const {
    register,
    setValue,
    getValues,
    watch,
    handleSubmit,
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
      driveType: "",
      seats: "",
      description: "",
      category: "",
      videoUrl: "",
      status: "AVAILABLE",
      featured: false,
      isLuxury: false,
      testDriveAvailable: true,
    },
  });

  const [activeTab, setActiveTab] = useState("ai");
  const [imageError, setImageError] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);

  const [aiImagePreview, setAiImagePreview] = useState(null);
  const [uploadedAiImage, setUploadedAiImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();

  // initializeing the custom UseFetch hook to add car in db
  const {
    data: addCarResult,
    loading: addCarLoading,
    fn: addCarFn,
  } = useFetch(addCarToDB);

  // check if the car is added or not
  useEffect(() => {
    if (addCarResult?.success) {
      toast.success("تمت إضافة السيارة بنجاح");
      router.push("/admin/cars");
    }
  }, [addCarResult]);

  // handle form submit
  const onSubmitForm = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("يرجى رفع صورة واحدة على الأقل");
      return;
    }
    console.log(data);

    //restructure the carData
    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseInt(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,
    };

    await addCarFn({ carData, images: uploadedImages }); //from useFetch
  };

  // multi-image dropbox logic
  const onMultiImagesDrop = (acceptedFiles) => {
    // filter the images by file size
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} يتجاوز 5 ميجابايت وسيتم تجاهله`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImages = []; //store images here

    // loop through each file and store it in reader
    validFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        // image
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
  // multi-image dropzone
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

  // ai-image dropbox logic
  const onAiImageDrop = (acceptedFiles) => {
    // Do something with the files
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be lesser than 5MB");
      return;
    }

    setUploadedAiImage(file);
    const reader = new FileReader();
    reader.onloadend = (e) => {
      // image
      setAiImagePreview(e.target.result);
      toast.success("Image uploaded successfully");
    };

    reader.readAsDataURL(file);
  };
  // ai-image dropzone
  const {
    getRootProps: getAiImageRootProps,
    getInputProps: getAiImageInputProps,
  } = useDropzone({
    onDrop: onAiImageDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // initializeing the custom UseFetch hook to processCarImageWithAI
  const {
    loading: processAiIamgeLoading,
    fn: processAiImageFn,
    data: processAiImageResult,
    error: processAiImageError,
  } = useFetch(processCarImageWithAI);

  // handle image process by AI
  const processImageWithAi = async () => {
    if (!uploadedAiImage) {
      toast.error("يرجى رفع صورة أولاً");
      return;
    }

    // Convert File to FormData to pass to Server Action
    const formData = new FormData();
    formData.append("image", uploadedAiImage);

    await processAiImageFn(formData);
  };

  // check if there is a error while processing image with AI
  useEffect(() => {
    if (processAiImageError) {
      toast.error(processAiImageError.message || "فشل في معالجة الصورة");
    }
  }, [processAiImageError]);

  // check if the image is processed bt Ai
  useEffect(() => {
    if (processAiImageResult) {
      // Handle error response from server
      if (!processAiImageResult.success) {
        toast.error(processAiImageResult.error || "فشل في معالجة الصورة");
        return;
      }

      // Handle success
      if (processAiImageResult.success && processAiImageResult.data) {
        const carDetails = processAiImageResult.data;

        // Update form with AI results
        setValue("make", carDetails.make);
        setValue("model", carDetails.model);
        setValue("year", carDetails.year.toString());
        setValue("color", carDetails.color);
        setValue("bodyType", carDetails.bodyType);
        setValue("fuelType", carDetails.fuelType);
        setValue("price", carDetails.price);
        setValue("mileage", carDetails.mileage);
        setValue("transmission", carDetails.transmission);
        setValue("description", carDetails.description);

        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImages((prev) => [...prev, e.target.result]);
        };
        if (uploadedImages.length > 0 && uploadedAiImage) {
          reader.readAsDataURL(uploadedAiImage);
        }

        toast.success("تم استخراج تفاصيل السيارة بنجاح", {
          description: `تم اكتشاف ${carDetails.year} ${carDetails.make} ${
            carDetails.model
          } بثقة ${Math.round(carDetails.confidence * 100)}%`,
        });
        setActiveTab("manual");
      }
    }
  }, [processAiImageResult, uploadedAiImage]);

  const onAiImageRemove = () => {
    // Update form
    setValue("make", "");
    setValue("model", "");
    setValue("year", "");
    setValue("color", "");
    setValue("bodyType", "");
    setValue("fuelType", "");
    setValue("price", "");
    setValue("mileage", "");
    setValue("transmission", "");
    setValue("description", "");
  };

  return (
    <div>
      <Tabs
        defaultValue="ai"
        className="mt-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="flex justify-end mb-2">
          <TabsList dir="rtl" className="grid w-fit grid-cols-2">
            <TabsTrigger value="ai">رفع بالذكاء الاصطناعي</TabsTrigger>
            <TabsTrigger value="manual">إدخال يدوي</TabsTrigger>
          </TabsList>
        </div>

        {/* manual form */}
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader className="text-right">
              <CardTitle>تفاصيل السيارة</CardTitle>
              <CardDescription>
                أدخل تفاصيل السيارة التي تريد إضافتها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                {/* form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Make */}
                  <div className="space-y-2" dir="rtl">
                    <Label htmlFor="make" className="text-right block">الشركة المصنعة</Label>
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
                    <Label htmlFor="model" className="text-right block">الموديل</Label>
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
                    <Label htmlFor="year" className="text-right block">السنة</Label>
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
                    <Label htmlFor="price" className="text-right block">السعر (ريال سعودي)</Label>
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

                  {/* Color */}
                  <div className="space-y-2" dir="rtl">
                    <Label htmlFor="color" className="text-right block">اللون</Label>
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
                    <Label htmlFor="fuelType" className="text-right block">نوع الوقود</Label>
                    <Select
                      value={watch("fuelType")}
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
                    <Label htmlFor="transmission" className="text-right block">ناقل الحركة</Label>
                    <Select
                      value={watch("transmission")}
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
                    <Label htmlFor="bodyType" className="text-right block">نوع الهيكل</Label>
                    <Select
                      value={watch("bodyType")}
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
                      value={watch("driveType")}
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
                    <Label htmlFor="status" className="text-right block">الحالة</Label>
                    <Select
                      value={watch("status")}
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
                  <Label htmlFor="description" className="text-right block">الوصف</Label>
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

                {/* Mileage */}
                <div className="space-y-2" dir="rtl">
                  <Label htmlFor="mileage" className="text-right block">المسافة المقطوعة</Label>
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

                {/* Test Drive Available */}
                <div className="flex items-start space-x-reverse space-x-3 space-y-0 rounded-md border p-4" dir="rtl">
                  <Checkbox
                    id="testDriveAvailable"
                    checked={watch("testDriveAvailable")}
                    onCheckedChange={(checked) => {
                      setValue("testDriveAvailable", checked);
                    }}
                  />
                  <div className="space-y-1 leading-none text-right">
                    <Label htmlFor="testDriveAvailable">متاحة للقيادة التجريبية</Label>
                    <p className="text-sm text-gray-500">
                      يمكن للعملاء حجز هذه السيارة للقيادة التجريبية
                    </p>
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

                <Button
                  type="submit"
                  className="w-full md:w-auto cursor-pointer"
                  disabled={addCarLoading}
                >
                  {" "}
                  {addCarLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    "إضافة السيارة"
                  )}{" "}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ai upload  */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">استخراج تفاصيل السيارة بالذكاء الاصطناعي</CardTitle>
              <CardDescription className="text-right">
                ارفع صورة للسيارة ودع الذكاء الاصطناعي يستخرج تفاصيلها
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Image div */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {/* Preview image */}
                  {aiImagePreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={aiImagePreview}
                        alt="معاينة السيارة"
                        className="max-h-56 max-w-full object-contain mb-4"
                      />
                      {/* Buttons */}
                      <div className="flex gap-3">
                        <Button
                          variant="outlined"
                          className="bg-gray-200 hover:bg-gray-400  cursor-pointer"
                          size="sm"
                          onClick={() => {
                            setAiImagePreview(null);
                            setUploadedAiImage(null);
                            onAiImageRemove();
                            toast.info("تم إزالة الصورة");
                          }}
                        >
                          إزالة
                        </Button>
                        <Button
                          className="cursor-pointer"
                          size="sm"
                          onClick={processImageWithAi}
                          disabled={processAiIamgeLoading}
                        >
                          {processAiIamgeLoading ? (
                            <>
                              <Loader className="ml-2 h-4 w-4 animate-spin" />
                              جاري المعالجة...{" "}
                            </>
                          ) : (
                            <>
                              {" "}
                              <Camera /> استخراج التفاصيل
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // image dropbox
                    <div
                      {...getAiImageRootProps()}
                      className="cursor-pointer hover:bg-gray-50-transition "
                    >
                      <input {...getAiImageInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400 mb-2 " />
                        <p className="text-gray-600 text-sm">
                          اسحب وأفلت أو انقر لرفع صورة
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {" "}
                          يدعم: JPG، PNG، WebP (بحد أقصى 5 ميجابايت){" "}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* How it works */}
                <div className="bg-black-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2 text-right">كيف يعمل</h3>
                  <ol className="space-y-2 text-sm text-white-600 list-decimal pr-4 text-right" dir="rtl">
                    <li>ارفع صورة واضحة للسيارة</li>
                    <li>انقر على "استخراج التفاصيل" للتحليل باستخدام الذكاء الاصطناعي</li>
                    <li>راجع المعلومات المستخرجة</li>
                    <li>املأ أي تفاصيل ناقصة يدوياً</li>
                    <li>أضف السيارة إلى المخزون</li>
                  </ol>
                </div>

                {/* Tips for best results */}
                <div className="bg-black-50 p-4 rounded-md">
                  <h3 className="font-medium text-amber-800 mb-1 text-right">
                    نصائح للحصول على أفضل النتائج
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700 text-right" dir="rtl">
                    <li>• استخدم صوراً واضحة وجيدة الإضاءة</li>
                    <li>• حاول التقاط المركبة بالكامل</li>
                    <li>• للموديلات الصعبة، استخدم عدة زوايا</li>
                    <li>• Always verify AI-extracted information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AddCarForm;
