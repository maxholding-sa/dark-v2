"use server";

import { revalidatePath } from "next/cache";
import * as service from "./article.service";
import { toResult, type Result } from "@/server/errors/result";
import type { ArticleDto } from "./article.types";

function revalidateArticle(slug?: string): void {
  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  if (slug) revalidatePath(`/articles/${slug}`);
}

export async function createArticleAction(input: unknown): Promise<Result<ArticleDto>> {
  return toResult(async () => {
    const article = await service.createArticle(input);
    revalidateArticle(article.slug);
    return article;
  });
}

export async function updateArticleAction(
  id: string,
  input: unknown,
): Promise<Result<ArticleDto>> {
  return toResult(async () => {
    const article = await service.updateArticle(id, input);
    revalidateArticle(article.slug);
    return article;
  });
}

export async function deleteArticleAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteArticle(id);
    revalidateArticle();
    return { id };
  });
}
