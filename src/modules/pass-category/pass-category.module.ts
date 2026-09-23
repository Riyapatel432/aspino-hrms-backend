import { Module } from '@nestjs/common';
import { PassCategoryService } from './pass-category.service';
import { PassCategoryController } from './pass-category.controller';

@Module({
  controllers: [PassCategoryController],
  providers: [PassCategoryService],
  exports: [PassCategoryService],
})
export class PassCategoryModule {}
