"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Edit,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { React, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import useFetch from "@/hooks/use-fetch";
import {
  deleteFeaturedBrand,
  getAllFeaturedBrandsAdmin,
  toggleFeaturedBrandStatus,
} from "@/actions/featured-brands";
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
import FeaturedBrandDialog from "./FeaturedBrandDialog";

const FeaturedBrandList = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get brands
  const {
    loading: getBrandsLoading,
    fn: getBrandsFn,
    data: getBrandsData,
    error: getBrandsError,
  } = useFetch(getAllFeaturedBrandsAdmin);

  // Toggle status
  const {
    loading: toggleStatusLoading,
    fn: toggleStatusFn,
    data: toggleStatusData,
    error: toggleStatusError,
  } = useFetch(toggleFeaturedBrandStatus);

  // Delete brand
  const {
    loading: deleteBrandLoading,
    fn: deleteBrandFn,
    data: deletedBrandData,
    error: deleteBrandError,
  } = useFetch(deleteFeaturedBrand);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    getBrandsFn(searchTerm);
  };

  // Handle toggle status
  const handleToggleStatus = async (brand) => {
    await toggleStatusFn(brand.id);
  };

  // Handle delete brand
  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;

    await deleteBrandFn(brandToDelete.id);
    setDeleteDialogOpen(false);
    setBrandToDelete(null);
  };

  // Handle edit brand
  const handleEditBrand = (brand) => {
    setEditBrand(brand);
    setDialogOpen(true);
  };

  // Handle add new brand
  const handleAddBrand = () => {
    setEditBrand(null);
    setDialogOpen(true);
  };

  // Close dialog handler
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditBrand(null);
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    getBrandsFn(searchTerm);
    handleCloseDialog();
  };

  // Call the getBrandsFn on search term change
  useEffect(() => {
    getBrandsFn(searchTerm);
  }, [searchTerm]);

  // Handle successful operations
  useEffect(() => {
    if (deletedBrandData?.success) {
      toast.success("تم حذف العلامة التجارية بنجاح");
      getBrandsFn();
    }

    if (toggleStatusData?.success) {
      toast.success("تم تحديث الحالة بنجاح");
      getBrandsFn(searchTerm);
    }
  }, [toggleStatusData, deletedBrandData]);

  // Handle errors
  useEffect(() => {
    if (getBrandsError) {
      toast.error("فشل في جلب العلامات التجارية");
    }
    if (toggleStatusError) {
      toast.error("فشل في تحديث الحالة");
    }
    if (deleteBrandError) {
      toast.error("فشل في حذف العلامة التجارية");
    }
  }, [getBrandsError, toggleStatusError, deleteBrandError]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Add brand button */}
        <Button className="cursor-pointer" onClick={handleAddBrand}>
          <Plus className="h-4 w-4" /> إضافة علامة تجارية
        </Button>

        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="search"
              placeholder="بحث عن العلامات التجارية..."
              className="pl-9 w-full sm:w-60"
            />
          </div>
        </form>
      </div>

      {/* Brands Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0">
          {getBrandsLoading && !getBrandsData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : getBrandsData?.success && getBrandsData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                {/* Table Head */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الصورة</TableHead>
                    <TableHead className="text-right">الاسم بالعربية</TableHead>
                    <TableHead className="text-right">العلامة التجارية</TableHead>
                    <TableHead className="text-right">الترتيب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Table body - map all brands */}
                <TableBody>
                  {getBrandsData.data.map((brand) => {
                    return (
                      <TableRow key={brand.id}>
                        <TableCell className="w-16 h-16">
                          <div className="w-16 h-16 rounded-md overflow-hidden relative">
                            <Image
                              src={brand.image}
                              alt={brand.nameAr}
                              fill
                              className="object-contain"
                              priority
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {brand.nameAr}
                        </TableCell>
                        <TableCell>{brand.name}</TableCell>
                        <TableCell>{brand.order}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-9 w-9 cursor-pointer"
                            onClick={() => handleToggleStatus(brand)}
                            disabled={toggleStatusLoading}
                          >
                            {brand.isActive ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                نشط
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                غير نشط
                              </Badge>
                            )}
                          </Button>
                        </TableCell>
                        {/* Dropdown menu */}
                        <TableCell className="relative">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
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
                                onClick={() => handleEditBrand(brand)}
                              >
                                <Edit className="ml-2 h-4 w-4" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleToggleStatus(brand)}
                                disabled={toggleStatusLoading}
                              >
                                {brand.isActive ? (
                                  <>
                                    <EyeOff className="ml-2 h-4 w-4" /> إخفاء
                                  </>
                                ) : (
                                  <>
                                    <Eye className="ml-2 h-4 w-4" /> إظهار
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => {
                                  setBrandToDelete(brand);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="ml-2 h-4 w-4 text-red-600" />
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
            // No brands in db
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                لم يتم العثور على علامات تجارية
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "لا توجد علامات تجارية تطابق معايير البحث"
                  : "قائمتك فارغة. أضف علامة تجارية للبدء."}
              </p>
              <Button onClick={handleAddBrand}>أضف علامة تجارية</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog box */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] text-white border-zinc-800" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-bold text-white">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-zinc-400">
              <span>
                هل أنت متأكد من حذف{" "}
                <strong className="text-white">
                  {brandToDelete?.nameAr}
                </strong>{" "}
                ؟ هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 sm:justify-start flex-row mt-6">
            <Button
              variant="destructive"
              onClick={handleDeleteBrand}
              disabled={deleteBrandLoading}
              className="bg-red-600 hover:bg-red-700 font-semibold"
            >
              {deleteBrandLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin cursor-pointer" />
              ) : (
                "حذف العلامة التجارية"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteBrandLoading}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <FeaturedBrandDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        brand={editBrand}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
};

export default FeaturedBrandList;
