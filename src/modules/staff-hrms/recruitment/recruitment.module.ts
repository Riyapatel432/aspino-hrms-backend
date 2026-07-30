import { Module } from '@nestjs/common';
import { RecruitmentController } from './controllers/recruitment.controller';
import { RecruitmentService } from './services/recruitment.service';
import { RecruitmentRepository } from './repositories/recruitment.repository';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, RecruitmentRepository],
  exports: [RecruitmentService, RecruitmentRepository],
})
export class RecruitmentModule {}
