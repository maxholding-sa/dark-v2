import "server-only";

import * as repository from "./review.repository";
import {
  reviewInputSchema,
  reviewUpdateSchema,
  reviewIdSchema,
  type ReviewQuery,
} from "./review.schema";
import {
  toReviewDto,
  toReviewDtos,
  type ReviewDto,
  type RatingSummary,
} from "./review.types";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { deleteFiles, storagePathFromUrl } from "@/server/db/storage";
import { paginate, type Paginated } from "@/lib/pagination";
import { logger } from "@/lib/logger";

/**
 * Reviews are editorial content, not user-submitted: a member of staff enters
 * them after a sale. There is deliberately no public "leave a review" action —
 * adding one would need moderation, rate limiting and spam handling that do not
 * exist yet.
 */

export async function listReviews(query: ReviewQuery): Promise<Paginated<ReviewDto>> {
  const { reviews, total } = await repository.findMany(query, {
    page: query.page,
    limit: query.limit,
  });

  return paginate(toReviewDtos(reviews), total, {
    page: query.page,
    limit: query.limit,
  });
}

export async function getReviewHighlights(limit = 6): Promise<ReviewDto[]> {
  return toReviewDtos(await repository.findHighlights(limit));
}

export async function getRatingSummary(): Promise<RatingSummary> {
  return repository.getRatingSummary();
}

export async function getReview(id: string): Promise<ReviewDto> {
  const review = await repository.findById(parseOrThrow(reviewIdSchema, id, "id"));
  if (!review) throw AppError.notFound("Review");

  return toReviewDto(review);
}

export async function createReview(input: unknown): Promise<ReviewDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const data = parseOrThrow(reviewInputSchema, input, "review");
  const review = await repository.create(data);

  logger.info("review.created", { reviewId: review.id });
  return toReviewDto(review);
}

export async function updateReview(id: string, input: unknown): Promise<ReviewDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const reviewId = parseOrThrow(reviewIdSchema, id, "id");
  const data = parseOrThrow(reviewUpdateSchema, input, "review");

  const existing = await repository.findById(reviewId);
  if (!existing) throw AppError.notFound("Review");

  const review = await repository.update(reviewId, data);

  // Clean up a replaced image so storage does not accumulate orphans.
  if (
    data.imageUrl !== undefined &&
    existing.imageUrl &&
    existing.imageUrl !== data.imageUrl
  ) {
    const path = storagePathFromUrl(existing.imageUrl);
    if (path) await deleteFiles([path]);
  }

  return toReviewDto(review);
}

export async function deleteReview(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const reviewId = parseOrThrow(reviewIdSchema, id, "id");
  const review = await repository.findById(reviewId);
  if (!review) throw AppError.notFound("Review");

  await repository.remove(reviewId);

  if (review.imageUrl) {
    const path = storagePathFromUrl(review.imageUrl);
    if (path) await deleteFiles([path]);
  }

  logger.info("review.deleted", { reviewId });
}
