import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import {
  CreateTransporterDto,
  CreateVehicleDto,
  CreateDriverDto,
  CreateRouteDto,
  CreateShipmentDto,
} from './dto/logistics.dto';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.logisticsService.getDashboardStats();
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  @Get('suppliers')
  async getSuppliers(@Query('search') search?: string) {
    return this.logisticsService.getSuppliers(search);
  }

  // ==========================================
  // TRANSPORTERS
  // ==========================================
  @Get('transporters')
  async getTransporters() {
    return this.logisticsService.getTransporters();
  }

  @Post('transporters')
  async createTransporter(@Body() dto: CreateTransporterDto) {
    return this.logisticsService.createTransporter(dto);
  }

  @Put('transporters/:id')
  async updateTransporter(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransporterDto>,
  ) {
    return this.logisticsService.updateTransporter(id, dto);
  }

  @Delete('transporters/:id')
  async deleteTransporter(@Param('id') id: string) {
    return this.logisticsService.deleteTransporter(id);
  }

  // ==========================================
  // VEHICLES
  // ==========================================
  @Get('vehicles')
  async getVehicles() {
    return this.logisticsService.getVehicles();
  }

  @Post('vehicles')
  async createVehicle(@Body() dto: CreateVehicleDto) {
    return this.logisticsService.createVehicle(dto);
  }

  @Put('vehicles/:id')
  async updateVehicle(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateVehicle(id, dto);
  }

  @Patch('vehicles/:id')
  async updateVehiclePatch(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateVehicle(id, dto);
  }

  @Delete('vehicles/:id')
  async deleteVehicle(@Param('id') id: string) {
    return this.logisticsService.deleteVehicle(id);
  }

  // ==========================================
  // DRIVERS
  // ==========================================
  @Get('drivers')
  async getDrivers() {
    return this.logisticsService.getDrivers();
  }

  @Post('drivers')
  async createDriver(@Body() dto: CreateDriverDto) {
    return this.logisticsService.createDriver(dto);
  }

  @Put('drivers/:id')
  async updateDriver(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateDriver(id, dto);
  }

  @Patch('drivers/:id')
  async updateDriverPatch(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateDriver(id, dto);
  }

  @Delete('drivers/:id')
  async deleteDriver(@Param('id') id: string) {
    return this.logisticsService.deleteDriver(id);
  }

  // ==========================================
  // ROUTES
  // ==========================================
  @Get('routes')
  async getRoutes() {
    return this.logisticsService.getRoutes();
  }

  @Post('routes')
  async createRoute(@Body() dto: any) {
    return this.logisticsService.createRoute(dto);
  }

  @Put('routes/:id')
  async updateRoutePut(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateRoute(id, dto);
  }

  @Patch('routes/:id')
  async updateRoutePatch(@Param('id') id: string, @Body() dto: any) {
    return this.logisticsService.updateRoute(id, dto);
  }

  @Delete('routes/:id')
  async deleteRoute(@Param('id') id: string) {
    return this.logisticsService.deleteRoute(id);
  }

  // ==========================================
  // SHIPMENTS
  // ==========================================
  @Get('shipments')
  async getShipments(@Query('type') type?: string) {
    return this.logisticsService.getShipments(type);
  }

  @Get('shipments/:id')
  async getShipmentById(@Param('id') id: string) {
    return this.logisticsService.getShipmentById(id);
  }

  @Post('shipments')
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.logisticsService.createShipment(dto);
  }

  @Put('shipments/:id')
  async updateShipment(@Param('id') id: string, @Body() body: any) {
    return this.logisticsService.updateShipment(id, body);
  }

  @Delete('shipments/:id')
  async deleteShipment(@Param('id') id: string) {
    return this.logisticsService.deleteShipment(id);
  }

  @Put('shipments/:id/status')
  async updateShipmentStatus(
    @Param('id') id: string,
    @Body() body: { status: string; location?: string; remarks?: string },
  ) {
    return this.logisticsService.updateShipmentStatus(
      id,
      body.status,
      body.location,
      body.remarks,
    );
  }

  // ==========================================
  // WAREHOUSE TRANSFERS
  // ==========================================
  @Get('transfers')
  async getTransfers() {
    return this.logisticsService.getTransfers();
  }

  @Post('transfers')
  async createTransfer(@Body() body: any) {
    return this.logisticsService.createTransfer(body);
  }

  @Put('transfers/:id/status')
  async updateTransferStatusPut(
    @Param('id') id: string,
    @Body() body: { status: string; approvedBy?: string },
  ) {
    return this.logisticsService.updateTransferStatus(
      id,
      body.status,
      body.approvedBy,
    );
  }

  @Patch('transfers/:id/status')
  async updateTransferStatusPatch(
    @Param('id') id: string,
    @Body() body: { status: string; approvedBy?: string },
  ) {
    return this.logisticsService.updateTransferStatus(
      id,
      body.status,
      body.approvedBy,
    );
  }

  @Put('transfers/:id')
  async updateTransferPut(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateTransfer(id, body);
  }

  @Patch('transfers/:id')
  async updateTransferPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateTransfer(id, body);
  }

  @Delete('transfers/:id')
  async deleteTransfer(@Param('id') id: string) {
    return this.logisticsService.deleteTransfer(id);
  }

  // ==========================================
  // RETURNS MANAGEMENT
  // ==========================================
  @Get('returns')
  async getReturns() {
    return this.logisticsService.getReturns();
  }

  @Post('returns')
  async createReturn(@Body() body: any) {
    return this.logisticsService.createReturn(body);
  }

  @Patch('returns/:id/inspection')
  async recordReturnInspectionPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturnDisposition(id, body);
  }

  @Put('returns/:id/inspection')
  async recordReturnInspectionPut(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturnDisposition(id, body);
  }

  @Patch('returns/:id/disposition')
  async updateReturnDispositionPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturnDisposition(id, body);
  }

  @Put('returns/:id/disposition')
  async updateReturnDisposition(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturnDisposition(id, body);
  }

  @Put('returns/:id')
  async updateReturnPut(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturn(id, body);
  }

  @Patch('returns/:id')
  async updateReturnPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.updateReturn(id, body);
  }

  @Delete('returns/:id')
  async deleteReturn(@Param('id') id: string) {
    return this.logisticsService.deleteReturn(id);
  }

  // ==========================================
  // COLD CHAIN
  // ==========================================
  @Get('temperature-excursions')
  async getExcursions() {
    return this.logisticsService.getExcursions();
  }

  @Post('temperature-logs')
  async logTemperaturePost(
    @Body()
    body: {
      shipmentId: string;
      temperature: number;
      humidity?: number;
      location?: string;
      sensorId?: string;
      batteryLevel?: number;
    },
  ) {
    return this.logisticsService.logTemperature(
      body.shipmentId,
      body.temperature,
      body.humidity,
      body.location,
    );
  }

  @Post('shipments/:id/temperature')
  async logTemperature(
    @Param('id') id: string,
    @Body()
    body: { temperature: number; humidity?: number; location?: string },
  ) {
    return this.logisticsService.logTemperature(
      id,
      body.temperature,
      body.humidity,
      body.location,
    );
  }

  @Patch('temperature-excursions/:id/review')
  async reviewExcursionPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.reviewExcursion(id, body);
  }

  @Put('temperature-excursions/:id/review')
  async reviewExcursionPut(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.reviewExcursion(id, body);
  }

  @Patch('temperature-excursions/:id')
  async updateExcursionPatch(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.reviewExcursion(id, body);
  }

  @Put('temperature-excursions/:id')
  async updateExcursionPut(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.logisticsService.reviewExcursion(id, body);
  }
}
