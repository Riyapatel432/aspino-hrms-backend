import { Module } from '@nestjs/common';
import { DeliveryChallanService } from './delivery-challan.service';
import { DeliveryChallanController } from './delivery-challan.controller';
import { DeliveryChallanPdfService } from './delivery-challan-pdf.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryChallanController],
  providers: [DeliveryChallanService, DeliveryChallanPdfService],
  exports: [DeliveryChallanService],
})
export class DeliveryChallanModule {}
