import { Module } from '@nestjs/common';
import { PackingMaterialController } from './packing-material.controller';
import { PackingMaterialService } from './packing-material.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PackingMaterialController],
  providers: [PackingMaterialService],
  exports: [PackingMaterialService],
})
export class PackingMaterialModule {}
