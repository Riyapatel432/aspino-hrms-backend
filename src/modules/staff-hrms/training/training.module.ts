import { Module } from '@nestjs/common';
import { TrainingController } from './controllers/training.controller';
import { TrainingService } from './services/training.service';
import { TrainingRepository } from './repositories/training.repository';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingController],
  providers: [TrainingService, TrainingRepository],
  exports: [TrainingService, TrainingRepository],
})
export class TrainingModule {}
