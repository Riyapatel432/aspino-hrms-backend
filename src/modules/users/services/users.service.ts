import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { Prisma, User } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email.toLowerCase().trim());
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.userRepository.create({
      ...data,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
    });
  }

  async getAllUsers(query: PaginationQueryDto & { role?: string } = {}) {
    const res = await this.userRepository.findAll(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    if (data.email && typeof data.email === 'string') {
      data.email = data.email.toLowerCase().trim();
    }
    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<User> {
    return this.userRepository.delete(id);
  }
}
