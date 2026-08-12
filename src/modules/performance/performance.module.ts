import { Module } from '@nestjs/common';
import { PerformanceController } from './controllers/performance.controller';
import { PerformanceService } from './services/performance.service';
import { PerformanceRepository } from './repositories/performance.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, PerformanceRepository],
  exports: [PerformanceService, PerformanceRepository],
})
export class PerformanceModule {}
