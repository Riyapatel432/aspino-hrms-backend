import { Module } from '@nestjs/common';
import { QcSpecificationController } from './qc-specification.controller';
import { QcSpecificationService } from './qc-specification.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QcSpecificationController],
  providers: [QcSpecificationService],
  exports: [QcSpecificationService],
})
export class QcSpecificationModule {}
