import type { Review } from "@prisma/client";

export interface ReviewDto {
  id: string;
  clientName: string;
  city: string;
  car: string;
  rating: number;
  reviewText: string;
  videoUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export function toReviewDto(review: Review): ReviewDto {
  return {
    id: review.id,
    clientName: review.clientName,
    city: review.city,
    car: review.car,
    rating: review.rating,
    reviewText: review.reviewText,
    videoUrl: review.videoUrl,
    imageUrl: review.imageUrl,
    createdAt: review.createdAt.toISOString(),
  };
}

export function toReviewDtos(reviews: Review[]): ReviewDto[] {
  return reviews.map(toReviewDto);
}
