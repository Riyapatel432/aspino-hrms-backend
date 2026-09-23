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
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('product-category')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductCategoryController {
  constructor(
    private readonly productCategoryService: ProductCategoryService,
  ) {}

  @Post()
  @RequirePermission('create', 'product_category')
  create(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productCategoryService.create(createProductCategoryDto);
  }

  @Get()
  @RequirePermission('read', 'product_category')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.productCategoryService.findAll(
      search,
      status,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @RequirePermission('read', 'product_category')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productCategoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'product_category')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productCategoryService.update(id, updateProductCategoryDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'product_category')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productCategoryService.remove(id);
  }
}
