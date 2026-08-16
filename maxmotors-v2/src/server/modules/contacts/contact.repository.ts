import "server-only";

import type { Contact, Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import { toSkipTake, type PageParams } from "@/lib/pagination";
import type { ContactQuery } from "./contact.schema";

function buildWhere(query: ContactQuery): Prisma.ContactWhereInput {
  if (!query.search) return {};

  return {
    OR: [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { subject: { contains: query.search, mode: "insensitive" } },
      { message: { contains: query.search, mode: "insensitive" } },
    ],
  };
}

export async function findMany(
  query: ContactQuery,
  page: PageParams,
): Promise<{ contacts: Contact[]; total: number }> {
  const where = buildWhere(query);
  const { skip, take } = toSkipTake(page);

  const [contacts, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.contact.count({ where }),
    ]),
  );

  return { contacts, total };
}

export async function findById(id: string): Promise<Contact | null> {
  return withDbRetry(() => prisma.contact.findUnique({ where: { id } }));
}

export async function create(data: Prisma.ContactCreateInput): Promise<Contact> {
  return withDbRetry(() => prisma.contact.create({ data }));
}

export async function remove(id: string): Promise<void> {
  await withDbRetry(() => prisma.contact.delete({ where: { id } }));
}

export async function countSince(since: Date): Promise<number> {
  return withDbRetry(() => prisma.contact.count({ where: { createdAt: { gte: since } } }));
}
