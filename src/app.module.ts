import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeesController } from './employees.controller';
import { PrismaModule } from './database/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { ExitModule } from './modules/exit/exit.module';
import { LeaveModule } from './modules/leave/leave.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { TrainingModule } from './modules/training/training.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AttendanceModule,
    AuditModule,
    ExitModule,
    LeaveModule,
    OnboardingModule,
    PayrollModule,
    PerformanceModule,
    RecruitmentModule,
    TrainingModule,
    RouterModule.register([
      {
        path: 'staff-hrms',
        children: [
          AttendanceModule,
          AuditModule,
          ExitModule,
          LeaveModule,
          OnboardingModule,
          PayrollModule,
          PerformanceModule,
          RecruitmentModule,
          TrainingModule,
        ],
      },
    ]),
  ],
  controllers: [AppController, EmployeesController],
  providers: [AppService],
})
export class AppModule { }
