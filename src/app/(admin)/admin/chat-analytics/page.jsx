import { getChatAnalytics, getChatLogs } from "@/actions/chat-analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
  Search,
  Filter,
  Clock,
  Languages,
  Hash,
  Bot,
  User,
  CarFront,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { 
  WordCloudChart, 
  SearchTrendsChart, 
  LanguagePieChart, 
  HourlyActivityChart,
  SuccessRateChart,
  DailyTrendsChart
} from "./_components/AnalyticsCharts";

export const metadata = {
  title: "تحليلات الدردشة | لوحة التحكم",
  description: "تحليل بيانات محادثات الذكاء الاصطناعي",
};

const PAGE_SIZE = 12;

const getParam = (searchParams, key) => {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
};

const buildQuery = (filters, overrides = {}) => {
  const params = new URLSearchParams();
  const nextFilters = { ...filters, ...overrides };

  Object.entries(nextFilters).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, String(value));
    }
  });

  return params.toString() ? `/admin/chat-analytics?${params.toString()}` : "/admin/chat-analytics";
};

const formatDateTime = (date) =>
  new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const getLanguageLabel = (language) => {
  if (language === "ar") return "العربية";
  if (language === "en") return "English";
  return language || "غير محدد";
};

const getResultBadge = (log) => {
  const hasResults = log.carsShown > 0 || log.carsFound > 0;

  return hasResults ? (
    <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
      {log.carsShown > 0 ? `${log.carsShown} سيارة معروضة` : `${log.carsFound} نتيجة`}
    </Badge>
  ) : (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
      بدون نتائج
    </Badge>
  );
};

export default async function ChatAnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    search: getParam(params, "search") || "",
    language: getParam(params, "language") || "all",
    resultStatus: getParam(params, "resultStatus") || "all",
    dateFrom: getParam(params, "dateFrom") || "",
    dateTo: getParam(params, "dateTo") || "",
    page: getParam(params, "page") || "1",
  };
  const currentPage = Math.max(Number.parseInt(filters.page, 10) || 1, 1);

  const [analyticsResult, logsResult] = await Promise.all([
    getChatAnalytics(),
    getChatLogs({
      page: currentPage,
      limit: PAGE_SIZE,
      language: filters.language,
      resultStatus: filters.resultStatus,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: filters.search,
    }),
  ]);

  if (!analyticsResult.success) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          حدث خطأ في تحميل البيانات: {analyticsResult.error}
        </div>
      </div>
    );
  }

  const { summary } = analyticsResult;
  const {
    logs = [],
    total = 0,
    pages = 0,
    currentPage: resolvedPage = currentPage,
  } = logsResult.success ? logsResult : {};
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.language !== "all" ||
      filters.resultStatus !== "all"
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">تحليلات الدردشة</h1>
        <p className="text-gray-600 mt-2">تحليل وإحصائيات محادثات الذكاء الاصطناعي مع العملاء</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المحادثات</p>
              <h3 className="text-2xl font-bold mt-1">{summary.totalChats}</h3>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">محادثات بنتائج</p>
              <h3 className="text-2xl font-bold mt-1">{summary.totalWithResults}</h3>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">بدون نتائج</p>
              <h3 className="text-2xl font-bold mt-1">{summary.totalNoResults}</h3>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">معدل النجاح</p>
              <h3 className="text-2xl font-bold mt-1">{summary.successRate}%</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Language Stats & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguagePieChart data={summary.languageStats} />

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">النشاط الأخير</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-sm text-gray-600">آخر 24 ساعة</span>
              <span className="text-2xl font-bold text-blue-600">{summary.recentChats24h}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              محادثة جديدة في آخر يوم
            </p>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SuccessRateChart 
          successRate={summary.successRate} 
          totalChats={summary.totalChats}
          totalWithResults={summary.totalWithResults}
        />
        <HourlyActivityChart data={summary.hourlyActivity} />
      </div>

      <DailyTrendsChart data={summary.dailyTrends} />

      <WordCloudChart data={summary.topSearchTerms} />

      <SearchTrendsChart data={summary.topSearchTerms.slice(0, 10)} />

      {/* Top Viewed Cars */}
      {summary.topCars.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">أكثر السيارات مشاهدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.topCars.map((car) => (
              <div key={car.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="relative h-32 w-full mb-3">
                  {car.images && car.images[0] ? (
                    <Image
                      src={car.images[0]}
                      alt={`${car.make} ${car.model}`}
                      fill
                      className="object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-gray-400">لا توجد صورة</span>
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900">
                  {car.make} {car.model} {car.year}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium text-blue-600">{car.viewCount}</span> مشاهدة
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Chat Logs */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">أحدث المحادثات</h3>
            <p className="text-sm text-gray-500 mt-1">
              عرض وتحليل آخر أسئلة العملاء وردود مساعد MAX AI
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              {total} محادثة
            </Badge>
            {hasActiveFilters && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/chat-analytics">
                  <RotateCcw className="h-4 w-4" />
                  إعادة ضبط
                </Link>
              </Button>
            )}
          </div>
        </div>

        <form action="/admin/chat-analytics" className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              name="search"
              defaultValue={filters.search}
              placeholder="ابحث في السؤال، الرد، الجلسة أو المستخدم..."
              className="pr-9"
            />
          </div>

          <select
            name="language"
            defaultValue={filters.language}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="all">كل اللغات</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>

          <select
            name="resultStatus"
            defaultValue={filters.resultStatus}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="all">كل النتائج</option>
            <option value="with-results">بنتائج</option>
            <option value="no-results">بدون نتائج</option>
          </select>

          <Input name="dateFrom" type="date" defaultValue={filters.dateFrom} aria-label="من تاريخ" />
          <Input name="dateTo" type="date" defaultValue={filters.dateTo} aria-label="إلى تاريخ" />

          <Button type="submit">
            <Filter className="h-4 w-4" />
            تطبيق
          </Button>
        </form>

        {!logsResult.success && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            تعذر تحميل أحدث المحادثات: {logsResult.error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
              لا توجد محادثات مطابقة للفلاتر الحالية.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border rounded-xl p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(log.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Languages className="h-3.5 w-3.5" />
                        {getLanguageLabel(log.language)}
                      </span>
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <Hash className="h-3.5 w-3.5" />
                        {log.sessionId.slice(0, 10)}
                      </span>
                      {log.userId && (
                        <span className="inline-flex items-center gap-1" dir="ltr">
                          <User className="h-3.5 w-3.5" />
                          {log.userId.slice(0, 10)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg bg-blue-50 p-3">
                      <p className="flex items-center gap-2 font-medium text-blue-950">
                        <User className="h-4 w-4" />
                        سؤال العميل
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{log.userMessage}</p>
                      {log.correctedMessage && log.correctedMessage !== log.userMessage && (
                        <p className="mt-2 text-xs text-blue-700">
                          الصياغة المصححة: {log.correctedMessage}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="flex items-center gap-2 font-medium text-gray-900">
                        <Bot className="h-4 w-4" />
                        رد الذكاء الاصطناعي
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 line-clamp-4">
                        {log.aiResponse}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 lg:w-56">
                    {getResultBadge(log)}
                    <div className="rounded-lg border bg-white p-3 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>السيارات الموجودة</span>
                        <span className="font-semibold text-gray-900">{log.carsFound}</span>
                      </div>
                      <div className="mt-2 flex justify-between">
                        <span>السيارات المعروضة</span>
                        <span className="font-semibold text-gray-900">{log.carsShown}</span>
                      </div>
                    </div>

                    {log.cars?.length > 0 && (
                      <div className="rounded-lg border bg-white p-3">
                        <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700">
                          <CarFront className="h-3.5 w-3.5" />
                          السيارات المقترحة
                        </p>
                        <div className="space-y-1">
                          {log.cars.slice(0, 4).map((car) => (
                            <Link
                              key={car.id}
                              href={`/admin/cars/edit/${car.id}`}
                              className="block truncate rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 hover:underline"
                            >
                              {car.make} {car.model} {car.year}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {pages > 1 && (
          <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              صفحة {resolvedPage} من {pages}
            </p>
            <div className="flex items-center gap-2">
              {resolvedPage <= 1 ? (
                <Button variant="outline" size="sm" disabled>
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildQuery(filters, {
                      page: Math.max(resolvedPage - 1, 1),
                    })}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </Link>
                </Button>
              )}
              {resolvedPage >= pages ? (
                <Button variant="outline" size="sm" disabled>
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildQuery(filters, {
                      page: Math.min(resolvedPage + 1, pages),
                    })}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
