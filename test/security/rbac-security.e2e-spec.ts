import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';

describe('Security & RBAC Test Suite', () => {
  let app: INestApplication;
  let simulatedRole: string = 'employee';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: 'mock-user-id', role: simulatedRole };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Employee role should be FORBIDDEN (403) from accessing admin-restricted Attendance Shift settings', async () => {
    simulatedRole = 'employee';

    await request(app.getHttpServer())
      .post('/staff-hrms/attendance/shifts')
      .send({
        name: 'Unauthorized Shift',
        startTime: '09:00',
        endTime: '17:00',
      })
      .expect(403);
  });

  it('2. HR role should be ALLOWED to access Attendance Shifts endpoint', async () => {
    simulatedRole = 'hr';

    const res = await request(app.getHttpServer()).get(
      '/staff-hrms/attendance/shifts',
    );
    expect(res.status).not.toBe(403);
  });

  it('3. Admin role should be ALLOWED to access Attendance Shifts endpoint', async () => {
    simulatedRole = 'admin';

    const res = await request(app.getHttpServer()).get(
      '/staff-hrms/attendance/shifts',
    );
    expect(res.status).not.toBe(403);
  });
});
