/**
 * One pagination shape for every list endpoint. v1 returned `{ cars, total }`
 * from one action, `{ data, pagination: { pages } }` from another, and a bare
 * array from a third, so no list UI could be reused.
 */

export interface PageParams {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 60;

/** Converts page/limit into Prisma's skip/take. */
export function toSkipTake({ page, limit }: PageParams): { skip: number; take: number } {
  return { skip: Math.max(0, (page - 1) * limit), take: limit };
}

export function paginate<T>(items: T[], total: number, params: PageParams): Paginated<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrevious: params.page > 1,
  };
}
