import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../users/repositories/user.repository';
import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async loginAdmin(loginDto: AdminLoginDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.roleRelation ? user.roleRelation.name : user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const permissionData = await this.caslAbilityFactory.getUserPermissionsPayload(user.id);

    return {
      message: 'Login successful',
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.roleRelation ? user.roleRelation.name : user.role,
        roleDisplayName: user.roleRelation?.displayName || user.role,
      },
      ...permissionData,
    };
  }

  async getUserPermissions(userId: string) {
    return this.caslAbilityFactory.getUserPermissionsPayload(userId);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedPassword);

    return {
      message: 'Password updated successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, newPassword } = forgotPasswordDto;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePasswordByEmail(email, hashedPassword);

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }

  async getAllUsers(query: PaginationQueryDto & { role?: string } = {}) {
    const res = await this.userRepository.findAll(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }
}
