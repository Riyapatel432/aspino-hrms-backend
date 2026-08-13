import { Module } from '@nestjs/common';
import { EmployeesController } from './controllers/employees.controller';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
