import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { StorageLocationService } from './storage-location.service';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('storage-location')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StorageLocationController {
  constructor(
    private readonly storageLocationService: StorageLocationService,
  ) {}

  @Post()
  @RequirePermission('create', 'storage_location')
  create(@Body() createDto: CreateStorageLocationDto) {
    return this.storageLocationService.create(createDto);
  }

  @Get()
  @RequirePermission('read', 'storage_location')
  findAll(
    @Query('search') search?: string,
    @Query('storageCondition') storageCondition?: string,
    @Query('linkedStoreType') linkedStoreType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.storageLocationService.findAll(
      search,
      storageCondition,
      linkedStoreType,
      status,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'storage_location')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageLocationService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'storage_location')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStorageLocationDto,
  ) {
    return this.storageLocationService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'storage_location')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageLocationService.remove(id);
  }
}
