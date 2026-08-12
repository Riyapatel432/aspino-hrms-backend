import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Salary Structure
  async upsertSalaryStructure(data: any) {
    const { bankId, accountNumber, ifscCode, panNumber, month, year, ...structData } = data;

    if (bankId !== undefined || accountNumber !== undefined || ifscCode !== undefined || panNumber !== undefined) {
      await this.prisma.employee.update({
        where: { id: data.employeeId },
        data: {
          ...(bankId !== undefined ? { bankId: bankId ? Number(bankId) : null } : {}),
          ...(accountNumber !== undefined ? { accountNumber } : {}),
          ...(ifscCode !== undefined ? { ifscCode } : {}),
          ...(panNumber !== undefined ? { panNumber } : {}),
        },
      });
    }

    const m = month ? Number(month) : (data.effectiveFrom ? new Date(data.effectiveFrom).getMonth() + 1 : new Date().getMonth() + 1);
    const y = year ? Number(year) : (data.effectiveFrom ? new Date(data.effectiveFrom).getFullYear() : new Date().getFullYear());

    const { employeeId, ...updateData } = structData;

    return this.prisma.salaryStructure.upsert({
      where: {
        employeeId_month_year: {
          employeeId: data.employeeId,
          month: m,
          year: y,
        },
      },
      create: {
        ...structData,
        month: m,
        year: y,
      },
      update: {
        ...updateData,
        month: m,
        year: y,
      },
      include: { employee: { include: { bank: true } } },
    });
  }

  async getSalaryStructureByEmployee(employeeId: string, month?: number, year?: number) {
    const m = month || (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();

    const struct = await this.prisma.salaryStructure.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month: m,
          year: y,
        },
      },
      include: { employee: true },
    });

    if (struct) return struct;

    return this.prisma.salaryStructure.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  async getAllSalaryStructures(page = 1, limit = 10, search = '', month?: number, year?: number, distinctEmployees?: boolean) {
    const skip = (page - 1) * limit;
    
    const andConditions: any[] = [];
    if (search && typeof search === 'string') {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        andConditions.push({
          employee: {
            OR: [
              {
                AND: [
                  { firstName: { contains: firstPart, mode: 'insensitive' } },
                  { lastName: { contains: lastPart, mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { firstName: { contains: lastPart, mode: 'insensitive' } },
                  { lastName: { contains: firstPart, mode: 'insensitive' } },
                ],
              },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      } else {
        andConditions.push({
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    if (month) {
      andConditions.push({ month: Number(month) });
    }
    if (year) {
      andConditions.push({ year: Number(year) });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const findOptions: any = {
      where: whereClause,
      include: { employee: { include: { bank: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    };

    if (distinctEmployees) {
      findOptions.distinct = ['employeeId'];
    }

    const [data, total] = await Promise.all([
      this.prisma.salaryStructure.findMany(findOptions),
      distinctEmployees
        ? this.prisma.salaryStructure.groupBy({
            by: ['employeeId'],
            where: whereClause,
          }).then((res) => res.length)
        : this.prisma.salaryStructure.count({ where: whereClause }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async deleteSalaryStructure(id: string) {
    return this.prisma.salaryStructure.delete({
      where: { id },
    });
  }

  // HRA Rent Receipts
  async createRentReceipt(data: any) {
    return this.prisma.hraRentReceipt.create({
      data,
      include: { employee: true },
    });
  }

  async getRentReceipts(page = 1, limit = 10, search = '', month?: number, year?: number, employeeId?: string) {
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    if (employeeId) {
      andConditions.push({ employeeId });
    }

    if (search && typeof search === 'string') {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        andConditions.push({
          OR: [
            {
              employee: {
                OR: [
                  {
                    AND: [
                      { firstName: { contains: firstPart, mode: 'insensitive' } },
                      { lastName: { contains: lastPart, mode: 'insensitive' } },
                    ],
                  },
                  {
                    AND: [
                      { firstName: { contains: lastPart, mode: 'insensitive' } },
                      { lastName: { contains: firstPart, mode: 'insensitive' } },
                    ],
                  },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { employeeId: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
            { landlordName: { contains: search, mode: 'insensitive' } },
          ],
        });
      } else {
        andConditions.push({
          OR: [
            {
              employee: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { employeeId: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
            { landlordName: { contains: search, mode: 'insensitive' } },
          ],
        });
      }
    }

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    } else if (year) {
      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year), 11, 31, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      this.prisma.hraRentReceipt.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.hraRentReceipt.count({ where: whereClause }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async updateRentReceiptStatus(id: string, status: string, verifiedBy?: string, calculatedExemption?: number) {
    return this.prisma.hraRentReceipt.update({
      where: { id },
      data: {
        status,
        verifiedBy,
        verifiedAt: new Date(),
        ...(calculatedExemption !== undefined ? { calculatedExemption } : {}),
      },
      include: { employee: true },
    });
  }

  async findRentReceiptById(id: string) {
    return this.prisma.hraRentReceipt.findUnique({
      where: { id },
      include: { employee: true },
    });
  }

  // Tax Declarations
  async upsertTaxDeclaration(data: any) {
    const existing = await this.prisma.taxDeclaration.findFirst({
      where: { employeeId: data.employeeId, financialYear: data.financialYear },
    });

    if (existing) {
      return this.prisma.taxDeclaration.update({
        where: { id: existing.id },
        data,
        include: { employee: true },
      });
    }

    return this.prisma.taxDeclaration.create({
      data,
      include: { employee: true },
    });
  }

  async getTaxDeclarations(page = 1, limit = 10, search = '', financialYear?: string, employeeId?: string, month?: number, year?: number) {
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    if (employeeId) {
      andConditions.push({ employeeId });
    }
    if (financialYear) {
      andConditions.push({ financialYear });
    }

    if (search && typeof search === 'string') {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        andConditions.push({
          employee: {
            OR: [
              {
                AND: [
                  { firstName: { contains: firstPart, mode: 'insensitive' } },
                  { lastName: { contains: lastPart, mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { firstName: { contains: lastPart, mode: 'insensitive' } },
                  { lastName: { contains: firstPart, mode: 'insensitive' } },
                ],
              },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      } else {
        andConditions.push({
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    } else if (year) {
      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year), 11, 31, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      this.prisma.taxDeclaration.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.taxDeclaration.count({ where: whereClause }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  // Employee Loans
  async createLoan(data: any) {
    return this.prisma.employeeLoan.create({
      data,
      include: { employee: true },
    });
  }

  async getActiveLoans(page = 1, limit = 10, search = '', month?: number, year?: number, employeeId?: string) {
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    andConditions.push({ status: 'ACTIVE' });

    if (employeeId) {
      andConditions.push({ employeeId });
    }

    if (search && typeof search === 'string') {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        andConditions.push({
          employee: {
            OR: [
              {
                AND: [
                  { firstName: { contains: firstPart, mode: 'insensitive' } },
                  { lastName: { contains: lastPart, mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { firstName: { contains: lastPart, mode: 'insensitive' } },
                  { lastName: { contains: firstPart, mode: 'insensitive' } },
                ],
              },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      } else {
        andConditions.push({
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    } else if (year) {
      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year), 11, 31, 23, 59, 59, 999);
      andConditions.push({ createdAt: { gte: startDate, lte: endDate } });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      this.prisma.employeeLoan.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.employeeLoan.count({ where: whereClause }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async updateLoanBalance(loanId: string, recoveredAmount: number) {
    const loan = await this.prisma.employeeLoan.findUnique({ where: { id: loanId } });
    if (!loan) return null;

    const newBalance = Math.max(0, loan.balanceRemaining - recoveredAmount);
    const newStatus = newBalance === 0 ? 'PAID_OFF' : 'ACTIVE';

    return this.prisma.employeeLoan.update({
      where: { id: loanId },
      data: {
        balanceRemaining: newBalance,
        status: newStatus,
      },
    });
  }

  // Monthly Payroll Runs & Payslips
  async getPayrollRun(month: number, year: number) {
    return this.prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: { payslips: { include: { employee: true } } },
    });
  }

  async createOrUpdatePayrollRun(month: number, year: number, status: string, totalEmployees: number, totalGross: number, totalNet: number) {
    return this.prisma.payrollRun.upsert({
      where: { month_year: { month, year } },
      create: { month, year, status, totalEmployees, totalGross, totalNet },
      update: { status, totalEmployees, totalGross, totalNet },
    });
  }

  async approvePayrollRun(month: number, year: number, approvedBy?: string) {
    return this.prisma.payrollRun.update({
      where: { month_year: { month, year } },
      data: {
        status: 'APPROVED',
        approvedBy: approvedBy || 'HR_ADMIN',
        approvedAt: new Date(),
      },
    });
  }

  async deletePayslipsForRun(payrollRunId: string) {
    return this.prisma.payslip.deleteMany({
      where: { payrollRunId },
    });
  }

  async createPayslip(data: any) {
    return this.prisma.payslip.create({
      data,
    });
  }

  async getPayslips(page = 1, limit = 10, search = '', month?: number, year?: number, employeeId?: string) {
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    if (employeeId) {
      andConditions.push({ employeeId });
    }
    if (month) {
      andConditions.push({ month: Number(month) });
    }
    if (year) {
      andConditions.push({ year: Number(year) });
    }

    if (search && typeof search === 'string') {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        andConditions.push({
          employee: {
            OR: [
              {
                AND: [
                  { firstName: { contains: firstPart, mode: 'insensitive' } },
                  { lastName: { contains: lastPart, mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { firstName: { contains: lastPart, mode: 'insensitive' } },
                  { lastName: { contains: firstPart, mode: 'insensitive' } },
                ],
              },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      } else {
        andConditions.push({
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where: whereClause,
        include: { employee: true, payrollRun: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
      this.prisma.payslip.count({ where: whereClause }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async getPayslipById(id: string) {
    return this.prisma.payslip.findUnique({
      where: { id },
      include: { employee: true, payrollRun: true },
    });
  }

  // Active Direct Employees for Payroll
  async getDirectEmployeesForPayroll() {
    return this.prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'ONBOARDING'] } },
      include: {
        salaryStructures: true,
        loans: { where: { status: 'ACTIVE' } },
        taxDeclarations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async bulkImportSalaryStructures(records: Array<{
    employeeCodeOrId: string;
    basicSalary: number;
    hraAmount?: number;
    da?: number;
    conveyance?: number;
    specialAllowance?: number;
    statutoryBonus?: number;
    reimbursements?: number;
    grossSalary?: number;
    pfAmount?: number;
    esiAmount?: number;
    ptAmount?: number;
    taxRegime?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
  }>) {
    const results = {
      total: records.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ row: number; employeeCodeOrId: string; error: string }>,
    };

    const [allEmployees, allBanks] = await Promise.all([
      this.prisma.employee.findMany({
        select: { id: true, employeeId: true, firstName: true, lastName: true, email: true },
      }),
      this.prisma.bank.findMany({ where: { isActive: true } }),
    ]);
    const empMap = new Map<string, string>();
    const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
    const normalizeStripZeros = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/gi, '').replace(/0+(?=\d)/g, '');

    allEmployees.forEach((emp) => {
      empMap.set(emp.id.toLowerCase(), emp.id);
      empMap.set(normalize(emp.id), emp.id);
      if (emp.employeeId) {
        empMap.set(emp.employeeId.toLowerCase(), emp.id);
        empMap.set(normalize(emp.employeeId), emp.id);
        empMap.set(normalizeStripZeros(emp.employeeId), emp.id);
      }
      if (emp.email) {
        empMap.set(emp.email.toLowerCase(), emp.id);
        empMap.set(normalize(emp.email), emp.id);
      }
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      if (fullName) {
        empMap.set(fullName.toLowerCase(), emp.id);
        empMap.set(normalize(fullName), emp.id);
      }
    });

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const rowNum = i + 1;
      const rawCode = (rec.employeeCodeOrId || '').trim();

      if (!rawCode) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rawCode, error: 'Employee ID or Code is missing' });
        continue;
      }

      let empId = empMap.get(rawCode.toLowerCase()) || 
                  empMap.get(normalize(rawCode)) || 
                  empMap.get(normalizeStripZeros(rawCode));

      if (!empId) {
        const normRaw = normalize(rawCode);
        if (normRaw && normRaw.length > 2) {
          const match = allEmployees.find(e => {
            const normEmpId = normalize(e.employeeId);
            return normEmpId && normEmpId.length > 2 && (normEmpId.includes(normRaw) || normRaw.includes(normEmpId));
          });
          if (match) empId = match.id;
        }
      }

      if (!empId) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rawCode, error: `Employee not found for code/ID/Name "${rawCode}"` });
        continue;
      }

      const basic = Number(rec.basicSalary || 0);
      if (basic <= 0) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rec.employeeCodeOrId, error: 'Basic salary must be greater than 0' });
        continue;
      }

      try {
        const hra = Number(rec.hraAmount ?? Math.round(basic * 0.4));
        const da = Number(rec.da ?? 0);
        const conv = Number(rec.conveyance ?? 1600);
        const special = Number(rec.specialAllowance ?? 0);
        const bonus = Number(rec.statutoryBonus ?? 0);
        const reimb = Number(rec.reimbursements ?? 0);
        const computedGross = basic + hra + da + conv + special + bonus + reimb;
        const gross = Number(rec.grossSalary ?? computedGross);

        const pf = Number(rec.pfAmount ?? Math.min(basic * 0.12, 1800));
        const esi = Number(rec.esiAmount ?? (gross <= 21000 ? Math.round(gross * 0.0075) : 0));
        const pt = Number(rec.ptAmount ?? (gross >= 20000 ? 200 : gross >= 15000 ? 150 : 0));
        const regime = rec.taxRegime || 'NEW';

        const dataPayload = {
          employeeId: empId,
          basicSalary: basic,
          hraAmount: hra,
          da: da,
          conveyance: conv,
          specialAllowance: special,
          statutoryBonus: bonus,
          reimbursements: reimb,
          grossSalary: gross,
          pfAmount: pf,
          esiAmount: esi,
          ptAmount: pt,
          taxRegime: regime,
        };

        if (rec.bankName || rec.accountNumber || rec.ifscCode || rec.panNumber) {
          let bId: number | undefined = undefined;
          let bName = rec.bankName;

          if (bName) {
            const foundB = allBanks.find((b) => b.name.toLowerCase() === bName!.toLowerCase());
            if (foundB) {
              bId = foundB.id;
              bName = foundB.name;
            }
          }

          await this.prisma.employee.update({
            where: { id: empId },
            data: {
              ...(bId !== undefined ? { bankId: bId } : {}),
              ...(rec.accountNumber ? { accountNumber: rec.accountNumber } : {}),
              ...(rec.ifscCode ? { ifscCode: rec.ifscCode } : {}),
              ...(rec.panNumber ? { panNumber: rec.panNumber } : {}),
            },
          });
        }

        await this.upsertSalaryStructure(dataPayload);

        results.successCount++;
      } catch (err: any) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rec.employeeCodeOrId, error: err.message || 'Save error' });
      }
    }

    return results;
  }

  async getSalaryMatrixData(department?: string, search?: string) {
    let empWhere: any = {};
    if (department && department !== 'ALL') {
      empWhere.department = department;
    }
    if (search) {
      const searchParts = search.trim().split(/\s+/).filter(Boolean);
      if (searchParts.length >= 2) {
        const firstPart = searchParts[0];
        const lastPart = searchParts.slice(1).join(" ");
        empWhere.OR = [
          {
            AND: [
              { firstName: { contains: firstPart, mode: 'insensitive' } },
              { lastName: { contains: lastPart, mode: 'insensitive' } },
            ],
          },
          {
            AND: [
              { firstName: { contains: lastPart, mode: 'insensitive' } },
              { lastName: { contains: firstPart, mode: 'insensitive' } },
            ],
          },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        empWhere.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const employees = await this.prisma.employee.findMany({
      where: empWhere,
      include: {
        bank: true,
        salaryStructures: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    return employees.map((emp) => {
      const s = emp.salaryStructures?.[0];
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        department: emp.department,
        designation: emp.designation,
        basicSalary: s?.basicSalary || 0,
        hraAmount: s?.hraAmount || 0,
        da: s?.da || 0,
        conveyance: s?.conveyance || 0,
        specialAllowance: s?.specialAllowance || 0,
        statutoryBonus: s?.statutoryBonus || 0,
        reimbursements: s?.reimbursements || 0,
        pfAmount: s?.pfAmount || 0,
        esiAmount: s?.esiAmount || 0,
        ptAmount: s?.ptAmount || 0,
        taxRegime: s?.taxRegime || 'NEW',
        bankId: emp.bankId || emp.bank?.id || undefined,
        accountNumber: emp.accountNumber || '',
        ifscCode: emp.ifscCode || '',
        panNumber: emp.panNumber || '',
      };
    });
  }

  async batchSaveSalaryMatrix(records: any[]) {
    let successCount = 0;
    for (const rec of records) {
      if (!rec.employeeId) continue;
      const basic = Number(rec.basicSalary || 0);
      const hra = Number(rec.hraAmount || 0);
      const da = Number(rec.da || 0);
      const conv = Number(rec.conveyance || 0);
      const special = Number(rec.specialAllowance || 0);
      const bonus = Number(rec.statutoryBonus || 0);
      const reimb = Number(rec.reimbursements || 0);
      const gross = basic + hra + da + conv + special + bonus + reimb;

      await this.upsertSalaryStructure({
        employeeId: rec.employeeId,
        basicSalary: basic,
        hraAmount: hra,
        da,
        conveyance: conv,
        specialAllowance: special,
        statutoryBonus: bonus,
        reimbursements: reimb,
        grossSalary: gross,
        pfAmount: Number(rec.pfAmount || 0),
        esiAmount: Number(rec.esiAmount || 0),
        ptAmount: Number(rec.ptAmount || 0),
        taxRegime: rec.taxRegime || 'NEW',
        bankId: rec.bankId ? Number(rec.bankId) : undefined,
        accountNumber: rec.accountNumber || '',
        ifscCode: rec.ifscCode || '',
        panNumber: rec.panNumber || '',
      });
      successCount++;
    }
    return { successCount, total: records.length };
  }

  async copyPreviousMonthSalaries(fromMonth?: number, fromYear?: number, toMonth?: number, toYear?: number) {
    const fMonth = fromMonth ? Number(fromMonth) : 6;
    const fYear = fromYear ? Number(fromYear) : new Date().getFullYear();
    const tMonth = toMonth ? Number(toMonth) : 7;
    const tYear = toYear ? Number(toYear) : new Date().getFullYear();

    // 1. Fetch salary structures for source month & year
    let sourceStructures = await this.prisma.salaryStructure.findMany({
      where: {
        month: fMonth,
        year: fYear,
      },
      include: {
        employee: {
          include: { bank: true },
        },
      },
    });

    // Fallback 1: If no structures for specific month/year, fetch latest structure per employee
    if (sourceStructures.length === 0) {
      const allStructs = await this.prisma.salaryStructure.findMany({
        include: { employee: { include: { bank: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const empMap = new Map();
      for (const s of allStructs) {
        if (!empMap.has(s.employeeId)) empMap.set(s.employeeId, s);
      }
      sourceStructures = Array.from(empMap.values());
    }

    // Fallback 2: If still empty, populate default structures for all employees
    if (sourceStructures.length === 0) {
      const employees = await this.prisma.employee.findMany({ include: { bank: true } });
      for (const emp of employees) {
        await this.upsertSalaryStructure({
          employeeId: emp.id,
          month: tMonth,
          year: tYear,
          basicSalary: 20000,
          hraAmount: 8000,
          da: 4000,
          conveyance: 0,
          specialAllowance: 0,
          statutoryBonus: 0,
          reimbursements: 0,
          grossSalary: 32000,
          pfAmount: 1800,
          esiAmount: 0,
          ptAmount: 200,
          taxRegime: 'NEW',
          effectiveFrom: new Date(tYear, tMonth - 1, 1),
          bankId: emp.bankId || emp.bank?.id || undefined,
          accountNumber: emp.accountNumber || '',
          ifscCode: emp.ifscCode || '',
          panNumber: emp.panNumber || '',
        });
      }
      return {
        copiedCount: employees.length,
        totalEmployees: employees.length,
        fromMonth: fMonth,
        fromYear: fYear,
        toMonth: tMonth,
        toYear: tYear,
        message: `Transferred default salary structures to period (${tMonth}/${tYear}) for ${employees.length} employees.`,
      };
    }

    const targetEffectiveDate = new Date(tYear, tMonth - 1, 1);

    let copiedCount = 0;
    for (const s of sourceStructures) {
      const emp = s.employee;
      if (!emp) continue;

      await this.upsertSalaryStructure({
        employeeId: emp.id,
        month: tMonth,
        year: tYear,
        basicSalary: s.basicSalary,
        hraAmount: s.hraAmount,
        da: s.da,
        conveyance: s.conveyance,
        specialAllowance: s.specialAllowance,
        statutoryBonus: s.statutoryBonus,
        reimbursements: s.reimbursements,
        grossSalary: s.grossSalary,
        pfAmount: s.pfAmount,
        esiAmount: s.esiAmount,
        ptAmount: s.ptAmount,
        taxRegime: s.taxRegime,
        effectiveFrom: targetEffectiveDate,
        bankId: emp.bankId || emp.bank?.id || undefined,
        accountNumber: emp.accountNumber || '',
        ifscCode: emp.ifscCode || '',
        panNumber: emp.panNumber || '',
      });
      copiedCount++;
    }

    return {
      copiedCount,
      totalEmployees: sourceStructures.length,
      fromMonth: fMonth,
      fromYear: fYear,
      toMonth: tMonth,
      toYear: tYear,
      message: `Successfully transferred ${copiedCount} salary structures from period (${fMonth}/${fYear}) to (${tMonth}/${tYear}).`,
    };
  }
}
