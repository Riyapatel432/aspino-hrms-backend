import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an activity log record.
   * Runs in a try-catch to ensure logging failures never crash primary API operations.
   */
  async createLog(data: Prisma.ActivityLogUncheckedCreateInput) {
    try {
      return await this.prisma.activityLog.create({ data });
    } catch (error) {
      this.logger.error(
        `Failed to create activity log: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Fetch activity logs with pagination and filters
   */
  async getLogs(
    query: PaginationQueryDto & {
      userEmail?: string;
      action?: string;
      entityType?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

    if (query.search) {
      where.OR = [
        { userEmail: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { method: { contains: query.search, mode: 'insensitive' } },
        { ip: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.userEmail) {
      where.userEmail = {
        contains: query.userEmail,
        mode: 'insensitive',
      };
    }

    if (query.action) {
      where.action = {
        contains: query.action,
        mode: 'insensitive',
      };
    }

    if (query.entityType) {
      where.entityType = {
        equals: query.entityType,
      };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const date = new Date(query.endDate);
        date.setHours(23, 59, 59, 999);
        where.createdAt.lte = date;
      }
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }
}
