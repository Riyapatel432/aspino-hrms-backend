import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      loginAdmin: jest.fn().mockResolvedValue({
        message: 'Login successful',
        access_token: 'token',
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@test.com',
          role: 'admin',
        },
      }),
      forgotPassword: jest
        .fn()
        .mockResolvedValue({ message: 'Reset token sent' }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed successfully' }),
      getAllUsers: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.loginAdmin on login', async () => {
    const dto = { email: 'admin@test.com', password: 'password123' };
    const res = await controller.login(dto);
    expect(authService.loginAdmin).toHaveBeenCalledWith(dto);
    expect(res.access_token).toBe('token');
  });

  it('should call authService.forgotPassword', async () => {
    const dto = { email: 'admin@test.com' };
    const res = await controller.forgotPassword(dto);
    expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Reset token sent');
  });

  it('should call authService.changePassword with req user id', async () => {
    const req = { user: { userId: 'user-123' } };
    const dto = { currentPassword: 'old', newPassword: 'new' };
    const res = await controller.changePassword(req, dto);
    expect(authService.changePassword).toHaveBeenCalledWith('user-123', dto);
    expect(res.message).toBe('Password changed successfully');
  });

  it('should return profile for authenticated user', () => {
    const req = { user: { userId: 'user-123', role: 'admin' } };
    const res = controller.getProfile(req);
    expect(res.user.userId).toBe('user-123');
  });
});
