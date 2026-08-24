import { createPaginatedResponse } from './pagination.util';

describe('PaginationUtil', () => {
  it('should create valid unpaginated response structure', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const res = createPaginatedResponse(data, 2);

    expect(res.success).toBe(true);
    expect(res.data).toEqual(data);
    expect(res.pagination.total).toBe(2);
    expect(res.pagination.hasNextPage).toBe(false);
  });

  it('should create valid paginated response with pages', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const res = createPaginatedResponse(data, 10, 1, 2);

    expect(res.success).toBe(true);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(2);
    expect(res.pagination.totalPages).toBe(5);
    expect(res.pagination.hasNextPage).toBe(true);
    expect(res.pagination.hasPreviousPage).toBe(false);
  });

  it('should handle edge cases with 0 total and negative page numbers', () => {
    const res = createPaginatedResponse([], 0, -1, 0);
    expect(res.success).toBe(true);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.total).toBe(0);
  });
});
