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
  deleteFeaturedModel,
  getAllFeaturedModelsAdmin,
  toggleFeaturedModelStatus,
  getCarBodyTypes,
} from "@/actions/featured-models";
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
import FeaturedModelDialog from "./FeaturedModelDialog";

const FeaturedModelList = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [modelToDelete, setModelToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get models
  const {
    loading: getModelsLoading,
    fn: getModelsFn,
    data: getModelsData,
    error: getModelsError,
  } = useFetch(getAllFeaturedModelsAdmin);

  // Toggle status
  const {
    loading: toggleStatusLoading,
    fn: toggleStatusFn,
    data: toggleStatusData,
    error: toggleStatusError,
  } = useFetch(toggleFeaturedModelStatus);

  // Delete model
  const {
    loading: deleteModelLoading,
    fn: deleteModelFn,
    data: deletedModelData,
    error: deleteModelError,
  } = useFetch(deleteFeaturedModel);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    getModelsFn(searchTerm);
  };

  // Handle toggle status
  const handleToggleStatus = async (model) => {
    await toggleStatusFn(model.id);
  };

  // Handle delete model
  const handleDeleteModel = async () => {
    if (!modelToDelete) return;

    await deleteModelFn(modelToDelete.id);
    setDeleteDialogOpen(false);
    setModelToDelete(null);
  };

  // Handle edit model
  const handleEditModel = (model) => {
    setEditModel(model);
    setDialogOpen(true);
  };

  // Handle add new model
  const handleAddModel = () => {
    setEditModel(null);
    setDialogOpen(true);
  };

  // Close dialog handler
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditModel(null);
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    getModelsFn(searchTerm);
    handleCloseDialog();
  };

  // Call the getModelsFn on search term change
  useEffect(() => {
    getModelsFn(searchTerm);
  }, [searchTerm]);

  // Handle successful operations
  useEffect(() => {
    if (deletedModelData?.success) {
      toast.success("تم حذف نوع الهيكل بنجاح");
      getModelsFn();
    }

    if (toggleStatusData?.success) {
      toast.success("تم تحديث الحالة بنجاح");
      getModelsFn(searchTerm);
    }
  }, [toggleStatusData, deletedModelData]);

  // Handle errors
  useEffect(() => {
    if (getModelsError) {
      toast.error("فشل في جلب أنواع الهيكل");
    }
    if (toggleStatusError) {
      toast.error("فشل في تحديث الحالة");
    }
    if (deleteModelError) {
      toast.error("فشل في حذف نوع الهيكل");
    }
  }, [getModelsError, toggleStatusError, deleteModelError]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Add body type button */}
        <Button className="cursor-pointer" onClick={handleAddModel}>
          <Plus className="h-4 w-4" /> إضافة نوع هيكل
        </Button>

        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="search"
              placeholder="بحث عن أنواع الهيكل..."
              className="pl-9 w-full sm:w-60"
            />
          </div>
        </form>
      </div>

      {/* Models Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0">
          {getModelsLoading && !getModelsData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : getModelsData?.success && getModelsData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                {/* Table Head */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الصورة</TableHead>
                    <TableHead className="text-right">الاسم بالعربية</TableHead>
                    <TableHead className="text-right">نوع الهيكل</TableHead>
                    <TableHead className="text-right">الترتيب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Table body - map all models */}
                <TableBody>
                  {getModelsData.data.map((model) => {
                    return (
                      <TableRow key={model.id}>
                        <TableCell className="w-16 h-16">
                          <div className="w-16 h-16 rounded-md overflow-hidden relative">
                            <Image
                              src={model.image}
                              alt={model.nameAr}
                              fill
                              className="object-contain"
                              priority
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {model.nameAr}
                        </TableCell>
                        <TableCell>{model.name}</TableCell>
                        <TableCell>{model.order}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-9 w-9 cursor-pointer"
                            onClick={() => handleToggleStatus(model)}
                            disabled={toggleStatusLoading}
                          >
                            {model.isActive ? (
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
                                onClick={() => handleEditModel(model)}
                              >
                                <Edit className="ml-2 h-4 w-4" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleToggleStatus(model)}
                                disabled={toggleStatusLoading}
                              >
                                {model.isActive ? (
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
                                  setModelToDelete(model);
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
            // No models in db
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                لم يتم العثور على أنواع هيكل
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "لا توجد أنواع هيكل تطابق معايير البحث"
                  : "قائمتك فارغة. أضف نوع هيكل للبدء."}
              </p>
              <Button onClick={handleAddModel}>أضف نوع هيكل</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog box */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              <span>
                هل أنت متأكد من حذف{" "}
                <strong className="text-gray-700">
                  {modelToDelete?.nameAr}
                </strong>{" "}
                ؟ هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteModelLoading}
            >
              إلغاء
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteModel}
              disabled={deleteModelLoading}
            >
              {deleteModelLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin cursor-pointer" />
              ) : (
                "حذف نوع الهيكل"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <FeaturedModelDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        model={editModel}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
};

export default FeaturedModelList;
