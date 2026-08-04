import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StaffHrmsModule } from './modules/staff-hrms/staff-hrms.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, StaffHrmsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
