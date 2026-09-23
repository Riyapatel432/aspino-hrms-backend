import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';

import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { ExitModule } from './modules/exit/exit.module';
import { LeaveModule } from './modules/leave/leave.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { TrainingModule } from './modules/training/training.module';
import { CaslModule } from './modules/casl/casl.module';
import { RolesModule } from './modules/roles/roles.module';

import { GatePassModule } from './modules/gate-pass/gate-pass.module';
import { PassCategoryModule } from './modules/pass-category/pass-category.module';
import { BankModule } from './modules/bank/bank.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductCategoryModule } from './modules/product-category/product-category.module';
import { ProductSubCategoryModule } from './modules/product-sub-category/product-sub-category.module';
import { ProductModule } from './modules/product/product.module';
import { UomModule } from './modules/uom/uom.module';
import { PackingMaterialModule } from './modules/packing-material/packing-material.module';
import { QcSpecificationModule } from './modules/qc-specification/qc-specification.module';
import { StorageLocationModule } from './modules/storage-location/storage-location.module';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    RolesModule,
    UsersModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    AuditModule,
    ExitModule,
    LeaveModule,
    OnboardingModule,
    PayrollModule,
    PerformanceModule,
    RecruitmentModule,
    TrainingModule,
    GatePassModule,
    PassCategoryModule,
    BankModule,
    SupplierModule,
    VendorModule,
    CustomerModule,
    ProductCategoryModule,
    ProductSubCategoryModule,
    ProductModule,
    UomModule,
    PackingMaterialModule,
    QcSpecificationModule,
    StorageLocationModule,
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
