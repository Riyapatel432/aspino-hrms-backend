import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfService],
  exports: [InvoiceService, InvoicePdfService],
})
export class InvoiceModule {}
