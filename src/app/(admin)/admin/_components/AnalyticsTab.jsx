"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Car,
  CircleDollarSign,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#475569",
];

const formatNumber = (value) =>
  new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value || 0);

const formatCurrency = (value) =>
  new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const tooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-white p-3 text-right shadow-lg">
      {label ? <p className="mb-2 font-semibold text-gray-900">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey} className="text-sm text-gray-700">
            {item.name}: {formatNumber(item.value)}
          </p>
        ))}
      </div>
    </div>
  );
};

const ChartCard = ({ title, children, className = "" }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="text-right text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const MetricCard = ({ title, value, description, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="text-right">
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const EmptyState = () => (
  <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-gray-500">
    لا توجد بيانات كافية لعرض الرسم
  </div>
);

const hasData = (data) => data?.some((item) => Number(item.count || item.amount || 0) > 0);

const SimpleBarChart = ({ data, dataKey = "count", barName = "العدد", color = "#2563eb" }) => {
  if (!hasData(data)) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} />
        <YAxis />
        <Tooltip content={tooltipContent} />
        <Bar dataKey={dataKey} name={barName} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const DonutChart = ({ data }) => {
  if (!hasData(data)) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={tooltipContent} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const AnalyticsTab = ({ analytics }) => {
  if (!analytics) {
    return <EmptyState />;
  }

  const { summary, inventory, requests, content, engagement, operations } = analytics;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="إجمالي السيارات"
          value={formatNumber(analytics.websiteOverview?.[0]?.count)}
          description={`${formatNumber(inventory.values.availableCarsValue)} قيمة السيارات المتاحة`}
          icon={Car}
        />
        <MetricCard
          title="طلبات التمويل"
          value={formatNumber(requests.loanStatus.reduce((sum, item) => sum + item.count, 0))}
          description={`${formatCurrency(inventory.values.averageCarPrice)} متوسط سعر السيارة`}
          icon={CircleDollarSign}
        />
        <MetricCard
          title="المستخدمون"
          value={formatNumber(summary.totalUsers)}
          description={`${formatNumber(summary.totalSavedCars)} سيارة محفوظة`}
          icon={Users}
        />
        <MetricCard
          title="المحتوى والتفاعل"
          value={formatNumber(summary.totalChats + summary.totalContacts)}
          description={`${formatNumber(summary.totalArticles)} مقال، ${formatNumber(summary.totalReviews)} تقييم`}
          icon={MessageSquare}
        />
      </div>

      <ChartCard title="نمو النشاط خلال آخر 6 أشهر" className="overflow-hidden">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={analytics.activityTrend} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="analyticsCars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="analyticsRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={tooltipContent} />
            <Legend />
            <Area type="monotone" dataKey="cars" name="سيارات جديدة" stroke="#2563eb" fill="url(#analyticsCars)" />
            <Area type="monotone" dataKey="loanRequests" name="طلبات قروض" stroke="#16a34a" fill="url(#analyticsRequests)" />
            <Line type="monotone" dataKey="testDrives" name="اختبارات قيادة" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="chats" name="محادثات" stroke="#7c3aed" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="نظرة عامة على كل الموقع">
          <SimpleBarChart data={analytics.websiteOverview} color="#111827" />
        </ChartCard>
        <ChartCard title="حالة مخزون السيارات">
          <DonutChart data={inventory.status} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="أكثر العلامات توفرًا">
          <SimpleBarChart data={inventory.byMake} color="#2563eb" />
        </ChartCard>
        <ChartCard title="السيارات حسب نوع الهيكل">
          <SimpleBarChart data={inventory.byBodyType} color="#0891b2" />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="السيارات حسب الوقود">
          <DonutChart data={inventory.byFuelType} />
        </ChartCard>
        <ChartCard title="السيارات حسب ناقل الحركة">
          <DonutChart data={inventory.byTransmission} />
        </ChartCard>
        <ChartCard title="السيارات المميزة">
          <DonutChart data={inventory.featured} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="حالات اختبارات القيادة">
          <SimpleBarChart data={requests.testDriveStatus} color="#f59e0b" />
        </ChartCard>
        <ChartCard title="حالات طلبات القروض">
          <SimpleBarChart data={requests.loanStatus} color="#16a34a" />
        </ChartCard>
      </div>

      <ChartCard title="مبالغ طلبات القروض حسب الحالة">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={requests.loanStatusAmounts} margin={{ top: 10, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={tooltipContent} />
            <Legend />
            <Bar yAxisId="left" dataKey="amount" name="إجمالي المبالغ" fill="#16a34a" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="count" name="عدد الطلبات" stroke="#2563eb" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="المقالات">
          <DonutChart data={content.articles} />
        </ChartCard>
        <ChartCard title="التقييمات حسب النجوم">
          <SimpleBarChart data={content.reviewsByRating} color="#f59e0b" />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="نتائج محادثات المساعد">
          <DonutChart data={engagement.chatResults} />
        </ChartCard>
        <ChartCard title="لغات المحادثات">
          <DonutChart data={engagement.chatsByLanguage} />
        </ChartCard>
        <ChartCard title="المستخدمون حسب الدور">
          <DonutChart data={operations.usersByRole} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="أكثر مدن طلبات القروض">
          <SimpleBarChart data={requests.loanCities} color="#7c3aed" />
        </ChartCard>
        <ChartCard title="المناديب حسب المدينة">
          <SimpleBarChart data={operations.mandebsByCity} color="#db2777" />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="متوسط التقييم"
          value={`${summary.averageRating}/5`}
          description={`${formatNumber(summary.totalReviews)} تقييمات العملاء`}
          icon={Star}
        />
        <MetricCard
          title="المقالات المنشورة"
          value={formatNumber(summary.publishedArticles)}
          description={`${formatNumber(summary.draftArticles)} مسودات`}
          icon={BookOpen}
        />
        <MetricCard
          title="العلامات والموديلات النشطة"
          value={formatNumber(summary.activeFeaturedBrands + summary.activeFeaturedModels)}
          description="محتوى الواجهة الرئيسية"
          icon={BarChart3}
        />
        <MetricCard
          title="البنوك والمناديب"
          value={formatNumber(summary.totalBanks + summary.totalMandebs)}
          description={`${formatNumber(summary.totalBanks)} بنوك، ${formatNumber(summary.totalMandebs)} مناديب`}
          icon={CircleDollarSign}
        />
      </div>
    </div>
  );
};

export default AnalyticsTab;
