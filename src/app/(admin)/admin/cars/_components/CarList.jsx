"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CarIcon,
  Download,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { React, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import useFetch from "@/hooks/use-fetch";
import { applyCarImport, compareCarImport, deleteCars, exportCars, getCars, updateCarStatus } from "@/actions/cars";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { formatSaudiRiyalReact } from "@/lib/helper";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// English key → Arabic Excel column header
const EXCEL_COLUMNS = {
  id:                 "المعرف",
  make:               "الشركة المصنعة",
  model:              "الموديل",
  year:               "السنة",
  price:              "السعر",
  mileage:            "المسافة (كم)",
  color:              "اللون",
  fuelType:           "نوع الوقود",
  transmission:       "ناقل الحركة",
  bodyType:           "نوع الهيكل",
  isLuxury:           "فاخرة",
  insuranceSegment:   "فئة التأمين",
  driveType:          "نوع الدفع",
  seats:              "المقاعد",
  category:           "الفئة",
  videoUrl:           "رابط الفيديو",
  status:             "الحالة",
  featured:           "مميزة",
  testDriveAvailable: "اختبار قيادة",
  description:        "الوصف",
};

// Reverse map: Arabic header → English key (used on import)
const EXCEL_COLUMNS_REVERSE = Object.fromEntries(
  Object.entries(EXCEL_COLUMNS).map(([en, ar]) => [ar, en])
);

const FIELD_LABELS = {
  make:               "الشركة المصنعة",
  model:              "الموديل",
  year:               "السنة",
  price:              "السعر",
  mileage:            "المسافة",
  color:              "اللون",
  fuelType:           "نوع الوقود",
  transmission:       "ناقل الحركة",
  bodyType:           "نوع الهيكل",
  isLuxury:           "فاخرة",
  driveType:          "نوع الدفع",
  seats:              "المقاعد",
  category:           "الفئة",
  videoUrl:           "رابط الفيديو",
  status:             "الحالة",
  featured:           "مميزة",
  testDriveAvailable: "اختبار قيادة",
  description:        "الوصف",
};

const CarList = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [carToDelete, setCarToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // export / import state
  const [exportLoading, setExportLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  // step: "upload" | "review" | "done"
  const [importStep, setImportStep] = useState("upload");
  const [diffResult, setDiffResult] = useState(null); // { changes, toUpdate }
  const fileInputRef = useRef(null);

  // getCars
  const {
    loading: getCarsLoading,
    fn: getCarFn,
    data: getCarsData,
    error: getCarsError,
  } = useFetch(getCars);

  // update car
  const {
    loading: updateCarLoading,
    fn: updateCarFn,
    data: updatedCarData,
    error: updatedCarsError,
  } = useFetch(updateCarStatus);

  // delete cars
  const {
    loading: deleteCarLoading,
    fn: deleteCarFn,
    data: deletedCarData,
    error: deleteCarError,
  } = useFetch(deleteCars);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    getCarFn(searchTerm);
  };

  // cuatom badges for car availability
  const getStatusBadge = (status) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 ">
            متاحة
          </Badge>
        );
      case "UNAVAILABLE":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 ">
            غير متاحة
          </Badge>
        );
      case "SOLD":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 ">
            مباعة
          </Badge>
        );
    }
  };

  // handling featured update
  const handleToggleFeatured = async (car) => {
    await updateCarFn(car.id, { featured: !car.featured });
  };

  // handling status update
  const handleStatusUpdate = async (car, newStatus) => {
    await updateCarFn(car.id, { status: newStatus });
  };

  // handling test drive availability update
  const handleTestDriveUpdate = async (car, newTestDriveAvailable) => {
    await updateCarFn(car.id, { testDriveAvailable: newTestDriveAvailable });
  };

  // handling delete update
  const handleDeleteCar = async (car) => {
    if (!carToDelete) return;

    await deleteCarFn(carToDelete.id);
    setDeleteDialogOpen(false);
    setCarToDelete(null);
  };

  // Call the getCarsFn on search term change
  useEffect(() => {
    getCarFn(searchTerm);
  }, [searchTerm]);

  // handling successful operations
  useEffect(() => {
    if (deletedCarData?.success) {
      toast.success("تم حذف السيارة بنجاح");
      getCarFn();
    }

    if (updatedCarData?.success) {
      // console.log(updatedCarData);
      toast.success("تم تحديث السيارة بنجاح");
      getCarFn(searchTerm);
    }
  }, [updatedCarData, deletedCarData]);

  // handling errors
  useEffect(() => {
    if (getCarsError) {
      toast.error("فشل في جلب السيارات");
    }
    if (updatedCarsError) {
      toast.error("فشل في تحديث السيارة");
    }
    if (deleteCarError) {
      toast.error("فشل في حذف السيارات");
    }
  }, [getCarsError, updatedCarsError, deleteCarError]);

  // --- Export handler ---
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = await exportCars();
      if (!result.success) {
        toast.error("فشل في تصدير السيارات");
        return;
      }

      // Rename each row's keys from English to Arabic
      const arabicRows = result.data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, val]) => [EXCEL_COLUMNS[key] ?? key, val])
        )
      );

      // Use the Arabic header order defined in EXCEL_COLUMNS
      const headers = Object.values(EXCEL_COLUMNS);
      const ws = XLSX.utils.json_to_sheet(arabicRows, { header: headers });

      // Set RTL direction for the sheet
      ws["!sheetViews"] = [{ rightToLeft: true }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "السيارات");
      XLSX.writeFile(wb, `السيارات_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("تم تصدير السيارات بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setExportLoading(false);
    }
  };

  // --- Import step 1: parse file and compare (no DB writes) ---
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setDiffResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws);

      if (rawRows.length === 0) {
        toast.error("الملف فارغ أو غير صالح");
        return;
      }

      // Map Arabic headers back to English keys
      const rows = rawRows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, val]) => [EXCEL_COLUMNS_REVERSE[key] ?? key, val])
        )
      );

      const result = await compareCarImport(rows);
      if (!result.success) {
        toast.error(result.error || "فشل في معالجة الملف");
        return;
      }

      setDiffResult(result);
      setImportStep("review");
    } catch {
      toast.error("فشل في قراءة الملف");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Import step 2: admin confirms → apply updates ---
  const handleApplyImport = async () => {
    if (!diffResult?.toUpdate?.length) return;
    setApplyLoading(true);
    try {
      const result = await applyCarImport(diffResult.toUpdate);
      if (!result.success) {
        toast.error(result.error || "فشل في تطبيق التحديثات");
        return;
      }
      toast.success(`تم تحديث ${result.updated} سيارة بنجاح`);
      getCarFn(searchTerm);
      setImportStep("done");
    } catch {
      toast.error("حدث خطأ أثناء التحديث");
    } finally {
      setApplyLoading(false);
    }
  };

  const openImportDialog = () => {
    setDiffResult(null);
    setImportStep("upload");
    setImportDialogOpen(true);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left actions */}
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/cars/create">
            <Button className="cursor-pointer">
              <Plus className="h-4 w-4" /> إضافة سيارة
            </Button>
          </Link>

          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 ml-1" />
            )}
            تصدير Excel
          </Button>

          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={openImportDialog}
          >
            <Upload className="h-4 w-4 ml-1" />
            استيراد وتحديث
          </Button>
        </div>

        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="search"
              placeholder="بحث عن السيارات..."
              className="pl-9 w-full sm:w-60"
            />
          </div>
        </form>
      </div>

      {/* Cars Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0">
          {getCarsLoading && !getCarsData ? (
            <div className="flex items-centr justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : getCarsData?.success && getCarsData.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                {/* table Head */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right"></TableHead>
                    <TableHead className="text-right">الماركة والموديل</TableHead>
                    <TableHead className="text-right">السنة</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">مميزة</TableHead>
                    <TableHead className="text-right">اختبار قيادة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Tablebody - map all the cars */}
                <TableBody>
                  {getCarsData.data.map((car) => {
                    return (
                      <TableRow key={car.id}>
                        <TableCell className="w-16 h-16 rounded-md overflow-hidden">
                          {car.images && car.images.length > 0 ? (
                            // Image
                            <Image
                              src={car.images[0]}
                              alt={`${car.make} ${car.model}`}
                              height={64}
                              width={64}
                              className="w-full h-full object-cover"
                              priority
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <CarIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {car.make} {car.model}
                        </TableCell>
                        <TableCell>{car.year}</TableCell>
                        <TableCell>{formatSaudiRiyalReact(car.price)}</TableCell>
                        <TableCell>{getStatusBadge(car.status)} </TableCell>
                        {/* Featured */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-9 w-9 cursor-pointer"
                            onClick={() => handleToggleFeatured(car)}
                            disabled={updateCarLoading}
                          >
                            {car.featured ? (
                              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                            ) : (
                              <StarOff className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        {/* Test Drive Available */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto cursor-pointer"
                            onClick={() => handleTestDriveUpdate(car, !car.testDriveAvailable)}
                            disabled={updateCarLoading}
                          >
                            <Badge className={car.testDriveAvailable ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                              {car.testDriveAvailable ? "يوجد" : "لا يوجد"}
                            </Badge>
                          </Button>
                        </TableCell>
                        {/* Dropdown menu */}
                        <TableCell className="relative">
                          <DropdownMenu>
                            <DropdownMenuTrigger 
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                              onClick={() => console.log("Trigger clicked for car:", car.id)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className="w-56 z-[100]" 
                              dir="rtl" 
                              sideOffset={5}
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => router.push(`/cars/${car.id}`)}
                              >
                                <Eye className="ml-2 h-4 w-4" /> عرض
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => router.push(`/admin/cars/edit/${car.id}`)}
                              >
                                <Edit className="ml-2 h-4 w-4" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>الحالة</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(car, "UNAVAILABLE");
                                }}
                                disabled={
                                  car.status === "UNAVAILABLE" ||
                                  updateCarLoading
                                }
                              >
                                {" "}
                                تعيين كغير متاحة
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(car, "AVAILABLE");
                                }}
                                disabled={
                                  car.status === "AVAILABLE" || updateCarLoading
                                }
                              >
                                تعيين كمتاحة
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(car, "SOLD");
                                }}
                                disabled={
                                  car.status === "SOLD" || updateCarLoading
                                }
                              >
                                تعيين كمباعة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => {
                                  setCarToDelete(car);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="ml-2 h-4 w-4 text-red-600" />{" "}
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            // No cars in db
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CarIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                لم يتم العثور على سيارات
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "لا توجد سيارات تطابق معايير البحث"
                  : "مخزونك فارغ. أضف السيارات للبدء."}
              </p>
              <Button onClick={() => router.push("/admin/cars/create")}>
                أضف سيارتك الأولى
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import & Compare Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>استيراد وتحديث السيارات من Excel</DialogTitle>
            <DialogDescription>
              {importStep === "upload" && "ارفع ملف Excel الذي تم تصديره مسبقًا لمقارنة البيانات."}
              {importStep === "review" && "راجع التغييرات أدناه ثم اضغط تأكيد للتطبيق."}
              {importStep === "done" && "تم تطبيق جميع التحديثات بنجاح."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            {/* Step 1: Upload */}
            {importStep === "upload" && (
              <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="car-import-file"
                  />
                  <label htmlFor="car-import-file" className="cursor-pointer block">
                    <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 mb-1">اضغط لاختيار ملف Excel</p>
                    <p className="text-xs text-gray-400">يدعم .xlsx و .xls فقط</p>
                  </label>
                </div>
                {importLoading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري قراءة الملف ومقارنة البيانات...</span>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Review diff */}
            {importStep === "review" && diffResult && (
              <div className="space-y-3">
                {diffResult.changes.length === 0 ? (
                  <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 text-center text-sm text-gray-600">
                    لا توجد تغييرات — جميع البيانات محدّثة بالفعل
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 text-sm text-amber-800 font-medium">
                      تم العثور على {diffResult.changes.length} سيارة بها تغييرات
                    </div>

                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {diffResult.changes.map((car) => (
                        <div key={car.id} className="border rounded-lg p-3 bg-white shadow-sm">
                          <p className="font-semibold text-gray-800 mb-2 text-sm">
                            {car.make} {car.model} ({car.year})
                          </p>
                          <div className="space-y-1.5">
                            {car.fieldChanges.map((c) => (
                              <div key={c.field} className="grid grid-cols-[100px_1fr_16px_1fr] items-center gap-1 text-xs">
                                <span className="text-gray-500 font-medium">
                                  {FIELD_LABELS[c.field] ?? c.field}
                                </span>
                                <span className="bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5 truncate text-center">
                                  {String(c.from ?? "-")}
                                </span>
                                <span className="text-gray-400 text-center">←</span>
                                <span className="bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 truncate text-center">
                                  {String(c.to ?? "-")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Done */}
            {importStep === "done" && (
              <div className="rounded-lg p-4 bg-green-50 border border-green-200 text-center text-sm text-green-800 font-medium">
                تم تحديث {diffResult?.toUpdate?.length ?? 0} سيارة بنجاح
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {importStep === "upload" && (
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                إلغاء
              </Button>
            )}

            {importStep === "review" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setImportStep("upload"); setDiffResult(null); }}
                  disabled={applyLoading}
                >
                  رجوع
                </Button>
                {diffResult?.changes?.length > 0 && (
                  <Button onClick={handleApplyImport} disabled={applyLoading}>
                    {applyLoading ? (
                      <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جاري التحديث...</>
                    ) : (
                      "تأكيد التحديث"
                    )}
                  </Button>
                )}
                {diffResult?.changes?.length === 0 && (
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    إغلاق
                  </Button>
                )}
              </>
            )}

            {importStep === "done" && (
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                إغلاق
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog box */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              <span>
                هل أنت متأكد من حذف{" "}
                <strong className="text-gray-700">
                  {carToDelete?.make} {carToDelete?.model} ({carToDelete?.year})
                </strong>{" "}
                ؟ هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteCarLoading}
            >
              إلغاء
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteCar}
              disabled={deleteCarLoading}
            >
              {deleteCarLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin  cursor-pointer" />
              ) : (
                "حذف السيارة"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarList;
