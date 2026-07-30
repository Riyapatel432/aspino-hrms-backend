import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class TrainingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyTrainings() {
    return this.prisma.trainingRecord.findMany({
      include: { employee: true },
      orderBy: { completionDate: 'desc' },
    });
  }

  async createTraining(dto: { employeeId: string; trainingName: string; trainingType: string; completionDate: string; expiryDate?: string }) {
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

  async updateTraining(id: string, dto: any) {
    if (dto.completionDate) dto.completionDate = new Date(dto.completionDate);
    if (dto.expiryDate) dto.expiryDate = new Date(dto.expiryDate);
    return this.prisma.trainingRecord.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTraining(id: string) {
    return this.prisma.trainingRecord.delete({ where: { id } });
  }
}
