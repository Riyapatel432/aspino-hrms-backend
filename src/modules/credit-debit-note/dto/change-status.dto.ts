import { IsEnum, IsNotEmpty } from 'class-validator';
import { NoteStatusDto } from './create-credit-debit-note.dto';

export class ChangeNoteStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(NoteStatusDto, { message: 'Invalid status value' })
  status: NoteStatusDto;
}
