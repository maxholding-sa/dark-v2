import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors/app-error";
import { PERMISSIONS, type Permission } from "@/config/routes";
import { logger } from "@/lib/logger";

/**
 * Authentication and authorisation, in one place.
 *
 * v1 called Clerk's `auth()` in 36 different actions and re-queried the user
 * row each time — so a single admin page could hit the users table five times
 * per render, and each call site invented its own idea of what "allowed" meant.
 */

export interface SessionUser {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: UserRole;
  permissions: Permission[];
}

function toSessionUser(user: User): SessionUser {
  // `permissions` is a Json column; anything that is not an array of strings is
  // treated as no grants rather than trusted.
  const raw = user.permissions;
  const permissions = Array.isArray(raw)
    ? raw.filter((value): value is Permission => typeof value === "string")
    : [];

  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
    permissions,
  };
}

/**
 * Current user, or null when signed out. `cache()` deduplicates within a single
 * render pass, so a layout, a page and three server components share one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  return toSessionUser(user);
});

/** Current user, or throws UNAUTHENTICATED. Use in any action requiring sign-in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw AppError.unauthenticated();
  return user;
}

/** ADMIN holds every permission implicitly; EDITOR holds only what is granted. */
export function hasPermission(user: SessionUser, permission: Permission): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "EDITOR") return user.permissions.includes(permission);
  return false;
}

/** Current user with `permission`, or throws. The only way to guard a mutation. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();

  if (!hasPermission(user, permission)) {
    logger.warn("auth.forbidden", { userId: user.id, permission });
    throw AppError.forbidden(`Missing permission: ${permission}`);
  }

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw AppError.forbidden("Admin role required");
  return user;
}

/**
 * Mirrors the Clerk identity into the local `User` table on first sight, so the
 * rest of the app can join on a local id and never has to call Clerk again.
 */
export async function syncCurrentUser(): Promise<SessionUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    logger.warn("auth.sync.noEmail", { clerkUserId: clerkUser.id });
    return null;
  }

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");

  const user = await prisma.user.upsert({
    where: { clerkUserId: clerkUser.id },
    update: { email, name: name || null, imageUrl: clerkUser.imageUrl },
    create: {
      clerkUserId: clerkUser.id,
      email,
      name: name || null,
      imageUrl: clerkUser.imageUrl,
      role: "USER",
    },
  });

  return toSessionUser(user);
}

export { PERMISSIONS };
export type { Permission };
