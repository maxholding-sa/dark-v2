// server actions -> bascially API calls
// All the admin related APIs

"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { serializedCarsData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

export async function getAdmin() {
  // check is a user is logged in
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");
  const userId = clerkUser.id;

  // check is user exists in db
  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  const clerkRole = clerkUser.publicMetadata?.role;
  const isClerkAdmin = clerkRole === "ADMIN" || clerkRole === "EDITOR";

  // If user is admin in Clerk but not in DB, sync it!
  if (isClerkAdmin && (!user || user.role === "USER")) {
    logger.info("[admin] Syncing Clerk admin role to database", { role: clerkRole });
    if (user) {
      user = await db.user.update({
        where: { id: user.id },
        data: { role: clerkRole }
      });
    } else {
      // If user doesn't exist at all, they shouldn't really be accessing admin 
      // without hitting the role API first, but let's handle it just in case.
      // We don't want to create the full user record here blindly though.
      // But we can return a temporary user object.
      return {
        authorized: true,
        user: {
          clerkUserId: userId,
          role: clerkRole,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          permissions: clerkRole === "ADMIN" ? ["dashboard", "cars", "test-drives", "site-data"] : [] // Default permissions for admin
        }
      };
    }
  }

  //   check if user does not exist in db or is not an admin/editor
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return {
      authorized: false,
      reason: "unauthorized",
    };
  }

  return {
    authorized: true,
    user,
  };
}

export async function getAdminTestDrives({ search = "", status = "" }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "test-drives");
    if (!hasPermission) throw new Error("Unauthorized access");

    let where = {};
    if (status) {
      where.status = status;
    }

    // Add search filter
    if (search) {
      where.OR = [
        {
          car: {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const bookings = await db.TestDriveBooking.findMany({
      where,
      include: {
        car: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            phone: true,
          },
        },
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    });

    // Format the bookings
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      carId: booking.carId,
      car: serializedCarsData(booking.car),
      userId: booking.userId,
      user: booking.user,
      bookingDate: booking.bookingDate.toISOString(),
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedBookings,
    };
  } catch (error) {
    console.error("Error while calling getAdminTestDrive ->" + error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function updateTestDriveStatus({ bookingId, newStatus }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "test-drives");
    if (!hasPermission) throw new Error("Unauthorized access");

    // get the booking
    const booking = await db.TestDriveBooking.findUnique({
      where: { id: bookingId },
    });

    // throw error if booking is not found
    if (!booking) throw new Error("Booking not found");

    // check if the new-status is valid
    const validStatus = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "NO_SHOW",
      "CANCELLED",
    ];
    if (!validStatus.includes(newStatus)) {
      return {
        success: false,
        error: "Invalid status",
      };
    }

    // update the status of test drive booking
    await db.TestDriveBooking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    revalidatePath("/admin/test-drives");
    revalidatePath("/reservations");

    return {
      success: true,
      message: "Test Drives status is successfully updated",
    };
  } catch (error) {
    console.error(
      "Error while calling updateTestDriveStatus ->" + error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

const monthFormatter = new Intl.DateTimeFormat("ar-SA", {
  month: "short",
  year: "numeric",
});

const statusLabels = {
  AVAILABLE: "متاحة",
  UNAVAILABLE: "غير متاحة",
  SOLD: "مباعة",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكدة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
  NO_SHOW: "لم يحضر",
  APPROVED: "موافق عليها",
  REJECTED: "مرفوضة",
};

const toMonthKey = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};

const getLastMonths = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: toMonthKey(date),
      label: monthFormatter.format(date),
    };
  });
};

const buildStatusBreakdown = (items, statuses) =>
  statuses.map((status) => ({
    status,
    name: statusLabels[status] || status,
    count: items.filter((item) => item.status === status).length,
  }));

const buildTopBreakdown = (items, field, fallbackLabel = "غير محدد", limit = 8) => {
  const counts = items.reduce((acc, item) => {
    const value = item[field] || fallbackLabel;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export async function getDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const hasPermission = await checkPermission(userId, "dashboard");
    if (!hasPermission) {
      return {
        success: false,
        error: "Unauthorized access",
      };
    }

    // ==================================================================================================
    // get cars count-----------------------------------------------------------------------------

    // const totalCars = await db.Cars.count();
    // const availableCars = await db.Cars.count({
    //   where: { status: "AVAILABLE" },
    // });
    // const soldCars = await db.Cars.count({
    //   where: { status: "SOLD" },
    // });
    // const unavailableCars = await db.Cars.count({
    //   where: { status: "UNAVAILABLE" },
    // });
    // const featuredCars = await db.Cars.count({
    //   where: { featured: true },
    // });

    // Test drives statistics----------------------------------------------------------------------

    // const totalTestDrives = await db.TestDriveBooking.count();
    // const pendingTestDrives = await db.TestDriveBooking.count({
    //   where: { status: "PENDING" },
    // });
    // const confirmedTestDrives = await db.TestDriveBooking.count({
    //   where: { status: "CONFIRMED" },
    // });
    // const completedTestDrives = await db.TestDriveBooking.count({
    //   where: { status: "COMPLETED" },
    // });
    // const cancelledTestDrives = await db.TestDriveBooking.count({
    //   where: { status: "CANCELLED" },
    // });
    // const noShowTestDrives = await db.TestDriveBooking.count({
    //   where: { status: "NO_SHOW" },
    // });

    // calculate test drive conversion rate(completed test drives that led to sales)----------------

    // const completedTestDrivesCarIds = await db.TestDriveBooking.findMany({
    //   where: { status: "COMPLETED" },
    //   select: { carId: true },
    // });
    // const soldCarsAfterTestDrives = await db.Car.count({
    //   where: {
    //     id: { in: completedTestDrivesCarIds.map((item) => item.carId) },
    //     status: "SOLD",
    //   },
    // });

    // const convertionRate =
    //   completedTestDrives > 0
    //     ? (soldCarsAfterTestDrives / completedTestDrives) * 100
    //     : 0;

    // =================================================================================================

    // Fetch all necessary data in single operation
    const [
      cars,
      testDrives,
      loanRequests,
      users,
      savedCars,
      articles,
      reviews,
      contacts,
      chatLogs,
      featuredBrands,
      featuredModels,
      banks,
      mandebs,
    ] = await Promise.all([
      // get all cars with minimal field
      db.Car.findMany({
        select: {
          id: true,
          status: true,
          featured: true,
          make: true,
          bodyType: true,
          fuelType: true,
          transmission: true,
          price: true,
          createdAt: true,
        },
      }),

      // Get all test drives with minimal fields
      db.TestDriveBooking.findMany({
        select: {
          id: true,
          status: true,
          carId: true,
          bookingDate: true,
          createdAt: true,
        },
      }),

      db.loanRequest.findMany({
        select: {
          id: true,
          status: true,
          loanAmount: true,
          carId: true,
          city: true,
          createdAt: true,
        },
      }),

      db.user.findMany({
        select: {
          id: true,
          role: true,
          createdAt: true,
        },
      }),

      db.UserSavedCar.findMany({
        select: {
          id: true,
          carId: true,
          savedAt: true,
        },
      }),

      db.article.findMany({
        select: {
          id: true,
          published: true,
          createdAt: true,
          publishedAt: true,
        },
      }),

      db.review.findMany({
        select: {
          id: true,
          rating: true,
          createdAt: true,
        },
      }),

      db.contact.findMany({
        select: {
          id: true,
          createdAt: true,
        },
      }),

      db.chatLog.findMany({
        select: {
          id: true,
          carsFound: true,
          carsShown: true,
          language: true,
          createdAt: true,
        },
      }),

      db.featuredBrand.findMany({
        select: {
          id: true,
          isActive: true,
          createdAt: true,
        },
      }),

      db.featuredModel.findMany({
        select: {
          id: true,
          isActive: true,
          createdAt: true,
        },
      }),

      db.bank.findMany({
        select: {
          id: true,
          createdAt: true,
        },
      }),

      db.mandeb.findMany({
        select: {
          id: true,
          city: true,
          createdAt: true,
        },
      }),
    ]);

    // calculate car statistics
    const totalCars = cars.length;
    const availableCars = cars.filter(
      (car) => car.status === "AVAILABLE"
    ).length;
    const unavailableCars = cars.filter(
      (car) => car.status === "UNAVAILABLE"
    ).length;
    const soldCars = cars.filter((car) => car.status === "SOLD").length;
    const featuredCars = cars.filter((car) => car.featured).length;

    // calculate test-drives statistics
    const totalTestDrives = testDrives.length;
    const pendingTestDrives = testDrives.filter(
      (testDrive) => testDrive.status === "PENDING"
    ).length;
    const confirmedTestDrives = testDrives.filter(
      (testDrive) => testDrive.status === "CONFIRMED"
    ).length;
    const completedTestDrives = testDrives.filter(
      (testDrive) => testDrive.status === "COMPLETED"
    ).length;
    const cancelledTestDrives = testDrives.filter(
      (testDrive) => testDrive.status === "CANCELLED"
    ).length;
    const noShowTestDrives = testDrives.filter(
      (testDrive) => testDrive.status === "NO_SHOW"
    ).length;

    // calculate test drive conversion rate
    const completedTestDrivesCarIds = testDrives
      .filter((td) => td.status === "COMPLETED")
      .map((td) => td.carId);

    const soldCarsAfterTestDrive = cars.filter(
      (car) =>
        car.status === "SOLD" && completedTestDrivesCarIds.includes(car.id)
    ).length;

    const conversionRate =
      completedTestDrives > 0
        ? (soldCarsAfterTestDrive / completedTestDrives) * 100
        : 0;

    const totalLoanRequests = loanRequests.length;
    const pendingLoanRequests = loanRequests.filter(
      (req) => req.status === "PENDING"
    ).length;
    const approvedLoanRequests = loanRequests.filter(
      (req) => req.status === "APPROVED"
    ).length;
    const rejectedLoanRequests = loanRequests.filter(
      (req) => req.status === "REJECTED"
    ).length;
    const completedLoanRequests = loanRequests.filter(
      (req) => req.status === "COMPLETED"
    ).length;

    const totalLoanAmount = loanRequests.reduce(
      (sum, req) => sum + Number(req.loanAmount),
      0
    );
    const averageLoanAmount =
      totalLoanRequests > 0 ? totalLoanAmount / totalLoanRequests : 0;

    const approvalRate =
      totalLoanRequests > 0
        ? ((approvedLoanRequests + completedLoanRequests) / totalLoanRequests) *
          100
        : 0;

    const completedLoanRequestsCarIds = loanRequests
      .filter((req) => req.status === "COMPLETED")
      .map((req) => req.carId);

    const soldCarsAfterLoanRequests = cars.filter(
      (car) =>
        car.status === "SOLD" && completedLoanRequestsCarIds.includes(car.id)
    ).length;

    const loanConversionRate =
      completedLoanRequests > 0
        ? (soldCarsAfterLoanRequests / completedLoanRequests) * 100
        : 0;

    const lastMonths = getLastMonths(6);
    const countByMonth = (items, dateField) => {
      const counts = items.reduce((acc, item) => {
        const date = item[dateField];
        if (!date) return acc;
        const key = toMonthKey(date);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return lastMonths.map((month) => ({
        ...month,
        count: counts[month.key] || 0,
      }));
    };

    const sumDecimal = (items, field) =>
      items.reduce((sum, item) => sum + Number(item[field] || 0), 0);

    const soldCarsValue = sumDecimal(
      cars.filter((car) => car.status === "SOLD"),
      "price"
    );
    const availableCarsValue = sumDecimal(
      cars.filter((car) => car.status === "AVAILABLE"),
      "price"
    );
    const averageCarPrice = totalCars > 0 ? sumDecimal(cars, "price") / totalCars : 0;

    const activeFeaturedBrands = featuredBrands.filter((brand) => brand.isActive).length;
    const activeFeaturedModels = featuredModels.filter((model) => model.isActive).length;
    const publishedArticles = articles.filter((article) => article.published).length;
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    const carsByMonth = countByMonth(cars, "createdAt");
    const testDrivesByMonth = countByMonth(testDrives, "createdAt");
    const loanRequestsByMonth = countByMonth(loanRequests, "createdAt");
    const usersByMonth = countByMonth(users, "createdAt");
    const contactsByMonth = countByMonth(contacts, "createdAt");
    const chatsByMonth = countByMonth(chatLogs, "createdAt");

    const activityTrend = lastMonths.map((month) => ({
      month: month.label,
      cars: carsByMonth.find((item) => item.key === month.key)?.count || 0,
      testDrives: testDrivesByMonth.find((item) => item.key === month.key)?.count || 0,
      loanRequests: loanRequestsByMonth.find((item) => item.key === month.key)?.count || 0,
      users: usersByMonth.find((item) => item.key === month.key)?.count || 0,
      contacts: contactsByMonth.find((item) => item.key === month.key)?.count || 0,
      chats: chatsByMonth.find((item) => item.key === month.key)?.count || 0,
    }));

    const loanStatusAmounts = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"].map((status) => {
      const requests = loanRequests.filter((request) => request.status === status);
      return {
        status,
        name: statusLabels[status],
        count: requests.length,
        amount: parseFloat(sumDecimal(requests, "loanAmount").toFixed(2)),
      };
    });

    return {
      success: true,
      data: {
        cars: {
          total: totalCars,
          available: availableCars,
          sold: soldCars,
          unavailable: unavailableCars,
          featured: featuredCars,
        },
        testDrives: {
          total: totalTestDrives,
          pending: pendingTestDrives,
          confirmed: confirmedTestDrives,
          completed: completedTestDrives,
          cancelled: cancelledTestDrives,
          noShow: noShowTestDrives,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
        },
        loanRequests: {
          total: totalLoanRequests,
          pending: pendingLoanRequests,
          approved: approvedLoanRequests,
          rejected: rejectedLoanRequests,
          completed: completedLoanRequests,
          totalLoanAmount: parseFloat(totalLoanAmount.toFixed(2)),
          averageLoanAmount: parseFloat(averageLoanAmount.toFixed(2)),
          approvalRate: parseFloat(approvalRate.toFixed(2)),
          conversionRate: parseFloat(loanConversionRate.toFixed(2)),
        },
        analytics: {
          summary: {
            totalUsers: users.length,
            totalSavedCars: savedCars.length,
            totalArticles: articles.length,
            publishedArticles,
            draftArticles: articles.length - publishedArticles,
            totalReviews: reviews.length,
            averageRating: parseFloat(averageRating.toFixed(1)),
            totalContacts: contacts.length,
            totalChats: chatLogs.length,
            totalBanks: banks.length,
            totalMandebs: mandebs.length,
            totalFeaturedBrands: featuredBrands.length,
            activeFeaturedBrands,
            totalFeaturedModels: featuredModels.length,
            activeFeaturedModels,
          },
          inventory: {
            status: buildStatusBreakdown(cars, ["AVAILABLE", "SOLD", "UNAVAILABLE"]),
            byMake: buildTopBreakdown(cars, "make", "علامة غير محددة", 10),
            byBodyType: buildTopBreakdown(cars, "bodyType", "نوع غير محدد", 8),
            byFuelType: buildTopBreakdown(cars, "fuelType", "وقود غير محدد", 8),
            byTransmission: buildTopBreakdown(cars, "transmission", "ناقل غير محدد", 6),
            featured: [
              { name: "مميزة", count: featuredCars },
              { name: "غير مميزة", count: Math.max(totalCars - featuredCars, 0) },
            ],
            values: {
              soldCarsValue: parseFloat(soldCarsValue.toFixed(2)),
              availableCarsValue: parseFloat(availableCarsValue.toFixed(2)),
              averageCarPrice: parseFloat(averageCarPrice.toFixed(2)),
            },
          },
          requests: {
            testDriveStatus: buildStatusBreakdown(testDrives, [
              "PENDING",
              "CONFIRMED",
              "COMPLETED",
              "CANCELLED",
              "NO_SHOW",
            ]),
            loanStatus: buildStatusBreakdown(loanRequests, [
              "PENDING",
              "APPROVED",
              "COMPLETED",
              "REJECTED",
            ]),
            loanStatusAmounts,
            loanCities: buildTopBreakdown(loanRequests, "city", "مدينة غير محددة", 8),
          },
          content: {
            articles: [
              { name: "منشورة", count: publishedArticles },
              { name: "مسودات", count: articles.length - publishedArticles },
            ],
            reviewsByRating: [5, 4, 3, 2, 1].map((rating) => ({
              name: `${rating} نجوم`,
              count: reviews.filter((review) => review.rating === rating).length,
            })),
            featuredContent: [
              { name: "علامات نشطة", count: activeFeaturedBrands },
              { name: "علامات غير نشطة", count: featuredBrands.length - activeFeaturedBrands },
              { name: "موديلات نشطة", count: activeFeaturedModels },
              { name: "موديلات غير نشطة", count: featuredModels.length - activeFeaturedModels },
            ],
          },
          engagement: {
            savedCarsByMonth: countByMonth(savedCars, "savedAt"),
            chatsByLanguage: buildTopBreakdown(chatLogs, "language", "غير محدد", 4).map((item) => ({
              ...item,
              name: item.name === "ar" ? "العربية" : item.name === "en" ? "English" : item.name,
            })),
            chatResults: [
              {
                name: "بنتائج",
                count: chatLogs.filter((log) => log.carsShown > 0 || log.carsFound > 0).length,
              },
              {
                name: "بدون نتائج",
                count: chatLogs.filter((log) => log.carsShown === 0 && log.carsFound === 0).length,
              },
            ],
          },
          operations: {
            usersByRole: ["ADMIN", "EDITOR", "USER"].map((role) => ({
              name: role === "ADMIN" ? "مدير" : role === "EDITOR" ? "محرر" : "عميل",
              count: users.filter((user) => user.role === role).length,
            })),
            mandebsByCity: buildTopBreakdown(mandebs, "city", "مدينة غير محددة", 8),
          },
          activityTrend,
          websiteOverview: [
            { name: "السيارات", count: totalCars },
            { name: "اختبارات القيادة", count: totalTestDrives },
            { name: "طلبات القروض", count: totalLoanRequests },
            { name: "المستخدمون", count: users.length },
            { name: "السيارات المحفوظة", count: savedCars.length },
            { name: "المحادثات", count: chatLogs.length },
            { name: "المقالات", count: articles.length },
            { name: "التقييمات", count: reviews.length },
            { name: "الرسائل", count: contacts.length },
          ],
        },
      },
    };
  } catch (error) {
    console.error(
      "Error while calling the getDashboardData server action : ",
      error.message
    );
    return {
      success: false,
      error: error,
    };
  }
}
