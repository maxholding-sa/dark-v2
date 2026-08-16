import "server-only";

import type { Prisma } from "@prisma/client";
import * as repository from "./article.repository";
import {
  articleInputSchema,
  articleUpdateSchema,
  articleIdSchema,
  articleSlugSchema,
  type ArticleQuery,
} from "./article.schema";
import {
  toArticleDto,
  toArticleSummaryDtos,
  type ArticleDto,
  type ArticleSummaryDto,
} from "./article.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission, requireUser } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { paginate, type Paginated } from "@/lib/pagination";
import { slugify } from "@/lib/format";
import { logger } from "@/lib/logger";

/**
 * Slugs are permanent URLs. Once an article is published its slug is never
 * regenerated from a retitled heading — that would break every inbound link and
 * every share. A new slug has to be set deliberately.
 */
async function resolveSlug(
  requested: string | undefined,
  title: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(requested || title);
  if (!base) throw AppError.validation("Cannot derive a slug from this title");

  if (!(await repository.slugTaken(base, exceptId))) return base;

  // Append a counter rather than a random suffix, so slugs stay readable.
  for (let suffix = 2; suffix <= 50; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!(await repository.slugTaken(candidate, exceptId))) return candidate;
  }

  throw AppError.conflict("Could not allocate a unique slug");
}

// --- Reads -----------------------------------------------------------------

export async function listArticles(
  query: ArticleQuery,
): Promise<Paginated<ArticleSummaryDto>> {
  const { articles, total } = await repository.findMany(query, {
    page: query.page,
    limit: query.limit,
  });

  return paginate(toArticleSummaryDtos(articles), total, {
    page: query.page,
    limit: query.limit,
  });
}

export async function listArticlesForAdmin(
  query: ArticleQuery,
): Promise<Paginated<ArticleSummaryDto>> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { articles, total } = await repository.findMany(
    query,
    { page: query.page, limit: query.limit },
    { publishedOnly: false },
  );

  return paginate(toArticleSummaryDtos(articles), total, {
    page: query.page,
    limit: query.limit,
  });
}

/** Public read — an unpublished article is a 404, not a 403. */
export async function getPublishedArticle(slug: string): Promise<ArticleDto> {
  const article = await repository.findBySlug(parseOrThrow(articleSlugSchema, slug, "slug"));

  if (!article || !article.published) throw AppError.notFound("Article");

  return toArticleDto(article);
}

export async function getArticleForAdmin(id: string): Promise<ArticleDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const article = await repository.findById(parseOrThrow(articleIdSchema, id, "id"));
  if (!article) throw AppError.notFound("Article");

  return toArticleDto(article);
}

export async function getRelatedArticles(
  articleId: string,
  tags: string[],
  limit = 3,
): Promise<ArticleSummaryDto[]> {
  return toArticleSummaryDtos(await repository.findRelated(articleId, tags, limit));
}

export async function getArticleTags(): Promise<string[]> {
  return repository.findTags();
}

export async function getPublishedArticleSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return repository.findPublishedSlugs();
}

// --- Writes ----------------------------------------------------------------

export async function createArticle(input: unknown): Promise<ArticleDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const author = await requireUser();

  const data = parseOrThrow(articleInputSchema, input, "article");
  const slug = await resolveSlug(data.slug, data.title);

  const article = await repository.create({
    title: data.title,
    slug,
    content: data.content,
    contentSections: data.contentSections as unknown as Prisma.InputJsonValue,
    excerpt: data.excerpt ?? null,
    image: data.image ?? null,
    tags: data.tags,
    published: data.published,
    // Set on first publish only — it is the article's public date.
    publishedAt: data.published ? new Date() : null,
    author: { connect: { id: author.id } },
  });

  logger.info("article.created", { articleId: article.id, slug });
  return toArticleDto(article);
}

export async function updateArticle(id: string, input: unknown): Promise<ArticleDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const articleId = parseOrThrow(articleIdSchema, id, "id");
  const data = parseOrThrow(articleUpdateSchema, input, "article");

  const existing = await repository.findById(articleId);
  if (!existing) throw AppError.notFound("Article");

  const update: Prisma.ArticleUpdateInput = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.content !== undefined) update.content = data.content;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.image !== undefined) update.image = data.image;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.contentSections !== undefined) {
    update.contentSections = data.contentSections as unknown as Prisma.InputJsonValue;
  }

  // Only re-slug on an explicit request, never as a side effect of a retitle.
  if (data.slug !== undefined) {
    update.slug = await resolveSlug(data.slug, data.title ?? existing.title, articleId);
  }

  if (data.published !== undefined) {
    update.published = data.published;
    // Stamp the publish date the first time it goes live; unpublishing and
    // republishing keeps the original date rather than backdating the article.
    if (data.published && !existing.publishedAt) update.publishedAt = new Date();
  }

  const article = await repository.update(articleId, update);
  logger.info("article.updated", { articleId, fields: Object.keys(update) });

  return toArticleDto(article);
}

export async function deleteArticle(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const articleId = parseOrThrow(articleIdSchema, id, "id");
  const existing = await repository.findById(articleId);
  if (!existing) throw AppError.notFound("Article");

  await repository.remove(articleId);
  logger.info("article.deleted", { articleId });
}
