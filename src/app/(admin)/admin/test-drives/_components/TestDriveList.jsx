"use client";
import { getAdminTestDrives, updateTestDriveStatus } from "@/actions/admin";
import { deleteTestDrive } from "@/actions/test-drive";
import React, { useEffect, useState } from "react";
import useFetch from "@/hooks/use-fetch";

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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Search, Loader2, CalendarRange, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TestDriveCard from "@/components/TestDriveCard";
import { toast } from "sonner";

const TestDriveList = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Custom hooks for API calls
  const {
    loading: getTestDriveLoading,
    fn: getTestDriveFn,
    data: getTestDriveResult,
    error: getTestDriveError,
  } = useFetch(getAdminTestDrives);
  const {
    loading: updateTestDriveLoading,
    fn: updateTestDriveFn,
    data: updateTestDriveResult,
    error: updateTestDriveError,
  } = useFetch(updateTestDriveStatus);
  const {
    loading: deleteTestDriveLoading,
    fn: deleteTestDriveFn,
    data: deleteTestDriveResult,
    error: deleteTestDriveError,
  } = useFetch(deleteTestDrive);

  // get test drives
  useEffect(() => {
    if (statusFilter === "all") {
      setStatusFilter("");
      return;
    }
    getTestDriveFn({ search, status: statusFilter });
  }, [search, statusFilter]);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await getTestDriveFn({ search, status: statusFilter });
  };

  // Handle booking cancellation
  const handleCancel = async (bookingId) => {
    await deleteTestDriveFn(bookingId);
  };

  // Handle status update
  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (newStatus) {
      await updateTestDriveFn({ bookingId, newStatus });
    }
  };

  // Handle errors
  useEffect(() => {
    if (getTestDriveError) {
      toast.error("فشل في تحميل اختبارات القيادة");
    }
    if (updateTestDriveError) {
      toast.error("فشل في تحديث حالة اختبار القيادة");
    }
    if (deleteTestDriveError) {
      toast.error("فشل في إلغاء اختبار القيادة");
    }
  }, [getTestDriveError, updateTestDriveError, deleteTestDriveError]);

  // Handle successful operations
  useEffect(() => {
    if (updateTestDriveResult?.success) {
      toast.success("تم تحديث حالة اختبار القيادة بنجاح");
      getTestDriveFn({ search, status: statusFilter });
    }
    if (deleteTestDriveResult?.success) {
      toast.success("تم إلغاء اختبار القيادة بنجاح");
      getTestDriveFn({ search, status: statusFilter });
    }
  }, [updateTestDriveResult, deleteTestDriveResult]);

  return (
    <div className="space-y-4 ">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full sm:w-48"
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="PENDING">قيد الانتظار</SelectItem>
              <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
              <SelectItem value="COMPLETED">مكتملة</SelectItem>
              <SelectItem value="CANCELLED">ملغاة</SelectItem>
              <SelectItem value="NO_SHOW">بدون حضور</SelectItem>
            </SelectContent>
          </Select>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex w-full">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="بحث حسب السيارة أو العميل..."
                className="pr-9 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" className="mr-2">
              بحث
            </Button>
          </form>
        </div>
      </div>

      {/* Test Drives List */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            حجوزات اختبار القيادة
          </CardTitle>
          <CardDescription>
            إدارة جميع حجوزات اختبار القيادة وتحديث حالتها
          </CardDescription>
        </CardHeader>

        <CardContent>
          {getTestDriveLoading && !getTestDriveResult ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : getTestDriveError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>
                فشل في تحميل اختبارات القيادة. الرجاء المحاولة مرة أخرى.
              </AlertDescription>
            </Alert>
          ) : getTestDriveResult?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CalendarRange className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                لم يتم العثور على اختبارات قيادة
              </h3>
              <p className="text-gray-500 mb-4">
                {statusFilter || search
                  ? "لا توجد اختبارات قيادة تطابق معايير البحث"
                  : "لا توجد حجوزات لاختبار القيادة بعد."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getTestDriveResult?.data?.map((booking) => (
                <div key={booking.id} className="relative">
                  <TestDriveCard
                    booking={booking}
                    onCancel={handleCancel}
                    showActions={["PENDING", "CONFIRMED"].includes(
                      booking.status
                    )}
                    isAdmin={true}
                    isCancelling={deleteTestDriveLoading}
                    cancelError={deleteTestDriveError}
                    renderStatusSelector={() => (
                      <Select
                        value={booking.status}
                        onValueChange={(value) =>
                          handleUpdateStatus(booking.id, value)
                        }
                        disabled={updateTestDriveLoading}
                      >
                        <SelectTrigger className="w-full h-8">
                          <SelectValue placeholder="تحديث الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                          <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
                          <SelectItem value="COMPLETED">مكتملة</SelectItem>
                          <SelectItem value="CANCELLED">ملغاة</SelectItem>
                          <SelectItem value="NO_SHOW">بدون حضور</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDriveList;
