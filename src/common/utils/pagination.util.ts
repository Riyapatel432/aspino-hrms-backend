import { PaginatedResult } from '../interfaces/pagination-response.interface';

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page?: number,
  limit?: number,
  message: string = 'Data fetched successfully.',
): PaginatedResult<T> {
  const isPaginated =
    page !== undefined &&
    limit !== undefined &&
    page !== null &&
    limit !== null;
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : total || 1;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));

  return {
    success: true,
    message,
    data,
    pagination: {
      page: isPaginated ? pageNum : 1,
      limit: isPaginated ? limitNum : total,
      total,
      totalPages: isPaginated ? totalPages : 1,
      hasNextPage: isPaginated ? pageNum < totalPages : false,
      hasPreviousPage: isPaginated ? pageNum > 1 : false,
    },
  };
}
