import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
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

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // Employees List Dropdown
  @Get('employees')
  async getEmployees() {
    return this.payrollService.getEmployeesForDropdown();
  }

  @Get('banks')
  async getBanks() {
    return this.payrollService.getBanks();
  }

  // Salary Structure
  @Post('salary-structure')
  async setupSalaryStructure(@Body() dto: CreateSalaryStructureDto) {
    return this.payrollService.setupSalaryStructure(dto);
  }

  @Get('salary-matrix')
  async getSalaryMatrix(
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    return this.payrollService.getSalaryMatrix(department, search);
  }

  @Post('salary-matrix/batch-save')
  async batchSaveSalaryMatrix(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.payrollService.batchSaveSalaryMatrix(records);
  }

  @Post('salary-structure/copy-previous')
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
  async bulkImportSalaryStructures(@Body() body: { records: any[] }) {
    const records = Array.isArray(body) ? body : body?.records || [];
    return this.payrollService.bulkImportSalaryStructures(records);
  }

  @Get('salary-structure/template')
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
  async deleteSalaryStructure(@Param('id') id: string) {
    return this.payrollService.deleteSalaryStructure(id);
  }

  @Get('salary-structure/:employeeId')
  async getSalaryStructure(@Param('employeeId') employeeId: string) {
    return this.payrollService.getSalaryStructure(employeeId);
  }

  // HRA Rent Receipts
  @Post('hra/rent-receipt')
  async submitRentReceipt(@Body() dto: SubmitRentReceiptDto) {
    return this.payrollService.submitRentReceipt(dto);
  }

  @Get(['hra/rent-receipt', 'hra/rent-receipts'])
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
  async verifyRentReceipt(
    @Param('id') id: string,
    @Body() dto: VerifyRentReceiptDto,
  ) {
    return this.payrollService.verifyRentReceipt(id, dto);
  }

  // Tax Declarations
  @Post('tax-declaration')
  async submitTaxDeclaration(@Body() dto: TaxDeclarationDto) {
    return this.payrollService.submitTaxDeclaration(dto);
  }

  @Get(['tax-declaration', 'tax-declarations', 'hra/tax-declarations'])
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
  async createLoan(@Body() dto: CreateLoanDto) {
    return this.payrollService.createLoan(dto);
  }

  @Get(['loan', 'loans'])
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
  async runMonthlyPayroll(@Body() dto: InitiatePayrollRunDto) {
    return this.payrollService.runMonthlyPayroll(dto.month, dto.year);
  }

  @Post('run/approve')
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
  async getPayrollRun(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.payrollService.getPayrollRun(parseInt(month), parseInt(year));
  }

  // Payslips
  @Get('payslips')
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
  async getPayslipById(@Param('id') id: string) {
    return this.payrollService.getPayslipById(id);
  }

  // Export File Endpoints
  @Get('export/bank-transfer')
  async exportBankTransfer(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const file = await this.payrollService.generateBankTransferFile(
      parseInt(month),
      parseInt(year),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.content);
  }

  @Get('export/statutory')
  async exportStatutoryReports(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.payrollService.generateStatutoryReports(
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('export/form16/:employeeId')
  async generateForm16(
    @Param('employeeId') employeeId: string,
    @Query('financialYear') financialYear: string = '2026-2027',
  ) {
    return this.payrollService.generateForm16(employeeId, financialYear);
  }

  @Post('loan/:id/repay')
  async recordLoanRepayment(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.payrollService.recordManualRepayment(id, Number(body.amount));
  }
}
