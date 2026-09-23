import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('bank')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  @RequirePermission('create', 'bank')
  create(@Body() createBankDto: CreateBankDto) {
    return this.bankService.create(createBankDto);
  }

  @Get()
  @RequirePermission('read', 'bank')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.bankService.findAll(search, parsedPage, parsedLimit);
  }

  @Get(':id')
  @RequirePermission('read', 'bank')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('update', 'bank')
  update(
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
  ) {
    return this.bankService.update(id, updateBankDto);
  }

  @Delete(':id')
  @RequirePermission('delete', 'bank')
  remove(@Param('id') id: string) {
    return this.bankService.remove(id);
  }
}
