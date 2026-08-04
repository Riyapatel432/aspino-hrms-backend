import { Module } from '@nestjs/common';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { PerformanceModule } from './performance/performance.module';
import { TrainingModule } from './training/training.module';
import { ExitModule } from './exit/exit.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    RecruitmentModule,
    OnboardingModule,
    AttendanceModule,
    LeaveModule,
    PerformanceModule,
    TrainingModule,
    ExitModule,
    AuditModule,
  ],
  exports: [
    RecruitmentModule,
    OnboardingModule,
    AttendanceModule,
    LeaveModule,
    PerformanceModule,
    TrainingModule,
    ExitModule,
    AuditModule,
  ],
})
export class StaffHrmsModule { }
