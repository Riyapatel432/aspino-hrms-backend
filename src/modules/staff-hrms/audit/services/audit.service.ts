import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create an activity log record.
   * Runs in a try-catch to ensure logging failures never crash primary API operations.
   */
  async createLog(data: Prisma.ActivityLogCreateInput) {
    try {
      return await this.prisma.activityLog.create({ data });
    } catch (error) {
      this.logger.error(`Failed to create activity log: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * Fetch activity logs with pagination and filters
   */
  async getLogs(query: {
    userEmail?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
    page?: string;
  }) {
    const limit = Math.min(1000, parseInt(query.limit || '500', 10));
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

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
        // Set end date to end of the day (23:59:59.999)
        const date = new Date(query.endDate);
        date.setHours(23, 59, 59, 999);
        where.createdAt.lte = date;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
