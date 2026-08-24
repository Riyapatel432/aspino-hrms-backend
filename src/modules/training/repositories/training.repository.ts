import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, TrainingStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyTrainings(
    query: PaginationQueryDto & {
      employeeId?: string;
      trainingType?: string;
    } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TrainingRecordWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      const searchUpper = query.search.toUpperCase().trim();
      const isValidStatus = Object.values(TrainingStatus).includes(
        searchUpper as any,
      );
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { trainingName: { contains: query.search, mode: 'insensitive' } },
        {
          trainingType: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
        ...(isValidStatus ? [{ status: searchUpper as TrainingStatus }] : []),
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.trainingType && query.trainingType !== 'ALL') {
      where.trainingTypeId = query.trainingType;
    }

    const allowedTrainSortFields = [
      'trainingName',
      'trainingType',
      'completionDate',
      'expiryDate',
      'status',
    ];
    const orderBy: any = {};
    if (query.sortBy && allowedTrainSortFields.includes(query.sortBy)) {
      if (query.sortBy === 'trainingType') {
        orderBy.trainingType = {
          name: (query.sortOrder || 'desc').toLowerCase(),
        };
      } else {
        orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
      }
    } else {
      orderBy.completionDate = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.trainingRecord.findMany({
        where,
        skip,
        take: limit,
        include: { employee: true, trainingType: true },
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
    let tType = await this.prisma.trainingType.findFirst({
      where: { name: { equals: dto.trainingType, mode: 'insensitive' } },
    });
    if (!tType) {
      tType = await this.prisma.trainingType.create({
        data: { name: dto.trainingType },
      });
    }
    return this.prisma.trainingRecord.create({
      data: {
        employeeId: dto.employeeId,
        trainingName: dto.trainingName,
        trainingTypeId: tType.id,
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
    if (dto.trainingType) {
      let tType = await this.prisma.trainingType.findFirst({
        where: { name: { equals: dto.trainingType, mode: 'insensitive' } },
      });
      if (!tType) {
        tType = await this.prisma.trainingType.create({
          data: { name: dto.trainingType },
        });
      }
      data.trainingType = { connect: { id: tType.id } };
    }
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
