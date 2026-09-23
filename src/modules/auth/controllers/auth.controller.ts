import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

@Controller(['auth', 'auth/admin'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Get('all-users')
  async getAllUsers(@Query() query: PaginationQueryDto & { role?: string }) {
    return this.authService.getAllUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  async getPermissions(@Request() req: any) {
    return this.authService.getUserPermissions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    const permissions = await this.authService.getUserPermissions(req.user.userId);
    return {
      message: 'Profile retrieved successfully',
      user: {
        ...req.user,
        ...permissions,
      },
      admin: {
        ...req.user,
        ...permissions,
      },
    };
  }
}
