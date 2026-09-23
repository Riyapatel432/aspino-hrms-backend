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
import { PassCategoryService } from './pass-category.service';
import { CreatePassCategoryDto } from './dto/create-pass-category.dto';
import { UpdatePassCategoryDto } from './dto/update-pass-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('pass-category')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PassCategoryController {
  constructor(private readonly passCategoryService: PassCategoryService) {}

  @Post()
  @RequirePermission('create', 'pass_category')
  create(@Body() createPassCategoryDto: CreatePassCategoryDto) {
    return this.passCategoryService.create(createPassCategoryDto);
  }

  @Get()
  @RequirePermission('read', 'pass_category')
  findAll(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.passCategoryService.findAll(
      type,
      search,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'pass_category')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.passCategoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'pass_category')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePassCategoryDto: UpdatePassCategoryDto,
  ) {
    return this.passCategoryService.update(id, updatePassCategoryDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'pass_category')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.passCategoryService.remove(id);
  }
}
