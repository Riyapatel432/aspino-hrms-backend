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
  Request,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceItemDto } from './dto/create-maintenance-item.dto';
import { UpdateMaintenanceItemDto } from './dto/update-maintenance-item.dto';
import { CreateMaintenanceRequisitionDto } from './dto/create-maintenance-requisition.dto';
import { CreateMaintenanceIssueDto } from './dto/create-maintenance-issue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../casl/guards/permission.guard';
import { RequirePermission } from '../casl/decorators/require-permission.decorator';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // --- ITEM MASTER (SPARES & TOOLS) ---

  @Post('items')
  @RequirePermission('create', 'maintenance_store')
  createItem(@Body() dto: CreateMaintenanceItemDto) {
    return this.maintenanceService.createItem(dto);
  }

  @Get('items')
  @RequirePermission('read', 'maintenance_store')
  findAllItems(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('equipment') equipment?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.maintenanceService.findAllItems(
      search,
      category,
      lowStockOnly === 'true',
      equipment,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('low-stock-alerts')
  @RequirePermission('read', 'maintenance_store')
  getLowStockAlerts() {
    return this.maintenanceService.getLowStockAlerts();
  }

  @Get('pm-linked')
  @RequirePermission('read', 'maintenance_store')
  getPmLinked() {
    return this.maintenanceService.getPmLinkedItems();
  }

  @Get('items/:id')
  @RequirePermission('read', 'maintenance_store')
  findOneItem(@Param('id') id: string) {
    return this.maintenanceService.findOneItem(id);
  }

  @Patch('items/:id')
  @RequirePermission('update', 'maintenance_store')
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceItemDto,
  ) {
    return this.maintenanceService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @RequirePermission('delete', 'maintenance_store')
  removeItem(@Param('id') id: string) {
    return this.maintenanceService.removeItem(id);
  }

  // --- REQUISITIONS ---

  @Post('requisitions')
  @RequirePermission('create', 'maintenance_store')
  createRequisition(@Body() dto: CreateMaintenanceRequisitionDto) {
    return this.maintenanceService.createRequisition(dto);
  }

  @Get('requisitions')
  @RequirePermission('read', 'maintenance_store')
  findAllRequisitions(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.maintenanceService.findAllRequisitions(
      search,
      status,
      priority,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('requisitions/:id')
  @RequirePermission('read', 'maintenance_store')
  findOneRequisition(@Param('id') id: string) {
    return this.maintenanceService.findOneRequisition(id);
  }

  @Patch('requisitions/:id/approve')
  @RequirePermission('approve', 'maintenance_store')
  approveRequisition(@Param('id') id: string, @Request() req: any) {
    const approverName = req.user?.name || req.user?.email || 'Maintenance Authority';
    return this.maintenanceService.approveRequisition(id, approverName);
  }

  @Patch('requisitions/:id/reject')
  @RequirePermission('approve', 'maintenance_store')
  rejectRequisition(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.maintenanceService.rejectRequisition(id, reason);
  }

  // --- ISSUES AGAINST REQUISITIONS ---

  @Post('issues')
  @RequirePermission('create', 'maintenance_store')
  createIssue(@Body() dto: CreateMaintenanceIssueDto) {
    return this.maintenanceService.issueAgainstRequisition(dto);
  }

  @Get('issues')
  @RequirePermission('read', 'maintenance_store')
  findAllIssues(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.maintenanceService.findAllIssues(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // --- STORE CATEGORIES MASTER (MAIN STORE DEDICATED) ---

  @Get('categories')
  @RequirePermission('read', 'maintenance_store')
  findAllStoreCategories(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.maintenanceService.findAllStoreCategories(search, status);
  }

  @Post('categories')
  @RequirePermission('create', 'maintenance_store')
  createStoreCategory(@Body() body: any) {
    return this.maintenanceService.createStoreCategory(body);
  }

  @Patch('categories/:id')
  @RequirePermission('update', 'maintenance_store')
  updateStoreCategory(@Param('id') id: string, @Body() body: any) {
    return this.maintenanceService.updateStoreCategory(id, body);
  }

  @Delete('categories/:id')
  @RequirePermission('delete', 'maintenance_store')
  deleteStoreCategory(@Param('id') id: string) {
    return this.maintenanceService.deleteStoreCategory(id);
  }
}

