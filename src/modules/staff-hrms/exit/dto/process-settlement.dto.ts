import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessSettlementDto {
  @IsString({ message: 'Exit Process ID must be a string.' })
  @IsNotEmpty({ message: 'An exit process must be selected.' })
  exitProcessId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Pending salary must be a number.' })
  @Min(0, { message: 'Pending salary cannot be negative.' })
  pendingSalary: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Leave encashment must be a number.' })
  @Min(0, { message: 'Leave encashment cannot be negative.' })
  leaveEncashment: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Bonus must be a number.' })
  @Min(0, { message: 'Bonus cannot be negative.' })
  bonus: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Recoveries must be a number.' })
  @Min(0, { message: 'Recoveries cannot be negative.' })
  recoveries: number;
}
