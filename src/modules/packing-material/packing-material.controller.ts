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
import { PackingMaterialService } from './packing-material.service';
import { CreatePackingMaterialDto } from './dto/create-packing-material.dto';
import { UpdatePackingMaterialDto } from './dto/update-packing-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('packing-material')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PackingMaterialController {
  constructor(
    private readonly packingMaterialService: PackingMaterialService,
  ) {}

  @Post()
  @RequirePermission('create', 'packing_material')
  create(@Body() createDto: CreatePackingMaterialDto) {
    return this.packingMaterialService.create(createDto);
  }

  @Get()
  @RequirePermission('read', 'packing_material')
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.packingMaterialService.findAll(
      search,
      type,
      status,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'packing_material')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.packingMaterialService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'packing_material')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePackingMaterialDto,
  ) {
    return this.packingMaterialService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'packing_material')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.packingMaterialService.remove(id);
  }
}
