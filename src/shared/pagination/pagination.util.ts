import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponse } from './paginated-response';

export type PaginationOptions = {
  page?: number;
  limit?: number;
};

/** Clamp page/limit to sane bounds (`page >= 1`, `1 <= limit <= 100`). */
export function resolvePagination(options: PaginationOptions = {}): {
  page: number;
  skip: number;
  limit: number;
} {
  const rawPage = Number(options.page ?? 1);
  const rawLimit = Number(options.limit ?? 10);
  const page = Math.max(1, Math.trunc(Number.isFinite(rawPage) ? rawPage : 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.trunc(Number.isFinite(rawLimit) ? rawLimit : 10)),
  );
  return { page, skip: (page - 1) * limit, limit };
}

function createMeta(
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<never>['meta'] {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function buildPaginationMeta(
  total: number,
  options: PaginationOptions = {},
): PaginatedResponse<never>['meta'] {
  const { page, limit } = resolvePagination(options);
  return createMeta(total, page, limit);
}

/** Apply skip/take to a query builder and return `{ items, meta }`. */
export async function paginateQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  options: PaginationOptions = {},
): Promise<PaginatedResponse<T>> {
  const { page, skip, limit } = resolvePagination(options);
  qb.skip(skip).take(limit);
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: createMeta(total, page, limit) };
}

export function paginateArray<T>(
  items: T[],
  options: PaginationOptions = {},
): PaginatedResponse<T> {
  const { page, skip, limit } = resolvePagination(options);
  return {
    items: items.slice(skip, skip + limit),
    meta: createMeta(items.length, page, limit),
  };
}
