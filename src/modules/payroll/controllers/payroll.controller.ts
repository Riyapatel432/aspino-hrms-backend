import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PayrollService } from '../services/payroll.service';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import {
  SubmitRentReceiptDto,
  VerifyRentReceiptDto,
} from '../dto/submit-rent-receipt.dto';
import { TaxDeclarationDto } from '../dto/tax-declaration.dto';
import { CreateLoanDto } from '../dto/create-loan.dto';
import {
  InitiatePayrollRunDto,
  ApprovePayrollRunDto,
} from '../dto/payroll-run.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // Employees List Dropdown
  @Get('employees')
  @RequirePermission('read', 'employee')
  async getEmployees() {
    return this.payrollService.getEmployeesForDropdown();
  }

  @Get('banks')
  @RequirePermission('read', 'bank')
  async getBanks() {
    return this.payrollService.getBanks();
  }

  // Salary Structure
  @Post('salary-structure')
  @RequirePermission('create', 'payroll')
  async setupSalaryStructure(@Body() dto: CreateSalaryStructureDto) {
    return this.payrollService.setupSalaryStructure(dto);
  }

  @Get('salary-matrix')
  @RequirePermission('read', 'payroll')
  async getSalaryMatrix(
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.payrollService.getSalaryMatrix(department, search);
  }

  @Post('salary-matrix/batch-save')
  @RequirePermission('update', 'payroll')
  async batchSaveSalaryMatrix(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.payrollService.batchSaveSalaryMatrix(records);
  }

  @Post('salary-structure/copy-previous')
  @RequirePermission('create', 'payroll')
  async copyPreviousMonthSalaries(
    @Body()
    body: {
      fromMonth?: number;
      fromYear?: number;
      toMonth?: number;
      toYear?: number;
      password?: string;
    },
  ) {
    return this.payrollService.copyPreviousMonthSalaries(
      body.fromMonth,
      body.fromYear,
      body.toMonth,
      body.toYear,
      body.password,
    );
  }

  @Post('salary-structure/bulk-import')
  @RequirePermission('create', 'payroll')
  async bulkImportSalaryStructures(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.payrollService.bulkImportSalaryStructures(records);
  }

  @Get('salary-structure/template')
  @RequirePermission('read', 'payroll')
  async getSalaryTemplate(@Res() res: Response) {
    const csvContent = [
      'Employee Code / ID,Basic Salary,HRA Amount,DA,Conveyance,Special Allowance,Statutory Bonus,Reimbursements,Gross Salary,PF Amount,ESI Amount,PT Amount,Tax Regime',
      'ASP-2026-0001,45000,18000,0,1600,10400,0,0,75000,1800,0,200,NEW',
      'ASP-2026-0002,30000,12000,0,1600,6400,0,0,50000,1800,0,200,NEW',
      'ASP-2026-0003,20000,8000,0,1600,2400,0,0,32000,1800,0,200,OLD',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="salary_structure_import_template.csv"',
    );
    return res.send(csvContent);
  }

  @Get('salary-structure/all')
  @RequirePermission('read', 'payroll')
  async getAllSalaryStructures(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('distinctEmployees') distinctEmployees?: string,
  ) {
    return this.payrollService.getAllSalaryStructures(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      distinctEmployees === 'true',
    );
  }

  @Post('salary-structure/:id/delete')
  @RequirePermission('delete', 'payroll')
  async deleteSalaryStructure(@Param('id') id: string) {
    return this.payrollService.deleteSalaryStructure(id);
  }

  @Get('salary-structure/:employeeId')
  @RequirePermission('read', 'payroll')
  async getSalaryStructure(@Param('employeeId') employeeId: string) {
    return this.payrollService.getSalaryStructure(employeeId);
  }

  // HRA Rent Receipts
  @Post('hra/rent-receipt')
  @RequirePermission('create', 'payroll')
  async submitRentReceipt(@Body() dto: SubmitRentReceiptDto) {
    return this.payrollService.submitRentReceipt(dto);
  }

  @Get(['hra/rent-receipt', 'hra/rent-receipts'])
  @RequirePermission('read', 'payroll')
  async getRentReceipts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payrollService.getRentReceipts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      employeeId,
    );
  }

  @Patch('hra/rent-receipt/:id/verify')
  @RequirePermission('update', 'payroll')
  async verifyRentReceipt(
    @Param('id') id: string,
    @Body() dto: VerifyRentReceiptDto,
  ) {
    return this.payrollService.verifyRentReceipt(id, dto);
  }

  // Tax Declarations
  @Post('tax-declaration')
  @RequirePermission('create', 'payroll')
  async submitTaxDeclaration(@Body() dto: TaxDeclarationDto) {
    return this.payrollService.submitTaxDeclaration(dto);
  }

  @Get(['tax-declaration', 'tax-declarations', 'hra/tax-declarations'])
  @RequirePermission('read', 'payroll')
  async getTaxDeclarations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('financialYear') financialYear?: string,
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.getTaxDeclarations(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      financialYear,
      employeeId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  // Loans & Advances
  @Post('loan')
  @RequirePermission('create', 'payroll')
  async createLoan(@Body() dto: CreateLoanDto) {
    return this.payrollService.createLoan(dto);
  }

  @Get(['loan', 'loans'])
  @RequirePermission('read', 'payroll')
  async getActiveLoans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payrollService.getActiveLoans(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      employeeId,
    );
  }

  // Monthly Payroll Run
  @Post('run')
  @RequirePermission('create', 'payroll')
  async runMonthlyPayroll(@Body() dto: InitiatePayrollRunDto) {
    return this.payrollService.runMonthlyPayroll(dto.month, dto.year);
  }

  @Post('run/approve')
  @RequirePermission('approve', 'payroll')
  async approvePayrollRun(
    @Query('month') month: string,
    @Query('year') year: string,
    @Body() dto: ApprovePayrollRunDto,
  ) {
    return this.payrollService.approvePayrollRun(
      parseInt(month),
      parseInt(year),
      dto.approvedBy,
    );
  }

  @Get('run')
  @RequirePermission('read', 'payroll')
  async getPayrollRun(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.payrollService.getPayrollRun(parseInt(month), parseInt(year));
  }

  // Payslips
  @Get('payslips')
  @RequirePermission('read', 'payroll')
  async getPayslips(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payrollService.getPayslips(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      employeeId,
    );
  }

  @Get('payslip/:id')
  @RequirePermission('read', 'payroll')
  async getPayslipById(@Param('id') id: string) {
    return this.payrollService.getPayslipById(id);
  }

  // Export File Endpoints
  @Get('export/bank-transfer')
  @RequirePermission('export', 'payroll')
  async exportBankTransfer(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const file = await this.payrollService.generateBankTransferFile(m, y);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.content);
  }

  @Get('export/statutory')
  @RequirePermission('export', 'payroll')
  async exportStatutoryReports(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.payrollService.generateStatutoryReports(m, y);
  }

  @Get('export/statutory/pf-ecr')
  @RequirePermission('export', 'payroll')
  async exportPfEcr(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const file = await this.payrollService.generatePfEcrCsv(m, y);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.content);
  }

  @Get('export/statutory/esi-return')
  @RequirePermission('export', 'payroll')
  async exportEsiReturn(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const file = await this.payrollService.generateEsiReturnCsv(m, y);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.content);
  }

  @Get('export/statutory/pt-report')
  @RequirePermission('export', 'payroll')
  async exportPtReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const file = await this.payrollService.generatePtReportCsv(m, y);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.content);
  }

  @Get('export/form16/:employeeId')
  @RequirePermission('export', 'payroll')
  async generateForm16(
    @Param('employeeId') employeeId: string,
    @Query('financialYear') financialYear: string = '2026-2027',
  ) {
    return this.payrollService.generateForm16(employeeId, financialYear);
  }

  @Post('loan/:id/repay')
  @RequirePermission('update', 'payroll')
  async recordLoanRepayment(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.payrollService.recordManualRepayment(id, Number(body.amount));
  }
}
