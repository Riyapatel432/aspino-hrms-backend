import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserRepository } from '../../src/modules/users/repositories/user.repository';

describe('Smoke Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserRepository)
      .useValue({
        findByEmail: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
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

  it('1. Application should start and respond to root health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('2. Unauthenticated access to protected profile should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/auth/profile').expect(401);
  });

  it('3. Login with invalid format should return appropriate error', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'invalid@example.com', password: 'wrong' })
      .expect(401);
  });
});
