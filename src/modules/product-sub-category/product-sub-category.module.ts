import { Module } from '@nestjs/common';
import { ProductSubCategoryService } from './product-sub-category.service';
import { ProductSubCategoryController } from './product-sub-category.controller';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductSubCategoryController],
  providers: [ProductSubCategoryService],
  exports: [ProductSubCategoryService],
})
export class ProductSubCategoryModule {}
