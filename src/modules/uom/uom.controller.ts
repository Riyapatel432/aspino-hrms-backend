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
import { UomService } from './uom.service';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('uom')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Post()
  @RequirePermission('create', 'uom')
  create(@Body() createDto: CreateUomDto) {
    return this.uomService.create(createDto);
  }

  @Get()
  @RequirePermission('read', 'uom')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.uomService.findAll(search, status, parsedPage, parsedLimit);
  }

  @Get(':id')
  @RequirePermission('read', 'uom')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.uomService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'uom')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUomDto,
  ) {
    return this.uomService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'uom')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.uomService.remove(id);
  }
}
