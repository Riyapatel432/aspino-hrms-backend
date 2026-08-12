import { Injectable, ConflictException } from '@nestjs/common';
import { TrainingRepository } from '../repositories/training.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../../common/utils/pagination.util';

export interface UpdateTrainingDto {
  employeeId?: string;
  trainingName?: string;
  trainingType?: string;
  completionDate?: string;
  expiryDate?: string;
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly prisma: PrismaService,
  ) { }

  async getTrainings(query: PaginationQueryDto & { employeeId?: string; trainingType?: string } = {}) {
    const res = await this.trainingRepository.findManyTrainings(query);
    return createPaginatedResponse(res.data, res.total, res.page, res.limit);
  }

  async createTraining(dto: {
    employeeId: string;
    trainingName: string;
    trainingType: string;
    completionDate: string;
    expiryDate?: string;
  }) {
    const compDate = new Date(dto.completionDate);
    const existing = await this.prisma.trainingRecord.findFirst({
      where: {
        employeeId: dto.employeeId,
        trainingName: { equals: dto.trainingName, mode: 'insensitive' },
        completionDate: compDate,
      },
    });
    if (existing) {
      throw new ConflictException(
        'A training record with this name and completion date already exists for this employee.',
      );
    }
    return this.trainingRepository.createTraining(dto);
  }

  async updateTraining(id: string, dto: UpdateTrainingDto) {
    if (dto.employeeId || dto.trainingName || dto.completionDate) {
      const current = await this.prisma.trainingRecord.findUnique({
        where: { id },
      });

      const empIdStr = dto.employeeId ?? current?.employeeId;
      const trainingNameStr = dto.trainingName ?? current?.trainingName;
      const dateStr = dto.completionDate ?? current?.completionDate;
      const compDate = dateStr ? new Date(dateStr) : undefined;

      if (empIdStr && trainingNameStr && compDate) {
        const existing = await this.prisma.trainingRecord.findFirst({
          where: {
            employeeId: empIdStr,
            trainingName: { equals: trainingNameStr, mode: 'insensitive' },
            completionDate: compDate,
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            'A training record with this name and completion date already exists for this employee.',
          );
        }
      }
    }
    return this.trainingRepository.updateTraining(id, dto);
  }

  async deleteTraining(id: string) {
    return this.trainingRepository.deleteTraining(id);
  }
}
