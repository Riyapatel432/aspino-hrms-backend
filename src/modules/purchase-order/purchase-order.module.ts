import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, PurchaseOrderPdfService],
  exports: [PurchaseOrderService, PurchaseOrderPdfService],
})
export class PurchaseOrderModule {}
