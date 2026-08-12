import { Module } from '@nestjs/common';
import { ExitController } from './controllers/exit.controller';
import { ExitService } from './services/exit.service';
import { ExitRepository } from './repositories/exit.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
  imports: [PrismaModule, PayrollModule],
  controllers: [ExitController],
  providers: [ExitService, ExitRepository],
  exports: [ExitService, ExitRepository],
})
export class ExitModule {}
