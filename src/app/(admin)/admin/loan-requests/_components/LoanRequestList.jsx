"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { React, useEffect, useState } from "react";
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

import { deleteLoanRequest, deleteLoanRequests, getLoanRequests, updateLoanRequestStatus, exportLoanRequests } from "@/actions/loan-requests";
import { Card, CardContent } from "@/components/ui/card";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSaudiRiyalReact, formatSaudiRiyalText, formatYesNo, formatLoanRequestStatusAr, isPricingPendingRequest, isUnknownOrCustomCarRequest } from "@/lib/helper";
import LoanRequestDetailView from "./LoanRequestDetailView";
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
import { Checkbox } from "@/components/ui/checkbox";

const LoanRequestList = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [loanRequestToDelete, setLoanRequestToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLoanRequest, setSelectedLoanRequest] = useState(null);
  const [selectedLoanRequests, setSelectedLoanRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [getLoanRequestsLoading, setGetLoanRequestsLoading] = useState(false);
  const [getLoanRequestsData, setGetLoanRequestsData] = useState(null);
  const [getLoanRequestsError, setGetLoanRequestsError] = useState(null);

  const [updateLoanRequestLoading, setUpdateLoanRequestLoading] = useState(false);
  const [updatedLoanRequestData, setUpdatedLoanRequestData] = useState(null);
  const [updatedLoanRequestsError, setUpdatedLoanRequestsError] = useState(null);

  const [deleteLoanRequestLoading, setDeleteLoanRequestLoading] = useState(false);
  const [deletedLoanRequestData, setDeletedLoanRequestData] = useState(null);
  const [deleteLoanRequestError, setDeleteLoanRequestError] = useState(null);

  const getLoanRequestFn = async (search = "") => {
    setGetLoanRequestsLoading(true);
    setGetLoanRequestsError(null);
    try {
      const result = await getLoanRequests(search);
      setGetLoanRequestsData(result);
    } catch (error) {
      setGetLoanRequestsError(error);
    } finally {
      setGetLoanRequestsLoading(false);
    }
  };

  const updateLoanRequestFn = async (id, status) => {
    setUpdateLoanRequestLoading(true);
    setUpdatedLoanRequestsError(null);
    try {
      const result = await updateLoanRequestStatus(id, status);
      setUpdatedLoanRequestData(result);
    } catch (error) {
      setUpdatedLoanRequestsError(error);
    } finally {
      setUpdateLoanRequestLoading(false);
    }
  };

  const deleteLoanRequestFn = async (id) => {
    setDeleteLoanRequestLoading(true);
    setDeleteLoanRequestError(null);
    try {
      const result = await deleteLoanRequest(id);
      setDeletedLoanRequestData(result);
    } catch (error) {
      setDeleteLoanRequestError(error);
    } finally {
      setDeleteLoanRequestLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    getLoanRequestFn(searchTerm);
  };

  // custom badges for loan request status
  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            معلق
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            مقبول
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            مرفوض
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            مكتمل
          </Badge>
        );
      default:
        return (
          <Badge className="bg-black-100 text-white-800 hover:bg-black-100">
            {status}
          </Badge>
        );
    }
  };

  // handling status update
  const handleStatusUpdate = async (loanRequest, newStatus) => {
    await updateLoanRequestFn(loanRequest.id, newStatus);
  };

  // handling delete
  const handleDeleteLoanRequest = async (loanRequest) => {
    if (!loanRequestToDelete) return;

    await deleteLoanRequestFn(loanRequestToDelete.id);
    setDeleteDialogOpen(false);
    setLoanRequestToDelete(null);
  };

  // Call the getLoanRequestsFn on search term change
  useEffect(() => {
    getLoanRequestFn(searchTerm);
  }, [searchTerm]);

  // handling successful operations
  useEffect(() => {
    if (deletedLoanRequestData?.success) {
      toast.success("تم حذف طلب القرض بنجاح");
      getLoanRequestFn();
    }

    if (updatedLoanRequestData?.success) {
      toast.success("تم تحديث طلب القرض بنجاح");
      getLoanRequestFn(searchTerm);
    }
  }, [updatedLoanRequestData, deletedLoanRequestData]);

  // handling errors
  useEffect(() => {
    if (getLoanRequestsError) {
      toast.error("فشل في جلب طلبات القروض");
    }
    if (updatedLoanRequestsError) {
      toast.error("فشل في تحديث طلب القرض");
    }
    if (deleteLoanRequestError) {
      toast.error("فشل في حذف طلب القرض");
    }
  }, [getLoanRequestsError, updatedLoanRequestsError, deleteLoanRequestError]);

  const handleViewLoanRequest = (loanRequest) => {
    setSelectedLoanRequest(loanRequest);
  };

  const closeModal = () => {
    setSelectedLoanRequest(null);
  };

  // Handle checkbox selection
  const handleSelectLoanRequest = (id) => {
    setSelectedLoanRequests(prev =>
      prev.includes(id)
        ? prev.filter(requestId => requestId !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLoanRequests([]);
      setSelectAll(false);
    } else {
      setSelectedLoanRequests(getLoanRequestsData.data.map(request => request.id));
      setSelectAll(true);
    }
  };

  // Export to Excel
  const handleExportAll = async () => {
    try {
      const result = await exportLoanRequests(null, searchTerm);
      if (result.success) {
        const ws = XLSX.utils.json_to_sheet(result.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "طلبات القروض");
        XLSX.writeFile(wb, `طلبات_القروض_الكل_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("تم تصدير جميع طلبات القروض بنجاح");
      } else {
        toast.error("فشل في تصدير طلبات القروض");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  // Export selected to Excel
  const handleExportSelected = async () => {
    if (selectedLoanRequests.length === 0) {
      toast.error("يرجى اختيار طلبات للتصدير");
      return;
    }
    try {
      const result = await exportLoanRequests(selectedLoanRequests, searchTerm);
      if (result.success) {
        const ws = XLSX.utils.json_to_sheet(result.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "طلبات القروض المختارة");
        XLSX.writeFile(wb, `طلبات_القروض_المختارة_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("تم تصدير الطلبات المختارة بنجاح");
      } else {
        toast.error("فشل في تصدير الطلبات المختارة");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء التصدير");
    }
  };

  // Delete every selected request in one call
  const handleDeleteSelected = async () => {
    if (selectedLoanRequests.length === 0) return;

    setBulkDeleteLoading(true);
    try {
      const result = await deleteLoanRequests(selectedLoanRequests);
      if (!result?.success) {
        toast.error(result?.error || "فشل في حذف الطلبات المختارة");
        return;
      }

      // Some rows may already be gone if another admin deleted them meanwhile.
      const missing = (result.requested ?? selectedLoanRequests.length) - result.count;
      toast.success(
        missing > 0
          ? `تم حذف ${result.count} طلب (${missing} لم تعد موجودة)`
          : `تم حذف ${result.count} طلب بنجاح`
      );

      setSelectedLoanRequests([]);
      setSelectAll(false);
      setBulkDeleteDialogOpen(false);
      await getLoanRequestFn(searchTerm);
    } catch (error) {
      toast.error("حدث خطأ أثناء حذف الطلبات المختارة");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Update select all state when data changes
  useEffect(() => {
    if (getLoanRequestsData?.data) {
      const allSelected = getLoanRequestsData.data.length > 0 &&
        getLoanRequestsData.data.every(request => selectedLoanRequests.includes(request.id));
      setSelectAll(allSelected);
    }
  }, [getLoanRequestsData, selectedLoanRequests]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="search"
              placeholder="بحث عن طلبات القروض..."
              className="pl-9 w-full sm:w-60"
            />
          </div>
        </form>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleExportAll}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير الكل
          </Button>
          <Button
            onClick={handleExportSelected}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={selectedLoanRequests.length === 0}
          >
            <Download className="h-4 w-4" />
            تصدير المختار ({selectedLoanRequests.length})
          </Button>
          <Button
            onClick={() => setBulkDeleteDialogOpen(true)}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
            disabled={selectedLoanRequests.length === 0 || bulkDeleteLoading}
          >
            <Trash2 className="h-4 w-4" />
            حذف المختار ({selectedLoanRequests.length})
          </Button>
        </div>
      </div>

      {/* Loan Requests Table */}
      <Card className="overflow-visible">
        <CardContent className="p-0">
          {getLoanRequestsLoading && !getLoanRequestsData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : getLoanRequestsData?.success && getLoanRequestsData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                {/* table Head */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-right">الاسم الكامل</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">رقم الجوال</TableHead>
                    <TableHead className="text-right">صورة السيارة</TableHead>
                    <TableHead className="text-right">السيارة</TableHead>
                    <TableHead className="text-right">مبلغ القرض</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الطلب</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Tablebody - map all the loan requests */}
                <TableBody>
                  {getLoanRequestsData.data.map((loanRequest) => {
                    return (
                      <TableRow key={loanRequest.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLoanRequests.includes(loanRequest.id)}
                            onCheckedChange={() => handleSelectLoanRequest(loanRequest.id)}
                          />
                        </TableCell>
                        <TableCell>{loanRequest.fullName}</TableCell>
                        <TableCell>
                          <a href={`mailto:${loanRequest.email}`} className="text-blue-600 hover:underline">
                            {loanRequest.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{loanRequest.mobileNumber}</span>
                            <WhatsAppButton
                              phoneNumber={loanRequest.mobileNumber}
                              fixed={false}
                              className="h-6 w-6"
                              text={`السلام عليكم،\n\nنحن من معرض ماكس موتورز. لقد اطلعنا على طلبكم.\n\nتفاصيل الطلب:\n- الاسم: ${loanRequest.fullName}\n- رقم الهوية: ${loanRequest.idNumber || "غير محدد"}\n- رقم الجوال: ${loanRequest.mobileNumber}\n- البريد الإلكتروني: ${loanRequest.email}\n- المدينة: ${loanRequest.city}\n- وقت التواصل: ${loanRequest.time || "غير محدد"}\n\nتفاصيل السيارة:\n- الماركة: ${loanRequest.carMake}\n- الموديل: ${loanRequest.carModel}\n- السنة: ${loanRequest.carYear}\n- الفئة: ${loanRequest.carCategory || 'غير محدد'}\n- رابط السيارة: ${isUnknownOrCustomCarRequest(loanRequest) ? 'غير متوفر (طلب سيارة غير مسجلة)' : `${typeof window !== 'undefined' ? window.location.origin : ''}/cars/${loanRequest.carId}`}\n\nتفاصيل القرض:\n- مبلغ القرض: ${isPricingPendingRequest(loanRequest) ? "بانتظار تحديد سعر السيارة" : formatSaudiRiyalText(loanRequest.loanAmount)}\n- الدفعة الأولى: ${formatSaudiRiyalText(loanRequest.downPayment)}\n- مدة القرض: ${loanRequest.termMonths ? `${loanRequest.termMonths} شهر` : `${loanRequest.loanTerm} سنة`}\n- القسط الشهري: ${loanRequest.monthlyPayment ? formatSaudiRiyalText(loanRequest.monthlyPayment) : 'غير محدد'}\n- صافي الراتب: ${loanRequest.netSalary ? formatSaudiRiyalText(loanRequest.netSalary) : 'غير محدد'}\n- جهة العمل: ${loanRequest.employerSector || 'غير محدد'}\n- اسم جهة العمل: ${loanRequest.employer || 'غير محدد'}\n- جهة تحويل الراتب: ${loanRequest.salaryTransferBank?.name || 'غير محدد'}\n- هل لديك تمويل عقاري: ${formatYesNo(loanRequest.hasRealEstateFinance)}\n- هل لديك تعثر في سمة: ${formatYesNo(loanRequest.hasCreditDefault)}\n- إجمالي الإلتزامات الشهرية: ${loanRequest.totalMonthlyObligations ? formatSaudiRiyalText(loanRequest.totalMonthlyObligations) : 'غير محدد'}\n\nحالة الطلب: ${formatLoanRequestStatusAr(loanRequest.status)}\n\nيرجى التواصل معنا لمتابعة الطلب.`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isUnknownOrCustomCarRequest(loanRequest) && loanRequest.car?.images?.[0] ? (
                            <img
                              src={loanRequest.car.images[0]}
                              alt={`${loanRequest.carMake} ${loanRequest.carModel}`}
                              className="w-16 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 font-medium text-center p-1 leading-tight">
                              {isUnknownOrCustomCarRequest(loanRequest) ? "غير مسجلة" : "لا توجد صورة"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isUnknownOrCustomCarRequest(loanRequest) ? (
                            <Link
                              href={`/cars/${loanRequest.carId}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {loanRequest.carMake} {loanRequest.carModel} ({loanRequest.carYear})
                            </Link>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">
                                {loanRequest.carMake} {loanRequest.carModel} ({loanRequest.carYear})
                              </span>
                              <span className="text-[10px] text-amber-600 font-medium">سيارة غير مسجلة</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPricingPendingRequest(loanRequest) ? (
                            <span className="text-amber-600">بانتظار التسعير</span>
                          ) : (
                            formatSaudiRiyalReact(loanRequest.loanAmount)
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(loanRequest.status)}</TableCell>
                        <TableCell>
                          {new Date(loanRequest.createdAt).toLocaleDateString("ar-SA")}
                        </TableCell>
                        {/* Dropdown menu */}
                        <TableCell className="relative">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 z-[100] bg-black backdrop-blur-sm"
                              dir="rtl"
                              sideOffset={5}
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleViewLoanRequest(loanRequest)}
                              >
                                <Eye className="ml-2 h-4 w-4" /> عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(loanRequest, "APPROVED");
                                }}
                                disabled={
                                  loanRequest.status === "APPROVED" ||
                                  updateLoanRequestLoading
                                }
                              >
                                قبول الطلب
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(loanRequest, "REJECTED");
                                }}
                                disabled={
                                  loanRequest.status === "REJECTED" ||
                                  updateLoanRequestLoading
                                }
                              >
                                رفض الطلب
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  handleStatusUpdate(loanRequest, "COMPLETED");
                                }}
                                disabled={
                                  loanRequest.status === "COMPLETED" ||
                                  updateLoanRequestLoading
                                }
                              >
                                إكمال الطلب
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => {
                                  setLoanRequestToDelete(loanRequest);
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
            // No loan requests in db
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 text-gray-300 mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                لا توجد طلبات قروض
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "لا توجد طلبات قروض تطابق معايير البحث"
                  : "لم يتم تقديم أي طلبات قروض بعد"}
              </p>
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
                هل أنت متأكد من حذف طلب القرض لـ{" "}
                <strong className="text-gray-700">
                  {loanRequestToDelete?.fullName}
                </strong>{" "}
                ؟ هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoanRequestLoading}
            >
              إلغاء
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteLoanRequest}
              disabled={deleteLoanRequestLoading}
            >
              {deleteLoanRequestLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin cursor-pointer" />
              ) : (
                "حذف طلب القرض"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog box */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الطلبات المختارة</DialogTitle>
            <DialogDescription>
              <span>
                هل أنت متأكد من حذف{" "}
                <strong className="text-gray-700">
                  {selectedLoanRequests.length}
                </strong>{" "}
                من طلبات القروض؟ سيتم حذف بيانات العملاء وعروض التمويل المرتبطة
                بها نهائياً، وهذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteLoading}
            >
              إلغاء
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                `حذف ${selectedLoanRequests.length} طلب`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Request Detail Modal */}
      {selectedLoanRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-black p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xl font-bold text-white">تفاصيل طلب القرض</h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                ×
              </Button>
            </div>
            <LoanRequestDetailView
              loanRequest={selectedLoanRequest}
              statusBadge={getStatusBadge(selectedLoanRequest.status)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanRequestList;
