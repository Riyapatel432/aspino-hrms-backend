import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Sanity Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Sanity: Master Bank API should respond with JSON array or handle auth', async () => {
    const res = await request(app.getHttpServer()).get(
      '/staff-hrms/payroll/banks',
    );
    expect([200, 401, 403]).toContain(res.status);
  });

  it('Sanity: Non-existent endpoint should return 404', async () => {
    await request(app.getHttpServer())
      .get('/non-existent-erp-route-xyz')
      .expect(404);
  });
});
