import "server-only";

import type { Prisma, Review } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import { toSkipTake, type PageParams } from "@/lib/pagination";
import { buildSpellingVariants, tokenizeQuery } from "@/lib/search-text";
import type { ReviewQuery } from "./review.schema";

function buildWhere(query: ReviewQuery): Prisma.ReviewWhereInput {
  const conditions: Prisma.ReviewWhereInput[] = [];

  if (query.minRating !== undefined) conditions.push({ rating: { gte: query.minRating } });

  const tokens = tokenizeQuery(query.search);
  if (tokens.length > 0) {
    conditions.push({
      AND: tokens.map((token) => ({
        OR: buildSpellingVariants(token).flatMap((variant) => [
          { clientName: { contains: variant, mode: "insensitive" as const } },
          { city: { contains: variant, mode: "insensitive" as const } },
          { car: { contains: variant, mode: "insensitive" as const } },
          { reviewText: { contains: variant, mode: "insensitive" as const } },
        ]),
      })),
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function findMany(
  query: ReviewQuery,
  page: PageParams,
): Promise<{ reviews: Review[]; total: number }> {
  const where = buildWhere(query);
  const { skip, take } = toSkipTake(page);

  const [reviews, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.review.count({ where }),
    ]),
  );

  return { reviews, total };
}

/** Highest-rated recent reviews, for the home page strip. */
export async function findHighlights(limit: number): Promise<Review[]> {
  return withDbRetry(() =>
    prisma.review.findMany({
      where: { rating: { gte: 4 } },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  );
}

export async function findById(id: string): Promise<Review | null> {
  return withDbRetry(() => prisma.review.findUnique({ where: { id } }));
}

export async function create(data: Prisma.ReviewCreateInput): Promise<Review> {
  return withDbRetry(() => prisma.review.create({ data }));
}

export async function update(
  id: string,
  data: Prisma.ReviewUpdateInput,
): Promise<Review> {
  return withDbRetry(() => prisma.review.update({ where: { id }, data }));
}

export async function remove(id: string): Promise<Review> {
  return withDbRetry(() => prisma.review.delete({ where: { id } }));
}

/** Average rating and count, for aggregate schema.org markup. */
export async function getRatingSummary(): Promise<{ average: number; count: number }> {
  const result = await withDbRetry(() =>
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  );

  return {
    average: Number(result._avg.rating ?? 0),
    count: result._count,
  };
}
