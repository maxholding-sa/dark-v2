import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // Check if Clerk is properly configured
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
      logger.error("[user-role] Clerk environment variables are not configured");
      return NextResponse.json({ error: "Clerk not configured" }, { status: 500 });
    }

    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ role: null });
    }

    // finding if the currentUser is present User-table
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    // Get role from Clerk metadata if available
    const clerkRole = user.publicMetadata?.role;
    const initialRole = (clerkRole === "ADMIN" || clerkRole === "EDITOR") ? clerkRole : "USER";

    // if a user is found return it
    if (loggedInUser) {
      // If DB has USER but Clerk has ADMIN/EDITOR, sync to DB
      if (loggedInUser.role === "USER" && initialRole !== "USER") {
        logger.info("[user-role] Syncing Clerk role to database", { role: initialRole });
        const updatedUser = await db.user.update({
          where: { id: loggedInUser.id },
          data: { role: initialRole }
        });
        return NextResponse.json({ role: updatedUser.role });
      }

      return NextResponse.json({ role: loggedInUser.role });
    }

    // user not found by clerkUserId, so create or update user by email
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      logger.warn("[user-role] Authenticated user has no primary email");
      return NextResponse.json({ error: "User email is required" }, { status: 400 });
    }

    const newUser = await db.user.upsert({
      where: {
        email,
      },
      update: {
        clerkUserId: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        imageUrl: user.imageUrl,
        phone: user.phoneNumbers?.[0]?.phoneNumber ?? null,
        // Update role if Clerk has a specific role (ADMIN/EDITOR)
        ...(clerkRole === "ADMIN" || clerkRole === "EDITOR" ? { role: clerkRole } : {})
      },
      create: {
        clerkUserId: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        imageUrl: user.imageUrl,
        email,
        phone: user.phoneNumbers?.[0]?.phoneNumber ?? null,
        role: initialRole,
      },
    });
    logger.info("[user-role] User role resolved", { role: newUser.role });
    return NextResponse.json({ role: newUser.role });
  } catch (error) {
    logger.error("[user-role] Failed to resolve user role", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
