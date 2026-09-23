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
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('vendor')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @RequirePermission('create', 'vendor')
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Get()
  @RequirePermission('read', 'vendor')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.vendorService.findAll(search, parsedPage, parsedLimit);
  }

  @Get(':id')
  @RequirePermission('read', 'vendor')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'vendor')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'vendor')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.remove(id);
  }
}
