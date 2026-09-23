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
import { QcSpecificationService } from './qc-specification.service';
import { CreateQcSpecificationDto } from './dto/create-qc-specification.dto';
import { UpdateQcSpecificationDto } from './dto/update-qc-specification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('qc-specification')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QcSpecificationController {
  constructor(
    private readonly qcSpecificationService: QcSpecificationService,
  ) {}

  @Post()
  @RequirePermission('create', 'qc_specification')
  create(@Body() createDto: CreateQcSpecificationDto) {
    return this.qcSpecificationService.create(createDto);
  }

  @Get()
  @RequirePermission('read', 'qc_specification')
  findAll(
    @Query('search') search?: string,
    @Query('itemType') itemType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.qcSpecificationService.findAll(
      search,
      itemType,
      status,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'qc_specification')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qcSpecificationService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'qc_specification')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQcSpecificationDto,
  ) {
    return this.qcSpecificationService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'qc_specification')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.qcSpecificationService.remove(id);
  }
}
