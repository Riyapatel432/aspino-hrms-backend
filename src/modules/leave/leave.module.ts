import { Module } from '@nestjs/common';
import { LeaveController } from './controllers/leave.controller';
import { LeaveService } from './services/leave.service';
import { LeaveRepository } from './repositories/leave.repository';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository],
  exports: [LeaveService, LeaveRepository],
})
export class LeaveModule {}
