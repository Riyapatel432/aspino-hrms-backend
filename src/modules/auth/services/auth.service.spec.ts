import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-123',
    name: 'Admin User',
    email: 'admin@aspino.com',
    password: 'hashed_password',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
      findAll: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt_token_xyz'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginAdmin', () => {
    it('should successfully log in a valid user', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginAdmin({
        email: 'admin@aspino.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('access_token', 'jwt_token_xyz');
      expect(result.user).toEqual({
        id: 'user-123',
        name: 'Admin User',
        email: 'admin@aspino.com',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.loginAdmin({
          email: 'notfound@aspino.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.loginAdmin({
          email: 'admin@aspino.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      userRepository.updatePassword.mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      });

      const result = await service.changePassword('user-123', {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
      });

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        'new_hashed_password',
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('invalid-id', {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password does not match', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'WrongCurrentPassword',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
