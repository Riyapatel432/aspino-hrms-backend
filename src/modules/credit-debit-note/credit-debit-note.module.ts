import { Module } from '@nestjs/common';
import { CreditDebitNoteService } from './credit-debit-note.service';
import { CreditDebitNoteController } from './credit-debit-note.controller';
import { CreditDebitNotePdfService } from './credit-debit-note-pdf.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditDebitNoteController],
  providers: [CreditDebitNoteService, CreditDebitNotePdfService],
  exports: [CreditDebitNoteService],
})
export class CreditDebitNoteModule {}
