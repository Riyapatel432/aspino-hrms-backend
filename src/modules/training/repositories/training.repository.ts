import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyTrainings(
    query: PaginationQueryDto & { employeeId?: string; trainingType?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TrainingRecordWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { trainingName: { contains: query.search, mode: 'insensitive' } },
        { trainingType: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.trainingType && query.trainingType !== 'ALL') {
      where.trainingType = query.trainingType;
    }

    const allowedTrainSortFields = ['trainingName', 'trainingType', 'completionDate', 'expiryDate', 'status'];
    const orderBy: any = {};
    if (query.sortBy && allowedTrainSortFields.includes(query.sortBy)) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.completionDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.trainingRecord.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true },
        orderBy,
      }),
      this.prisma.trainingRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createTraining(dto: {
    employeeId: string;
    trainingName: string;
    trainingType: string;
    completionDate: string;
    expiryDate?: string;
  }) {
    return this.prisma.trainingRecord.create({
      data: {
        employeeId: dto.employeeId,
        trainingName: dto.trainingName,
        trainingType: dto.trainingType,
        completionDate: new Date(dto.completionDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }

  async updateTraining(
    id: string,
    dto: {
      employeeId?: string;
      trainingName?: string;
      trainingType?: string;
      completionDate?: string;
      expiryDate?: string;
    },
  ) {
    const data: Prisma.TrainingRecordUpdateInput = {};
    if (dto.employeeId) {
      data.employee = { connect: { id: dto.employeeId } };
    }
    if (dto.trainingName) data.trainingName = dto.trainingName;
    if (dto.trainingType) data.trainingType = dto.trainingType;
    if (dto.completionDate) data.completionDate = new Date(dto.completionDate);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);

    return this.prisma.trainingRecord.update({
      where: { id },
      data,
    });
  }

  async deleteTraining(id: string) {
    return this.prisma.trainingRecord.delete({ where: { id } });
  }
}
