import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { QuotationPdfService } from './quotation-pdf.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [QuotationController],
  providers: [QuotationService, QuotationPdfService],
  exports: [QuotationService, QuotationPdfService],
})
export class QuotationModule {}
