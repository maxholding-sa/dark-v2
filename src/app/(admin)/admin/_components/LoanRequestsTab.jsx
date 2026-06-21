import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Banknote,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);

const LoanRequestsTab = ({ loanRequests }) => {
  const total = loanRequests.total || 1;

  const statusBars = [
    {
      key: "pending",
      label: "طلبات قيد الانتظار",
      count: loanRequests.pending,
      color: "bg-amber-600",
    },
    {
      key: "approved",
      label: "طلبات موافق عليها",
      count: loanRequests.approved,
      color: "bg-green-600",
    },
    {
      key: "completed",
      label: "طلبات مكتملة",
      count: loanRequests.completed,
      color: "bg-blue-600",
    },
    {
      key: "rejected",
      label: "طلبات مرفوضة",
      count: loanRequests.rejected,
      color: "bg-red-600",
    },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي طلبات القروض
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-2xl font-bold">{loanRequests.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-2xl font-bold">{loanRequests.pending}</div>
            <p className="text-xs text-muted-foreground">
              {((loanRequests.pending / total) * 100).toFixed(1)}% من الطلبات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موافق عليها</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-2xl font-bold">{loanRequests.approved}</div>
            <p className="text-xs text-muted-foreground">
              {((loanRequests.approved / total) * 100).toFixed(1)}% من الطلبات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-2xl font-bold">{loanRequests.completed}</div>
            <p className="text-xs text-muted-foreground">
              {((loanRequests.completed / total) * 100).toFixed(1)}% من الطلبات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-2xl font-bold">{loanRequests.rejected}</div>
            <p className="text-xs text-muted-foreground">
              {((loanRequests.rejected / total) * 100).toFixed(1)}% من الطلبات
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-right">إحصائيات طلبات القروض</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black-50 p-4 rounded-lg text-right">
              <h3 className="font-medium text-sm mb-2">معدل الموافقة</h3>
              <span className="text-3xl font-bold text-green-600">
                {loanRequests.approvalRate}%
              </span>
              <p className="text-sm text-gray-600 mt-1">
                الطلبات الموافق عليها والمكتملة
              </p>
            </div>

            <div className="bg-black-50 p-4 rounded-lg text-right">
              <h3 className="font-medium text-sm mb-2">معدل التحويل</h3>
              <span className="text-3xl font-bold text-blue-600">
                {loanRequests.conversionRate}%
              </span>
              <p className="text-sm text-gray-600 mt-1">
                طلبات القروض المكتملة التي أدت إلى بيع السيارات
              </p>
            </div>

            <div className="bg-black-50 p-4 rounded-lg text-right">
              <h3 className="font-medium text-sm mb-2 flex items-center justify-end gap-2">
                <Banknote className="h-4 w-4" />
                إجمالي مبالغ القروض
              </h3>
              <span className="text-2xl font-bold text-amber-600">
                {formatCurrency(loanRequests.totalLoanAmount)}
              </span>
              <p className="text-sm text-gray-600 mt-1">
                مجموع مبالغ القروض المطلوبة
              </p>
            </div>

            <div className="bg-black-50 p-4 rounded-lg text-right">
              <h3 className="font-medium text-sm mb-2">متوسط مبلغ القرض</h3>
              <span className="text-2xl font-bold text-purple-600">
                {formatCurrency(loanRequests.averageLoanAmount)}
              </span>
              <p className="text-sm text-gray-600 mt-1">
                متوسط مبلغ القرض لكل طلب
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 bg-black-50 p-4 rounded-lg space-y-4">
        <h3 className="font-medium text-sm mb-2 text-right">
          تفصيل حالة الطلب
        </h3>
        {statusBars.map(({ key, label, count, color }) => (
          <div key={key}>
            <div className="flex items-center">
              <span className="mr-2 text-sm pr-2">
                {((count / total) * 100).toFixed(0)}%
              </span>
              <div
                className="w-96/100 bg-gray-200 rounded-full h-2.5"
                style={{ transform: "scaleX(-1)" }}
              >
                <div
                  className={`${color} h-2.5 rounded-full`}
                  style={{ width: `${(count / total) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">{label}</p>
          </div>
        ))}
      </div>
    </>
  );
};

export default LoanRequestsTab;
