import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollRepository } from '../repositories/payroll.repository';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import { SubmitRentReceiptDto, VerifyRentReceiptDto } from '../dto/submit-rent-receipt.dto';
import { TaxDeclarationDto } from '../dto/tax-declaration.dto';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly repo: PayrollRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getBanks() {
    let banks = await this.prisma.bank.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    if (!banks || banks.length === 0) {
      const defaultBanks = [
        'HDFC Bank',
        'ICICI Bank',
        'State Bank of India',
        'Axis Bank',
        'Kotak Mahindra Bank',
        'Punjab National Bank',
        'Bank of Baroda',
        'IndusInd Bank',
        'Canara Bank',
        'Union Bank of India',
        'IDFC FIRST Bank',
        'Yes Bank',
      ];
      await this.prisma.bank.createMany({
        data: defaultBanks.map((name) => ({ name, isActive: true })),
        skipDuplicates: true,
      });
      banks = await this.prisma.bank.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    return banks;
  }

  // --- 13.1 Salary Structure Setup ---
  async setupSalaryStructure(dto: CreateSalaryStructureDto) {
    // 1. Resolve employee by ID or employeeId code
    let empExists = await this.prisma.employee.findFirst({
      where: {
        OR: [
          { id: dto.employeeId },
          { employeeId: dto.employeeId },
        ],
      },
    });

    // 2. If employee doesn't exist yet, create fallback employee
    if (!empExists) {
      const code = dto.employeeId;
      const cleanCode = code.replace(/[^a-zA-Z0-9-]/g, '');
      empExists = await this.prisma.employee.create({
        data: {
          employeeId: code.startsWith('ASP-') ? code : `ASP-${cleanCode.toUpperCase()}`,
          firstName: 'Employee',
          lastName: code,
          email: `${cleanCode.toLowerCase()}@aspino.com`,
          department: 'Engineering',
          designation: 'Staff Employee',
          dateOfJoining: new Date(),
        },
      });
    }

    const basic = dto.basicSalary || 0;
    const hraAmount = dto.hraAmount || 0;
    const da = dto.da || 0;
    const conveyance = dto.conveyance || 0;
    const specialAllowance = dto.specialAllowance || 0;
    const statutoryBonus = dto.statutoryBonus || 0;
    const reimbursements = dto.reimbursements || 0;

    const grossSalary = basic + hraAmount + da + conveyance + specialAllowance + statutoryBonus + reimbursements;

    return this.repo.upsertSalaryStructure({
      employeeId: empExists.id,
      basicSalary: basic,
      hraAmount,
      da,
      conveyance,
      specialAllowance,
      statutoryBonus,
      reimbursements,
      grossSalary,
      pfAmount: dto.pfAmount || 0,
      esiAmount: dto.esiAmount || 0,
      ptAmount: dto.ptAmount || 0,
      taxRegime: dto.taxRegime || 'NEW',
      bankId: dto.bankId,
      accountNumber: dto.accountNumber,
      ifscCode: dto.ifscCode,
      panNumber: dto.panNumber,
    });
  }

  async bulkImportSalaryStructures(records: any[]) {
    return this.repo.bulkImportSalaryStructures(records);
  }

  async getSalaryStructure(employeeId: string) {
    const struct = await this.repo.getSalaryStructureByEmployee(employeeId);
    if (!struct) {
      throw new NotFoundException(`Salary structure for employee ID ${employeeId} not found`);
    }
    return struct;
  }

  async getAllSalaryStructures(page?: number, limit?: number, search?: string, month?: number, year?: number, distinctEmployees?: boolean) {
    return this.repo.getAllSalaryStructures(page, limit, search, month, year, distinctEmployees);
  }

  async deleteSalaryStructure(id: string) {
    return this.repo.deleteSalaryStructure(id);
  }

  // --- 13.2 HRA Calculation & Exemption Workflow ---
  async submitRentReceipt(dto: SubmitRentReceiptDto) {
    const annualRent = dto.monthlyRent * 12;

    if (dto.id) {
      const receipt = await this.prisma.hraRentReceipt.findUnique({ where: { id: dto.id } });
      if (!receipt) throw new NotFoundException('Rent receipt not found');

      let calculatedExemption = receipt.calculatedExemption;

      if (receipt.status === 'APPROVED') {
        const salaryStruct = await this.repo.getSalaryStructureByEmployee(dto.employeeId);
        const annualBasic = (salaryStruct?.basicSalary || 0) * 12;
        const annualHra = (salaryStruct?.hraAmount || 0) * 12;
        const cityPercent = 0.50;
        const optA = annualHra;
        const optB = Math.max(0, annualRent - (0.10 * annualBasic));
        const optC = cityPercent * annualBasic;
        calculatedExemption = Math.min(optA, optB, optC);

        await this.repo.upsertTaxDeclaration({
          employeeId: dto.employeeId,
          financialYear: dto.financialYear,
          hraExemptionAmount: calculatedExemption,
          status: 'APPROVED',
        });
      }

      return this.prisma.hraRentReceipt.update({
        where: { id: dto.id },
        data: {
          employeeId: dto.employeeId,
          financialYear: dto.financialYear,
          landlordName: dto.landlordName,
          landlordPan: dto.landlordPan,
          landlordAddress: dto.landlordAddress,
          monthlyRent: dto.monthlyRent,
          annualRent,
          rentReceiptUrl: dto.rentReceiptUrl,
          calculatedExemption,
        },
        include: { employee: true },
      });
    }

    return this.repo.createRentReceipt({
      employeeId: dto.employeeId,
      financialYear: dto.financialYear,
      landlordName: dto.landlordName,
      landlordPan: dto.landlordPan,
      landlordAddress: dto.landlordAddress,
      monthlyRent: dto.monthlyRent,
      annualRent,
      rentReceiptUrl: dto.rentReceiptUrl,
      status: 'SUBMITTED',
    });
  }

  async verifyRentReceipt(id: string, dto: VerifyRentReceiptDto) {
    const receipt = await this.repo.findRentReceiptById(id);
    if (!receipt) throw new NotFoundException('Rent receipt not found');

    let calculatedExemption = 0;

    if (dto.status === 'APPROVED') {
      const salaryStruct = await this.repo.getSalaryStructureByEmployee(receipt.employeeId);
      const annualBasic = (salaryStruct?.basicSalary || 0) * 12;
      const annualHra = (salaryStruct?.hraAmount || 0) * 12;
      const cityPercent = 0.50;

      // Section 13.2 HRA Exemption Rule (Least of a, b, c):
      // (a) Actual HRA received
      const optA = annualHra;
      // (b) Rent paid minus 10% of Basic Salary
      const optB = Math.max(0, receipt.annualRent - (0.10 * annualBasic));
      // (c) 50%/40% of Basic Salary
      const optC = cityPercent * annualBasic;

      calculatedExemption = Math.min(optA, optB, optC);

      // Auto update Tax Declaration with computed HRA exemption
      await this.repo.upsertTaxDeclaration({
        employeeId: receipt.employeeId,
        financialYear: receipt.financialYear,
        hraExemptionAmount: calculatedExemption,
        status: 'APPROVED',
      });
    }

    return this.repo.updateRentReceiptStatus(id, dto.status, dto.verifiedBy, calculatedExemption);
  }

  async getRentReceipts(page?: number, limit?: number, search?: string, month?: number, year?: number, employeeId?: string) {
    return this.repo.getRentReceipts(page, limit, search, month, year, employeeId);
  }

  // --- Tax Declarations ---
  async submitTaxDeclaration(dto: TaxDeclarationDto) {
    return this.repo.upsertTaxDeclaration({
      employeeId: dto.employeeId,
      financialYear: dto.financialYear,
      regime: dto.regime || 'NEW',
      section80C: dto.section80C || 0,
      section80D: dto.section80D || 0,
      section80G: dto.section80G || 0,
      otherDeductions: dto.otherDeductions || 0,
      status: 'SUBMITTED',
    });
  }

  async getTaxDeclarations(page?: number, limit?: number, search?: string, financialYear?: string, employeeId?: string, month?: number, year?: number) {
    return this.repo.getTaxDeclarations(page, limit, search, financialYear, employeeId, month, year);
  }

  // --- Loans & Advances ---
  async createLoan(dto: CreateLoanDto) {
    if (dto.id) {
      const loan = await this.prisma.employeeLoan.findUnique({ where: { id: dto.id } });
      if (!loan) throw new NotFoundException('Loan not found');

      const recoveredSoFar = loan.principalAmount - loan.balanceRemaining;
      const balanceRemaining = Math.max(0, dto.principalAmount - recoveredSoFar);

      return this.prisma.employeeLoan.update({
        where: { id: dto.id },
        data: {
          employeeId: dto.employeeId,
          loanType: dto.loanType || 'LOAN',
          principalAmount: dto.principalAmount,
          monthlyInstallment: dto.monthlyInstallment,
          balanceRemaining,
        },
        include: { employee: true },
      });
    }

    return this.repo.createLoan({
      employeeId: dto.employeeId,
      loanType: dto.loanType || 'LOAN',
      principalAmount: dto.principalAmount,
      monthlyInstallment: dto.monthlyInstallment,
      balanceRemaining: dto.principalAmount,
      status: 'ACTIVE',
    });
  }

  async getActiveLoans(page?: number, limit?: number, search?: string, month?: number, year?: number, employeeId?: string) {
    return this.repo.getActiveLoans(page, limit, search, month, year, employeeId);
  }

  // --- 13.3 & 13.4 Statutory Deductions & Monthly Payroll Run ---
  // Active Direct Employees for Payroll
  async getEmployeesForDropdown() {
    const employees = await this.prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
      },
      orderBy: { firstName: 'asc' },
    });

    if (employees.length === 0) {
      return [
        {
          id: "emp-demo-001",
          employeeId: "ASP-2026-001",
          firstName: "Rahul",
          lastName: "Sharma",
          department: "Engineering",
          designation: "Senior Software Engineer",
        },
        {
          id: "emp-demo-002",
          employeeId: "ASP-2026-002",
          firstName: "Priya",
          lastName: "Patel",
          department: "Human Resources",
          designation: "HR Executive",
        },
        {
          id: "emp-demo-003",
          employeeId: "ASP-2026-003",
          firstName: "Amit",
          lastName: "Verma",
          department: "Finance",
          designation: "Payroll Manager",
        },
        {
          id: "emp-demo-004",
          employeeId: "ASP-2026-004",
          firstName: "Neha",
          lastName: "Gupta",
          department: "Quality Assurance",
          designation: "QA Lead",
        },
      ];
    }

    return employees;
  }

  async runMonthlyPayroll(month: number, year: number) {
    // 1. Fetch active direct employees
    const employees = await this.repo.getDirectEmployeesForPayroll();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const totalDays = endDate.getDate();

    let totalGrossAll = 0;
    let totalNetAll = 0;

    // Create or find PayrollRun record
    const runRecord = await this.repo.createOrUpdatePayrollRun(month, year, 'PREVIEW', employees.length, 0, 0);
    await this.repo.deletePayslipsForRun(runRecord.id);

    const generatedPayslips: any[] = [];

    for (const emp of employees) {
      const struct = emp.salaryStructures?.find((s: any) => s.month === month && s.year === year) || emp.salaryStructures?.[0];
      if (!struct) continue; // Skip employees without configured salary structure

      // Fetch Attendance records for the month to calculate present days & OT
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: startDate, lte: endDate },
        },
      });

      // Fetch employee's allocated paid leave types from LeaveBalance
      const paidLeaveBalances = await this.prisma.leaveBalance.findMany({
        where: { employeeId: emp.id },
        select: { leaveType: true },
      });
      const paidLeaveTypes = paidLeaveBalances.map(b => b.leaveType);

      // Any approved leave application that is NOT one of the allocated paid types is considered LWP
      const lwpLeaves = await this.prisma.leaveApplication.findMany({
        where: {
          employeeId: emp.id,
          leaveType: { notIn: paidLeaveTypes },
          status: 'APPROVED',
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      let lwpDays = 0;
      for (const lve of lveLeavesCount(lwpLeaves, startDate, endDate)) {
        lwpDays += lve;
      }

      // OT hours calculation
      const otHours = attendances.reduce((acc, curr) => acc + (curr.otHours || 0), 0);

      const payableDays = Math.max(0, totalDays - lwpDays);
      const prorationFactor = payableDays / totalDays;

      // Earnings calculation
      const basic = Math.round(struct.basicSalary * prorationFactor);
      const hra = Math.round(struct.hraAmount * prorationFactor);
      const da = Math.round(struct.da * prorationFactor);
      const conveyance = Math.round(struct.conveyance * prorationFactor);
      const special = Math.round(struct.specialAllowance * prorationFactor);
      const bonus = Math.round(struct.statutoryBonus * prorationFactor);
      const reimbursements = Math.round(struct.reimbursements * prorationFactor);

      const grossEarnings = basic + hra + da + conveyance + special + bonus + reimbursements;

      // Statutory Deductions Calculation (Fixed Amounts)
      const pfDeduction = struct.pfAmount || 0;
      const esiDeduction = struct.esiAmount || 0;
      const ptDeduction = struct.ptAmount || 0;

      // TDS (Income Tax) Estimation
      let tdsDeduction = 0;
      const latestDeclaration = emp.taxDeclarations[0];
      const annualGross = grossEarnings * 12;
      const hraExemption = latestDeclaration?.hraExemptionAmount || 0;
      const sec80C = Math.min(latestDeclaration?.section80C || 0, 150000);
      const sec80D = latestDeclaration?.section80D || 0;
      const stdDeduction = 50000;

      const taxableAnnualIncome = Math.max(0, annualGross - hraExemption - sec80C - sec80D - stdDeduction);

      if (taxableAnnualIncome > 1000000) {
        tdsDeduction = Math.round((taxableAnnualIncome * 0.15) / 12);
      } else if (taxableAnnualIncome > 500000) {
        tdsDeduction = Math.round((taxableAnnualIncome * 0.05) / 12);
      }

      // Loan Recovery
      let loanRecovery = 0;
      const activeLoan = emp.loans[0];
      if (activeLoan && activeLoan.balanceRemaining > 0) {
        loanRecovery = Math.min(activeLoan.monthlyInstallment, activeLoan.balanceRemaining);
      }

      const totalDeductions = pfDeduction + esiDeduction + ptDeduction + tdsDeduction + loanRecovery;
      const netSalary = Math.max(0, grossEarnings - totalDeductions);

      totalGrossAll += grossEarnings;
      totalNetAll += netSalary;

      const payslip = await this.repo.createPayslip({
        payrollRunId: runRecord.id,
        employeeId: emp.id,
        month,
        year,
        totalDays,
        payableDays,
        lwpDays,
        otHours,
        basicSalary: basic,
        hra,
        da,
        conveyance,
        specialAllowance: special,
        bonus,
        reimbursements,
        grossEarnings,
        pfDeduction,
        esiDeduction,
        ptDeduction,
        tdsDeduction,
        loanRecovery,
        totalDeductions,
        netSalary,
        bankName: emp.bankName || 'Pending',
        accountNumber: emp.accountNumber || 'Pending',
        ifscCode: emp.ifscCode || 'Pending',
        status: 'GENERATED',
      });

      generatedPayslips.push(payslip);
    }

    // Update totals in PayrollRun
    await this.repo.createOrUpdatePayrollRun(month, year, 'PREVIEW', generatedPayslips.length, totalGrossAll, totalNetAll);

    return this.repo.getPayrollRun(month, year);
  }

  async approvePayrollRun(month: number, year: number, approvedBy?: string) {
    const run = await this.repo.getPayrollRun(month, year);
    if (!run) throw new NotFoundException(`Payroll run for ${month}/${year} not found`);

    // Process loan recoveries for each payslip
    for (const ps of run.payslips) {
      if (ps.loanRecovery > 0) {
        const activeLoans = await this.repo.getActiveLoans(undefined, undefined, undefined, undefined, undefined, ps.employeeId);
        if (activeLoans.data.length > 0) {
          await this.repo.updateLoanBalance(activeLoans.data[0].id, ps.loanRecovery);
        }
      }
    }

    return this.repo.approvePayrollRun(month, year, approvedBy);
  }

  async getPayrollRun(month: number, year: number) {
    return this.repo.getPayrollRun(month, year);
  }

  async getPayslips(page?: number, limit?: number, search?: string, month?: number, year?: number, employeeId?: string) {
    return this.repo.getPayslips(page, limit, search, month, year, employeeId);
  }

  async getPayslipById(id: string) {
    const ps = await this.repo.getPayslipById(id);
    if (!ps) throw new NotFoundException('Payslip not found');
    return ps;
  }

  // --- Bank Transfer & Statutory Reports Export ---
  async generateBankTransferFile(month: number, year: number) {
    const run = await this.repo.getPayrollRun(month, year);
    if (!run) throw new NotFoundException(`Payroll run for ${month}/${year} not found`);

    const headers = 'Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)\n';
    const rows = run.payslips.map(ps => 
      `"${ps.employee.employeeId}","${ps.employee.firstName} ${ps.employee.lastName}","${ps.bankName || 'HDFC Bank'}","${ps.accountNumber || 'ACC-123'}","${ps.ifscCode || 'HDFC0001234'}",${ps.netSalary}`
    ).join('\n');

    return { filename: `Bank_Disbursement_${year}_${month}.csv`, content: headers + rows };
  }

  async generateStatutoryReports(month: number, year: number) {
    const run = await this.repo.getPayrollRun(month, year);
    if (!run) throw new NotFoundException(`Payroll run for ${month}/${year} not found`);

    const pfReport = run.payslips.map(ps => ({
      employeeId: ps.employee.employeeId,
      name: `${ps.employee.firstName} ${ps.employee.lastName}`,
      pfWages: ps.basicSalary + ps.da,
      employeePf: ps.pfDeduction,
      employerPf: ps.pfDeduction, // 1:1 match
    }));

    const esiReport = run.payslips.filter(ps => ps.esiDeduction > 0).map(ps => ({
      employeeId: ps.employee.employeeId,
      name: `${ps.employee.firstName} ${ps.employee.lastName}`,
      grossSalary: ps.grossEarnings,
      employeeEsi: ps.esiDeduction,
      employerEsi: Math.ceil(ps.grossEarnings * 0.0325),
    }));

    const ptReport = run.payslips.filter(ps => ps.ptDeduction > 0).map(ps => ({
      employeeId: ps.employee.employeeId,
      name: `${ps.employee.firstName} ${ps.employee.lastName}`,
      state: 'Maharashtra',
      ptAmount: ps.ptDeduction,
    }));

    return { month, year, pfReport, esiReport, ptReport };
  }

  async generateForm16(employeeId: string, financialYear: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { salaryStructures: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const payslipsResult = await this.repo.getPayslips(1, 1000000, undefined, undefined, undefined, employeeId);
    const payslips = payslipsResult.data;
    const totalGross = payslips.reduce((acc, p) => acc + p.grossEarnings, 0);
    const totalPf = payslips.reduce((acc, p) => acc + p.pfDeduction, 0);
    const totalTds = payslips.reduce((acc, p) => acc + p.tdsDeduction, 0);

    const taxDeclsResult = await this.repo.getTaxDeclarations(1, 1000000, undefined, financialYear, employeeId);
    const declaration = taxDeclsResult.data[0];

    return {
      financialYear,
      employeeId: emp.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      pan: 'ABCDE1234F',
      employerName: 'Aspino Technologies Pvt Ltd',
      employerTan: 'MUMB12345A',
      grossSalary: totalGross,
      hraExemption: declaration?.hraExemptionAmount || 0,
      standardDeduction: 50000,
      section80C: declaration?.section80C || 0,
      section80D: declaration?.section80D || 0,
      totalPfDeduction: totalPf,
      totalTdsDeducted: totalTds,
      netTaxableIncome: Math.max(0, totalGross - (declaration?.hraExemptionAmount || 0) - 50000 - (declaration?.section80C || 0)),
    };
  }

  async calculateFullAndFinalSettlement(exitProcessId: string) {
    const exitProcess = await this.prisma.exitProcess.findUnique({
      where: { id: exitProcessId },
    });
    if (!exitProcess) throw new NotFoundException('Exit process not found');
    
    const empId = exitProcess.employeeId;
    const salaryStruct = await this.repo.getSalaryStructureByEmployee(empId);
    if (!salaryStruct) throw new BadRequestException('No salary structure found for employee');
    
    // Prorate salary for the month of lastWorkingDay
    const lwd = new Date(exitProcess.lastWorkingDay);
    const month = lwd.getMonth() + 1;
    const year = lwd.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysWorked = lwd.getDate();
    
    const prorationFactor = daysWorked / daysInMonth;
    const pendingSalary = Math.round(salaryStruct.grossSalary * prorationFactor);
    
    // Leave Encashment: Earned Leaves * (Basic / 30)
    const earnedLeave = await this.prisma.leaveBalance.findFirst({
      where: { employeeId: empId, leaveType: 'Earned' },
    });
    const elBalance = earnedLeave ? Math.max(0, earnedLeave.allocated - earnedLeave.used) : 0;
    const dailyBasic = salaryStruct.basicSalary / 30;
    const leaveEncashment = Math.round(elBalance * dailyBasic);
    
    // Recoveries
    const activeLoansResult = await this.repo.getActiveLoans(1, 1000000, undefined, undefined, undefined, empId);
    const recoveries = activeLoansResult.data.reduce((acc, loan) => acc + loan.balanceRemaining, 0);
    
    const bonus = 0; // Configurable based on policy
    
    return {
      pendingSalary,
      leaveEncashment,
      bonus,
      recoveries,
      netPayable: pendingSalary + leaveEncashment + bonus - recoveries,
    };
  }

  async getSalaryMatrix(department?: string, search?: string) {
    return this.repo.getSalaryMatrixData(department, search);
  }

  async batchSaveSalaryMatrix(records: any[]) {
    return this.repo.batchSaveSalaryMatrix(records);
  }

  async copyPreviousMonthSalaries(fromMonth?: number, fromYear?: number, toMonth?: number, toYear?: number, password?: string) {
    const requiredPassword = process.env.SALARY_TRANSFER_PASSWORD || 'admin123';
    if (!password || password.trim() !== requiredPassword.trim()) {
      throw new BadRequestException('Invalid transfer password. Please enter the correct password.');
    }
    return this.repo.copyPreviousMonthSalaries(fromMonth, fromYear, toMonth, toYear);
  }

  async recordManualRepayment(loanId: string, amount: number) {
    const loan = await this.prisma.employeeLoan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const newBalance = Math.max(0, loan.balanceRemaining - amount);
    const newStatus = newBalance === 0 ? 'PAID_OFF' : 'ACTIVE';

    return this.prisma.employeeLoan.update({
      where: { id: loanId },
      data: {
        balanceRemaining: newBalance,
        status: newStatus,
      },
      include: { employee: true },
    });
  }
}

function lveLeavesCount(leaves: any[], start: Date, end: Date): number[] {
  return leaves.map(l => {
    const s = new Date(l.startDate) < start ? start : new Date(l.startDate);
    const e = new Date(l.endDate) > end ? end : new Date(l.endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  });
}
