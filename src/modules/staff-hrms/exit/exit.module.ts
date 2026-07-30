import { Module } from '@nestjs/common';
import { ExitController } from './controllers/exit.controller';
import { ExitService } from './services/exit.service';
import { ExitRepository } from './repositories/exit.repository';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExitController],
  providers: [ExitService, ExitRepository],
  exports: [ExitService, ExitRepository],
})
export class ExitModule {}
