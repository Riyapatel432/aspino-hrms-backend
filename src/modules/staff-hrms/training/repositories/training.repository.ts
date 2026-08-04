import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyTrainings() {
    return this.prisma.trainingRecord.findMany({
      include: { employee: true },
      orderBy: { completionDate: 'desc' },
    });
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
