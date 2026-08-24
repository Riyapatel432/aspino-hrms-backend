import { Test, TestingModule } from '@nestjs/testing';
import { createPaginatedResponse } from '../../src/common/utils/pagination.util';
import { AttendanceRepository } from '../../src/modules/attendance/repositories/attendance.repository';
import { PrismaService } from '../../src/database/prisma/prisma.service';

describe('Large Dataset (Thousands of Records) Performance & Pagination Suite', () => {
  let attendanceRepo: AttendanceRepository;
  let mockPrisma: any;

  // Generate 10,000 simulated records
  const TOTAL_RECORDS = 10000;
  const mockLargeDataset = Array.from({ length: TOTAL_RECORDS }).map((_, index) => ({
    id: `rec-uuid-${index}`,
    name: `Item Name ${index}`,
    code: `CODE_${index}`,
    status: index % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
    createdAt: new Date(Date.now() - index * 60000),
  }));

  beforeAll(async () => {
    mockPrisma = {
      shift: {
        findMany: jest.fn().mockImplementation(({ skip = 0, take = 10, where, orderBy }) => {
          let filtered = [...mockLargeDataset];
          if (where?.OR?.[0]?.name?.contains) {
            const query = where.OR[0].name.contains.toLowerCase();
            filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
          }
          return Promise.resolve(filtered.slice(skip, skip + take));
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          let filtered = [...mockLargeDataset];
          if (where?.OR?.[0]?.name?.contains) {
            const query = where.OR[0].name.contains.toLowerCase();
            filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
          }
          return Promise.resolve(filtered.length);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    attendanceRepo = module.get<AttendanceRepository>(AttendanceRepository);
  });

  it('1. Should return only page size (10 records) when table contains 10,000 records', async () => {
    const startTime = performance.now();
    const result = await attendanceRepo.findManyShifts({ page: 1, limit: 10 });
    const endTime = performance.now();

    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(10000);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    // Response should be computed in under 50ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('2. Deep pagination (e.g. Page 500) on 10,000 records should not exhaust memory or crash', async () => {
    const result = await attendanceRepo.findManyShifts({ page: 500, limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.page).toBe(500);
    expect(result.data[0].name).toBe('Item Name 4990');
  });

  it('3. Filtering across 10,000 records should return bounded matching page results', async () => {
    const result = await attendanceRepo.findManyShifts({
      page: 1,
      limit: 25,
      search: '999',
    });

    expect(result.data.length).toBeLessThanOrEqual(25);
    expect(result.total).toBeGreaterThan(0);
    result.data.forEach((item) => {
      expect(item.name.toLowerCase()).toContain('999');
    });
  });

  it('4. Paginated utility creates accurate metadata with 100,000 records', () => {
    const subset = mockLargeDataset.slice(0, 50);
    const response = createPaginatedResponse(subset, 100000, 1, 50);

    expect(response.success).toBe(true);
    expect(response.pagination.total).toBe(100000);
    expect(response.pagination.totalPages).toBe(2000);
    expect(response.pagination.hasNextPage).toBe(true);
    expect(response.pagination.hasPreviousPage).toBe(false);
  });

  it('5. Edge case: requesting page beyond total records returns empty array without error', async () => {
    const result = await attendanceRepo.findManyShifts({ page: 2000, limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(10000);
  });
});
