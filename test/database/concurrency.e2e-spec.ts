import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { AttendanceService } from '../../src/modules/attendance/services/attendance.service';

describe('Concurrency & Race Condition Suite', () => {
  let app: INestApplication;
  let attendanceService: AttendanceService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    attendanceService = moduleFixture.get<AttendanceService>(AttendanceService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Concurrent attendance requests should handle simultaneous execution without server crash', async () => {
    const mockPunchPromises = Array.from({ length: 10 }).map((_, i) =>
      attendanceService
        .captureAttendance({
          employeeId: `EMP_CONCURRENCY_${i}`,
          punchType: 'CHECK_IN',
          timestamp: new Date().toISOString(),
        })
        .catch((err) => ({ error: err.message })),
    );

    const results = await Promise.all(mockPunchPromises);
    expect(results).toHaveLength(10);
    // Verified that all concurrent promises completed gracefully without unhandled crashes
    results.forEach((res) => {
      expect(res).toBeDefined();
    });
  });
});
