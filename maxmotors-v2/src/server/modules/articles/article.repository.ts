import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/server/db/prisma";
import { toSkipTake, type PageParams } from "@/lib/pagination";
import { buildSpellingVariants, tokenizeQuery } from "@/lib/search-text";
import type { ArticleQuery } from "./article.schema";
import type { ArticleWithAuthor } from "./article.types";

const withAuthor = { author: true } as const;

function buildWhere(
  query: ArticleQuery,
  publishedOnly: boolean,
): Prisma.ArticleWhereInput {
  const conditions: Prisma.ArticleWhereInput[] = [];

  if (publishedOnly) conditions.push({ published: true });
  if (query.tag) conditions.push({ tags: { has: query.tag } });

  const tokens = tokenizeQuery(query.search);
  if (tokens.length > 0) {
    conditions.push({
      AND: tokens.map((token) => ({
        OR: buildSpellingVariants(token).flatMap((variant) => [
          { title: { contains: variant, mode: "insensitive" as const } },
          { excerpt: { contains: variant, mode: "insensitive" as const } },
          { content: { contains: variant, mode: "insensitive" as const } },
        ]),
      })),
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function findMany(
  query: ArticleQuery,
  page: PageParams,
  { publishedOnly = true }: { publishedOnly?: boolean } = {},
): Promise<{ articles: ArticleWithAuthor[]; total: number }> {
  const where = buildWhere(query, publishedOnly);
  const { skip, take } = toSkipTake(page);

  const [articles, total] = await withDbRetry(() =>
    prisma.$transaction([
      prisma.article.findMany({
        where,
        include: withAuthor,
        // Drafts have no publishedAt, so fall back to creation order.
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]),
  );

  return { articles, total };
}

export async function findBySlug(slug: string): Promise<ArticleWithAuthor | null> {
  return withDbRetry(() =>
    prisma.article.findUnique({ where: { slug }, include: withAuthor }),
  );
}

export async function findById(id: string): Promise<ArticleWithAuthor | null> {
  return withDbRetry(() =>
    prisma.article.findUnique({ where: { id }, include: withAuthor }),
  );
}

/** Slugs of published articles, for the sitemap. */
export async function findPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return withDbRetry(() =>
    prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
  );
}

export async function findRelated(
  articleId: string,
  tags: string[],
  limit: number,
): Promise<ArticleWithAuthor[]> {
  return withDbRetry(() =>
    prisma.article.findMany({
      where: {
        id: { not: articleId },
        published: true,
        ...(tags.length > 0 ? { tags: { hasSome: tags } } : {}),
      },
      include: withAuthor,
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
  );
}

export async function create(
  data: Prisma.ArticleCreateInput,
): Promise<ArticleWithAuthor> {
  return withDbRetry(() => prisma.article.create({ data, include: withAuthor }));
}

export async function update(
  id: string,
  data: Prisma.ArticleUpdateInput,
): Promise<ArticleWithAuthor> {
  return withDbRetry(() =>
    prisma.article.update({ where: { id }, data, include: withAuthor }),
  );
}

export async function remove(id: string): Promise<void> {
  await withDbRetry(() => prisma.article.delete({ where: { id } }));
}

/** True when another article already holds this slug. */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const existing = await withDbRetry(() =>
    prisma.article.findUnique({ where: { slug }, select: { id: true } }),
  );

  return existing !== null && existing.id !== exceptId;
}

/** Distinct tags across published articles, for the filter row. */
export async function findTags(): Promise<string[]> {
  const rows = await withDbRetry(() =>
    prisma.article.findMany({ where: { published: true }, select: { tags: true } }),
  );

  return [...new Set(rows.flatMap((row) => row.tags))].sort();
}
