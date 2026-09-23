import { Module } from '@nestjs/common';
import { StorageLocationController } from './storage-location.controller';
import { StorageLocationService } from './storage-location.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StorageLocationController],
  providers: [StorageLocationService],
  exports: [StorageLocationService],
})
export class StorageLocationModule {}
