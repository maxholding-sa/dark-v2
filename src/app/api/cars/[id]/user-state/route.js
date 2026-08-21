import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import { db } from "@/lib/prisma";

/**
 * Per-visitor state for a car page: whether they saved it, and their own pending
 * test-drive booking. Split out of the page render so /cars/[id] can be statically
 * cached — reading auth cookies during render forced the route dynamic and made
 * every car page uncacheable. Signed-out callers get the empty shape, never a 401,
 * so the client can call this unconditionally.
 */
export const dynamic = "force-dynamic";

const EMPTY_STATE = { isWishlisted: false, userTestDrive: null };

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ success: true, data: EMPTY_STATE });
    }

    const [savedCar, existingTestDrive] = await Promise.all([
      db.UserSavedCar.findUnique({
        where: { userId_carId: { carId: id, userId: user.id } },
      }),
      db.TestDriveBooking.findFirst({
        where: {
          carId: id,
          userId: user.id,
          status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        isWishlisted: !!savedCar,
        userTestDrive: existingTestDrive
          ? {
              id: existingTestDrive.id,
              status: existingTestDrive.status,
              bookingDate: existingTestDrive.bookingDate.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/cars/[id]/user-state:", error);
    // The page is fully usable without this — degrade quietly rather than 500.
    return NextResponse.json({ success: true, data: EMPTY_STATE });
  }
}
