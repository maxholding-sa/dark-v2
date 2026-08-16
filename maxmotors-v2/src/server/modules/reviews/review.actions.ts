"use server";

import { revalidatePath } from "next/cache";
import * as service from "./review.service";
import { toResult, type Result } from "@/server/errors/result";
import type { ReviewDto } from "./review.types";

export async function createReviewAction(input: unknown): Promise<Result<ReviewDto>> {
  return toResult(async () => {
    const review = await service.createReview(input);
    revalidatePath("/reviews");
    revalidatePath("/admin/reviews");
    return review;
  });
}

export async function updateReviewAction(
  id: string,
  input: unknown,
): Promise<Result<ReviewDto>> {
  return toResult(async () => {
    const review = await service.updateReview(id, input);
    revalidatePath("/reviews");
    revalidatePath("/admin/reviews");
    return review;
  });
}

export async function deleteReviewAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteReview(id);
    revalidatePath("/reviews");
    revalidatePath("/admin/reviews");
    return { id };
  });
}
