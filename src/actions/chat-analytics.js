"use server";

import { db } from "@/lib/prisma";

const normalizePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDateFilter = (value, endOfDay = false) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const buildChatLogWhere = ({ language, dateFrom, dateTo, search, resultStatus } = {}) => {
  const where = {};
  const andConditions = [];

  if (language && language !== "all") {
    where.language = language;
  }

  if (dateFrom || dateTo) {
    const from = parseDateFilter(dateFrom);
    const to = parseDateFilter(dateTo, true);

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
  }

  if (search?.trim()) {
    const query = search.trim();
    andConditions.push({
      OR: [
        { userMessage: { contains: query, mode: "insensitive" } },
        { correctedMessage: { contains: query, mode: "insensitive" } },
        { aiResponse: { contains: query, mode: "insensitive" } },
        { sessionId: { contains: query, mode: "insensitive" } },
        { userId: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (resultStatus === "with-results") {
    andConditions.push({
      OR: [
        { carsShown: { gt: 0 } },
        { carsFound: { gt: 0 } },
      ],
    });
  }

  if (resultStatus === "no-results") {
    andConditions.push({ carsShown: 0 }, { carsFound: 0 });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
};

// Get all chat logs with pagination
export async function getChatLogs({
  page = 1,
  limit = 20,
  language,
  dateFrom,
  dateTo,
  search,
  resultStatus,
} = {}) {
  try {
    const currentPage = normalizePositiveInt(page, 1);
    const pageSize = Math.min(normalizePositiveInt(limit, 20), 100);
    const skip = (currentPage - 1) * pageSize;
    const where = buildChatLogWhere({ language, dateFrom, dateTo, search, resultStatus });

    const [logs, total] = await Promise.all([
      db.chatLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.chatLog.count({ where }),
    ]);

    const carIds = [...new Set(logs.flatMap((log) => log.carIds || []))];
    const cars = carIds.length
      ? await db.car.findMany({
          where: { id: { in: carIds } },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            images: true,
          },
        })
      : [];

    const carsById = new Map(cars.map((car) => [car.id, car]));
    const logsWithCars = logs.map((log) => ({
      ...log,
      cars: (log.carIds || []).map((carId) => carsById.get(carId)).filter(Boolean),
    }));

    return {
      success: true,
      logs: logsWithCars,
      total,
      pages: Math.ceil(total / pageSize),
      currentPage,
    };
  } catch (error) {
    console.error("Error fetching chat logs:", error);
    return {
      success: false,
      error: error.message,
      logs: [],
      total: 0,
      pages: 0,
      currentPage: 1,
    };
  }
}

// Get chat analytics summary
export async function getChatAnalytics() {
  try {
    const [
      totalChats,
      totalWithResults,
      languageStats,
      recentChats,
      allMessages,
      allChatsWithTime,
    ] = await Promise.all([
      // Total chat count
      db.chatLog.count(),
      
      // Chats with results
      db.chatLog.count({
        where: {
          OR: [
            { carsShown: { gt: 0 } },
            { carsFound: { gt: 0 } },
          ],
        },
      }),
      
      // Language distribution
      db.chatLog.groupBy({
        by: ["language"],
        _count: true,
      }),
      
      // Recent chats (last 24 hours)
      db.chatLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Get recent messages for search term analysis
      db.chatLog.findMany({
        select: {
          userMessage: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      
      // Get all chats with timestamps for time-based analysis
      db.chatLog.findMany({
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    // Calculate most common search terms
    const searchTerms = {};
    allMessages.forEach(chat => {
      const words = chat.userMessage.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) { // Ignore very short words
          searchTerms[word] = (searchTerms[word] || 0) + 1;
        }
      });
    });

    const topSearchTerms = Object.entries(searchTerms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));

    // Hourly activity analysis
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: 0,
    }));

    allChatsWithTime.forEach(chat => {
      const hour = new Date(chat.createdAt).getHours();
      hourlyActivity[hour].count++;
    });

    // Daily trends (last 7 days)
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = allChatsWithTime.filter(chat => {
        const chatDate = new Date(chat.createdAt);
        return chatDate >= date && chatDate < nextDate;
      }).length;
      
      dailyTrends.push({
        date: date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        count,
      });
    }

    // Most viewed cars
    const allCarIds = await db.chatLog.findMany({
      where: {
        carIds: { isEmpty: false },
      },
      select: {
        carIds: true,
      },
    });

    const carViewCount = {};
    allCarIds.forEach(log => {
      log.carIds.forEach(carId => {
        carViewCount[carId] = (carViewCount[carId] || 0) + 1;
      });
    });

    const topCarIds = Object.entries(carViewCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([carId]) => carId);

    // Get car details for top cars
    const topCars = topCarIds.length > 0 ? await db.car.findMany({
      where: {
        id: { in: topCarIds },
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        images: true,
      },
    }) : [];

    // Add view counts to cars
    const topCarsWithCounts = topCars.map(car => ({
      ...car,
      viewCount: carViewCount[car.id],
    })).sort((a, b) => b.viewCount - a.viewCount);

    return {
      success: true,
      summary: {
        totalChats,
        totalWithResults,
        totalNoResults: totalChats - totalWithResults,
        successRate: totalChats > 0 ? ((totalWithResults / totalChats) * 100).toFixed(1) : 0,
        recentChats24h: recentChats,
        languageStats: languageStats.map(stat => ({
          language: stat.language === "ar" ? "العربية" : "English",
          count: stat._count,
          percentage: ((stat._count / totalChats) * 100).toFixed(1),
        })),
        topSearchTerms,
        topCars: topCarsWithCounts,
        hourlyActivity,
        dailyTrends,
      },
    };
  } catch (error) {
    console.error("Error fetching chat analytics:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete old chat logs
export async function deleteOldChatLogs(days = 90) {
  try {
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await db.chatLog.deleteMany({
      where: {
        createdAt: {
          lt: dateThreshold,
        },
      },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error) {
    console.error("Error deleting old chat logs:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
