import { Injectable } from '@nestjs/common';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class TrainingService {
  constructor(private readonly trainingRepository: TrainingRepository) {}

  async getTrainings() {
    return this.trainingRepository.findManyTrainings();
  }

  async createTraining(dto: { employeeId: string; trainingName: string; trainingType: string; completionDate: string; expiryDate?: string }) {
    return this.trainingRepository.createTraining(dto);
  }

  async updateTraining(id: string, dto: any) {
    return this.trainingRepository.updateTraining(id, dto);
  }

  async deleteTraining(id: string) {
    return this.trainingRepository.deleteTraining(id);
  }
}
