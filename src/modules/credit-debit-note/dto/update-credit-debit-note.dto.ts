import { PartialType } from '@nestjs/mapped-types';
import { CreateCreditDebitNoteDto } from './create-credit-debit-note.dto';

export class UpdateCreditDebitNoteDto extends PartialType(CreateCreditDebitNoteDto) {}
