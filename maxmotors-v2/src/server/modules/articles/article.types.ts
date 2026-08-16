import type { Article, User } from "@prisma/client";
import { parseContentSections, type ContentSection } from "./article.schema";

export interface ArticleAuthorDto {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

export interface ArticleDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentSections: ContentSection[];
  excerpt: string | null;
  image: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: ArticleAuthorDto | null;
}

/** List view — omits the body so a listing does not ship every article's text. */
export interface ArticleSummaryDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  author: ArticleAuthorDto | null;
}

export type ArticleWithAuthor = Article & { author: User | null };

function toAuthorDto(author: User | null): ArticleAuthorDto | null {
  return author ? { id: author.id, name: author.name, imageUrl: author.imageUrl } : null;
}

export function toArticleDto(article: ArticleWithAuthor): ArticleDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    contentSections: parseContentSections(article.contentSections),
    excerpt: article.excerpt,
    image: article.image,
    tags: article.tags,
    published: article.published,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    author: toAuthorDto(article.author),
  };
}

export function toArticleSummaryDto(article: ArticleWithAuthor): ArticleSummaryDto {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    image: article.image,
    tags: article.tags,
    published: article.published,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    author: toAuthorDto(article.author),
  };
}

export function toArticleSummaryDtos(articles: ArticleWithAuthor[]): ArticleSummaryDto[] {
  return articles.map(toArticleSummaryDto);
}

export type { ContentSection };
