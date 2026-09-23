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
import { ProductSubCategoryService } from './product-sub-category.service';
import { CreateProductSubCategoryDto } from './dto/create-product-sub-category.dto';
import { UpdateProductSubCategoryDto } from './dto/update-product-sub-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('product-sub-category')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductSubCategoryController {
  constructor(
    private readonly productSubCategoryService: ProductSubCategoryService,
  ) {}

  @Post()
  @RequirePermission('create', 'product_sub_category')
  create(@Body() createDto: CreateProductSubCategoryDto) {
    return this.productSubCategoryService.create(createDto);
  }

  @Get()
  @RequirePermission('read', 'product_sub_category')
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.productSubCategoryService.findAll(
      search,
      categoryId,
      status,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'product_sub_category')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSubCategoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'product_sub_category')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductSubCategoryDto,
  ) {
    return this.productSubCategoryService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'product_sub_category')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSubCategoryService.remove(id);
  }
}
