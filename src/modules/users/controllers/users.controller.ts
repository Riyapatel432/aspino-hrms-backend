import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('create', 'users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @RequirePermission('read', 'users')
  findAll(@Query() query: PaginationQueryDto & { role?: string }) {
    return this.usersService.getAllUsers(query);
  }

  @Get(':id')
  @RequirePermission('read', 'users')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'users')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch(':id/role')
  @RequirePermission('manage', 'users')
  assignRole(@Param('id') id: string, @Body('roleId') roleId: string) {
    return this.usersService.assignRole(id, roleId);
  }

  @Delete(':id')
  @RequirePermission('delete', 'users')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
