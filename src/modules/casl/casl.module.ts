import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PermissionGuard } from './guards/permission.guard';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CaslAbilityFactory, PermissionGuard],
  exports: [CaslAbilityFactory, PermissionGuard],
})
export class CaslModule {}
