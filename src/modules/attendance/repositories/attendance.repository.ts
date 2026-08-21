import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, AttendanceStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildEmployeeSearchConditions } from '../../../common/utils/search.util';

function parseCsvDateToUTC(rawDate: string): Date | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  let str = rawDate.trim().replace(/^"(.*)"$/, '$1').trim();
  if (!str) return null;

  const dateOnly = str.includes('T') ? str.split('T')[0] : str.split(' ')[0];

  const monthMap: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  const parts = dateOnly.split(/[\/\-\.\s]/);
  let year: number = 0, month: number = 0, day: number = 0;

  if (parts.length === 3) {
    let p0Str = parts[0].trim();
    let p1Str = parts[1].trim();
    let p2Str = parts[2].trim();

    if (monthMap[p1Str.toLowerCase()]) {
      day = parseInt(p0Str, 10);
      month = monthMap[p1Str.toLowerCase()];
      const yVal = parseInt(p2Str, 10);
      year = yVal < 100 ? (yVal < 70 ? 2000 + yVal : 1900 + yVal) : yVal;
    } else if (monthMap[p0Str.toLowerCase()]) {
      month = monthMap[p0Str.toLowerCase()];
      day = parseInt(p1Str, 10);
      const yVal = parseInt(p2Str, 10);
      year = yVal < 100 ? (yVal < 70 ? 2000 + yVal : 1900 + yVal) : yVal;
    } else {
      const p0 = parseInt(p0Str, 10);
      const p1 = parseInt(p1Str, 10);
      const p2 = parseInt(p2Str, 10);

      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (p0 > 1000) {
          year = p0;
          month = p1;
          day = p2;
        } else {
          year = p2 < 100 ? (p2 < 70 ? 2000 + p2 : 1900 + p2) : p2;

          if (p1 <= 12 && p0 <= 31) {
            day = p0;
            month = p1;
          } else if (p0 <= 12 && p1 <= 31) {
            month = p0;
            day = p1;
          } else {
            day = p0;
            month = p1;
          }
        }
      }
    }

    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  const parsed = new Date(dateOnly);
  if (!isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
  }

  return null;
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findManyShifts(query: PaginationQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'asc').toLowerCase();
    } else {
      orderBy.name = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.shift.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createShift(dto: { name: string; startTime: string; endTime: string }) {
    return this.prisma.shift.create({
      data: dto,
    });
  }

  async updateShift(id: string, dto: any) {
    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async deleteShift(id: string) {
    // Delete rosters referencing this shift first
    await this.prisma.shiftRoster.deleteMany({ where: { shiftId: id } });
    return this.prisma.shift.delete({
      where: { id },
    });
  }

  async findManyRosters(
    query: PaginationQueryDto & {
      employeeId?: string;
      shiftId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      month?: string | number;
      year?: string | number;
    } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || (query.month || query.year || query.startDate ? 1000 : 10);
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftRosterWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { shift: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.shiftId) {
      where.shiftId = query.shiftId;
    }
    if (query.departmentId && query.departmentId !== 'ALL') {
      where.employee = { departmentId: query.departmentId };
    }

    if (query.startDate && query.endDate) {
      where.date = {
        gte: new Date(`${query.startDate}T00:00:00.000Z`),
        lte: new Date(`${query.endDate}T23:59:59.999Z`),
      };
    } else if (query.startDate) {
      where.date = { gte: new Date(`${query.startDate}T00:00:00.000Z`) };
    } else if (query.year && query.month) {
      const y = Number(query.year);
      const m = Number(query.month) - 1;
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.date = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.shiftRoster.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            include: { department: true },
          },
          shift: true,
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy,
      }),
      this.prisma.shiftRoster.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createRoster(dto: {
    employeeId: string;
    shiftId: string;
    date: string;
    departmentId?: string;
    managedByHod?: string;
    reason?: string;
    changedByName?: string;
    changedByRole?: string;
  }) {
    const targetDate = new Date(dto.date);
    const newShift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    
    // Check if a roster already exists for this employee and date
    const existing = await this.prisma.shiftRoster.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: targetDate,
      },
      include: { shift: true },
    });

    let roster;
    if (existing) {
      roster = await this.prisma.shiftRoster.update({
        where: { id: existing.id },
        data: {
          shiftId: dto.shiftId,
          departmentId: dto.departmentId || existing.departmentId,
          managedByHod: dto.managedByHod || existing.managedByHod,
          reason: dto.reason || existing.reason,
        },
        include: {
          employee: { include: { department: true } },
          shift: true,
        },
      });

      // Log Audit Trail
      await this.prisma.shiftAuditLog.create({
        data: {
          rosterId: roster.id,
          employeeId: dto.employeeId,
          oldShiftId: existing.shiftId,
          oldShiftName: existing.shift?.name || 'Unassigned',
          newShiftId: dto.shiftId,
          newShiftName: newShift?.name || 'Assigned Shift',
          rosterDate: targetDate,
          changedByName: dto.changedByName || dto.managedByHod || 'HOD / HR',
          changedByRole: dto.changedByRole || 'HOD',
          reason: dto.reason || 'Shift updated by HOD',
        },
      });
    } else {
      roster = await this.prisma.shiftRoster.create({
        data: {
          employeeId: dto.employeeId,
          shiftId: dto.shiftId,
          date: targetDate,
          departmentId: dto.departmentId,
          managedByHod: dto.managedByHod,
          reason: dto.reason,
        },
        include: {
          employee: { include: { department: true } },
          shift: true,
        },
      });

      // Log Initial Audit Trail
      await this.prisma.shiftAuditLog.create({
        data: {
          rosterId: roster.id,
          employeeId: dto.employeeId,
          oldShiftId: null,
          oldShiftName: 'None (Initial Assignment)',
          newShiftId: dto.shiftId,
          newShiftName: newShift?.name || 'Assigned Shift',
          rosterDate: targetDate,
          changedByName: dto.changedByName || dto.managedByHod || 'HOD / HR',
          changedByRole: dto.changedByRole || 'HOD',
          reason: dto.reason || 'Initial shift allocation by HOD',
        },
      });
    }

    return roster;
  }

  async bulkCreateRosters(dto: {
    departmentId?: string;
    employeeIds: string[];
    shiftId: string;
    startDate: string;
    endDate: string;
    daysOfWeek?: number[];
    reason?: string;
    managedByHod?: string;
    changedByName?: string;
    changedByRole?: string;
  }) {
    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) {
      throw new Error('Selected shift does not exist.');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const daysOfWeek = Array.isArray(dto.daysOfWeek) && dto.daysOfWeek.length > 0
      ? dto.daysOfWeek.map(Number)
      : null;

    let processedCount = 0;
    const auditLogsToCreate: Prisma.ShiftAuditLogCreateManyInput[] = [];

    // Loop through date range
    const curDate = new Date(start);
    while (curDate <= end) {
      const dayOfWeek = curDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      if (!daysOfWeek || daysOfWeek.includes(dayOfWeek)) {
        const rosterDate = new Date(curDate);

        for (const employeeId of dto.employeeIds) {
          const existing = await this.prisma.shiftRoster.findFirst({
            where: {
              employeeId,
              date: rosterDate,
            },
            include: { shift: true },
          });

          let rosterId: string;
          let oldShiftId: string | null = null;
          let oldShiftName: string = 'None (Initial Assignment)';

          if (existing) {
            oldShiftId = existing.shiftId;
            oldShiftName = existing.shift?.name || 'Unassigned';
            const updated = await this.prisma.shiftRoster.update({
              where: { id: existing.id },
              data: {
                shiftId: dto.shiftId,
                departmentId: dto.departmentId || existing.departmentId,
                managedByHod: dto.managedByHod || existing.managedByHod,
                reason: dto.reason || existing.reason,
              },
            });
            rosterId = updated.id;
          } else {
            const created = await this.prisma.shiftRoster.create({
              data: {
                employeeId,
                shiftId: dto.shiftId,
                date: rosterDate,
                departmentId: dto.departmentId,
                managedByHod: dto.managedByHod,
                reason: dto.reason,
              },
            });
            rosterId = created.id;
          }

          auditLogsToCreate.push({
            rosterId,
            employeeId,
            oldShiftId,
            oldShiftName,
            newShiftId: dto.shiftId,
            newShiftName: shift.name,
            rosterDate,
            changedByName: dto.changedByName || dto.managedByHod || 'Department HOD',
            changedByRole: dto.changedByRole || 'HOD',
            reason: dto.reason || (existing ? 'Bulk shift change' : 'Bulk schedule assignment'),
          });

          processedCount++;
        }
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    if (auditLogsToCreate.length > 0) {
      await this.prisma.shiftAuditLog.createMany({
        data: auditLogsToCreate,
      });
    }

    return {
      message: `Successfully scheduled shifts for ${dto.employeeIds.length} employee(s) across ${processedCount} shift slots.`,
      totalAssigned: processedCount,
      logsCount: auditLogsToCreate.length,
    };
  }

  async changeShift(
    rosterId: string,
    dto: {
      newShiftId: string;
      reason?: string;
      changedById?: string;
      changedByName?: string;
      changedByRole?: string;
    },
  ) {
    const currentRoster = await this.prisma.shiftRoster.findUnique({
      where: { id: rosterId },
      include: { shift: true, employee: true },
    });

    if (!currentRoster) {
      throw new Error('Shift roster entry not found.');
    }

    const newShift = await this.prisma.shift.findUnique({
      where: { id: dto.newShiftId },
    });

    if (!newShift) {
      throw new Error('New shift definition not found.');
    }

    const updated = await this.prisma.shiftRoster.update({
      where: { id: rosterId },
      data: {
        shiftId: dto.newShiftId,
        reason: dto.reason || currentRoster.reason,
      },
      include: {
        employee: { include: { department: true } },
        shift: true,
      },
    });

    // Record Audit Log
    const auditLog = await this.prisma.shiftAuditLog.create({
      data: {
        rosterId,
        employeeId: currentRoster.employeeId,
        oldShiftId: currentRoster.shiftId,
        oldShiftName: currentRoster.shift?.name || 'Unassigned',
        newShiftId: dto.newShiftId,
        newShiftName: newShift.name,
        rosterDate: currentRoster.date,
        changedById: dto.changedById,
        changedByName: dto.changedByName || 'Department HOD',
        changedByRole: dto.changedByRole || 'HOD',
        reason: dto.reason || 'Shift changed by HOD',
      },
      include: {
        employee: { include: { department: true } },
      },
    });

    return { updatedRoster: updated, auditLog };
  }

  async findManyShiftAuditLogs(
    query: PaginationQueryDto & {
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 15;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftAuditLogWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { oldShiftName: { contains: query.search, mode: 'insensitive' } },
        { newShiftName: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { changedByName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.departmentId && query.departmentId !== 'ALL') {
      where.employee = { departmentId: query.departmentId };
    }
    if (query.startDate && query.endDate) {
      where.rosterDate = {
        gte: new Date(`${query.startDate}T00:00:00.000Z`),
        lte: new Date(`${query.endDate}T23:59:59.999Z`),
      };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.shiftAuditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { include: { department: true } },
          roster: { include: { shift: true } },
        },
        orderBy,
      }),
      this.prisma.shiftAuditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async updateRoster(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    return this.prisma.shiftRoster.update({
      where: { id },
      data: dto,
      include: {
        employee: { include: { department: true } },
        shift: true,
      },
    });
  }

  async deleteRoster(id: string) {
    return this.prisma.shiftRoster.delete({
      where: { id },
    });
  }

  async findManyAttendance(
    query: PaginationQueryDto & { employeeId?: string; status?: string; date?: string; month?: string | number; year?: string | number; departmentId?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || (query.month || query.year ? 1000 : 10);
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};
    if (query.search) {
      const empConds = buildEmployeeSearchConditions(query.search);
      const searchUpper = query.search.toUpperCase().trim();
      const isValidStatus = Object.values(AttendanceStatus).includes(searchUpper as any);
      where.OR = [
        ...empConds.map((cond) => ({ employee: cond })),
        { shiftName: { contains: query.search, mode: 'insensitive' } },
        ...(isValidStatus ? [{ status: searchUpper as AttendanceStatus }] : []),
        { captureMethod: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.departmentId) {
      where.employee = { departmentId: query.departmentId };
    }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as AttendanceStatus;
    }
    if (query.date) {
      where.date = new Date(query.date);
    } else if (query.year) {
      const y = Number(query.year);
      if (!isNaN(y)) {
        const m = Number(query.month);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
          const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
          where.date = { gte: startDate, lte: endDate };
        } else {
          const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
          const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
          where.date = { gte: startDate, lte: endDate };
        }
      }
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = (query.sortOrder || 'desc').toLowerCase();
    } else {
      orderBy.date = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            include: { department: true },
          },
          shift: true,
        },
        orderBy,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async captureAttendance(dto: {
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    shiftId?: string;
    shiftName?: string;
    totalWorkHours?: number;
    otHours?: number;
    lateHours?: number;
    earlyGoingHours?: number;
    presentDay?: number;
    isHalfDay?: boolean;
    isSundayPresent?: boolean;
    isFullNightPresent?: boolean;
    isHolidayPresent?: boolean;
    captureMethod?: string;
  }) {
    const dateObj = new Date(dto.date);
    const existing = await this.prisma.attendance.findFirst({
      where: { employeeId: dto.employeeId, date: dateObj },
    });

    const dataPayload = {
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      status: (dto.status || 'PRESENT') as AttendanceStatus,
      shiftId: dto.shiftId || null,
      shiftName: dto.shiftName || null,
      totalWorkHours: dto.totalWorkHours,
      otHours: dto.otHours,
      lateHours: dto.lateHours,
      earlyGoingHours: dto.earlyGoingHours,
      presentDay: dto.presentDay,
      isHalfDay: dto.isHalfDay,
      isSundayPresent: dto.isSundayPresent,
      isFullNightPresent: dto.isFullNightPresent,
      isHolidayPresent: dto.isHolidayPresent,
      captureMethod: dto.captureMethod || 'BIOMETRIC',
    };

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: dataPayload as any,
      });
    } else {
      return this.prisma.attendance.create({
        data: {
          employeeId: dto.employeeId,
          date: dateObj,
          ...dataPayload,
        } as any,
      });
    }
  }

  async updateAttendance(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    if (dto.checkIn) dto.checkIn = new Date(dto.checkIn);
    if (dto.checkOut) dto.checkOut = new Date(dto.checkOut);
    return this.prisma.attendance.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAttendance(id: string) {
    return this.prisma.attendance.delete({
      where: { id },
    });
  }

  async bulkImportAttendance(records: Array<{
    employeeCodeOrId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    shiftName?: string;
    totalWorkHours?: number;
    otHours?: number;
    lateHours?: number;
    earlyGoingHours?: number;
    presentDay?: number;
    isHalfDay?: boolean;
    isSundayPresent?: boolean;
    isFullNightPresent?: boolean;
    isHolidayPresent?: boolean;
    captureMethod?: string;
  }>) {
    const results = {
      total: records.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ row: number; employeeCodeOrId: string; error: string }>,
    };

    // Cache and index employees and shifts with flexible normalizers
    const allEmployees = await this.prisma.employee.findMany({
      select: { id: true, employeeId: true },
    });

    const allShifts = await this.prisma.shift.findMany({
      select: { id: true, name: true, startTime: true, endTime: true },
    });

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
    });

    const shiftMap = new Map<string, { id: string; name: string }>();
    allShifts.forEach((s) => {
      shiftMap.set(s.name.toLowerCase().trim(), { id: s.id, name: s.name });
      shiftMap.set(normalize(s.name), { id: s.id, name: s.name });
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
        // Fallback partial matching
        const match = allEmployees.find(e => 
          normalize(e.employeeId).includes(normalize(rawCode)) ||
          normalize(rawCode).includes(normalize(e.employeeId))
        );
        if (match) empId = match.id;
      }

      if (!empId) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rawCode, error: `Employee not found for code/ID "${rawCode}"` });
        continue;
      }

      const dateObj = parseCsvDateToUTC(rec.date);
      if (!dateObj) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rawCode, error: `Invalid date format "${rec.date}"` });
        continue;
      }

      // Validate Shift Name if provided in CSV
      const rawShiftName = (rec.shiftName || '').trim();
      let matchedShift = rawShiftName ? (shiftMap.get(rawShiftName.toLowerCase()) || shiftMap.get(normalize(rawShiftName))) : null;

      if (rawShiftName && !matchedShift) {
        results.failureCount++;
        results.errors.push({
          row: rowNum,
          employeeCodeOrId: rawCode,
          error: `Invalid Shift "${rawShiftName}". Allowed shifts: ${allShifts.map((s) => s.name).join(', ')}`,
        });
        continue;
      }

      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth();
      const day = dateObj.getUTCDate();

      const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const noonDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

      // Validate against employee's assigned roster for that date
      const assignedRoster = await this.prisma.shiftRoster.findFirst({
        where: {
          employeeId: empId,
          date: { gte: dayStart, lte: dayEnd },
        },
        include: { shift: true },
      });

      if (rawShiftName && assignedRoster && assignedRoster.shift) {
        const rosterShiftNorm = normalize(assignedRoster.shift.name);
        const importShiftNorm = normalize(rawShiftName);
        if (rosterShiftNorm !== importShiftNorm) {
          results.failureCount++;
          results.errors.push({
            row: rowNum,
            employeeCodeOrId: rawCode,
            error: `Wrong Shift: Employee "${rawCode}" is scheduled for "${assignedRoster.shift.name}" on ${rec.date}, but import row specified "${rawShiftName}"`,
          });
          continue;
        }
      }

      const finalShiftId = matchedShift?.id || assignedRoster?.shiftId || allShifts[0]?.id;
      const finalShiftName = matchedShift?.name || assignedRoster?.shift?.name || 'General Shift';

      try {
        const parseTimeToHM = (rawTime?: string): { h: number; m: number } | null => {
          if (!rawTime || typeof rawTime !== 'string') return null;
          let str = rawTime.trim();
          if (!str) return null;
          if (str.includes('T')) {
            str = str.split('T')[1];
          }
          const parts = str.split(':');
          if (parts.length >= 2) {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
              return { h, m };
            }
          }
          return null;
        };

        // Safe Date Parsing for checkIn
        let checkInDate: Date | null = null;
        if (rec.checkIn) {
          const hm = parseTimeToHM(String(rec.checkIn));
          if (hm) {
            checkInDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), hm.h, hm.m, 0));
          }
        }

        // Safe Date Parsing for checkOut
        let checkOutDate: Date | null = null;
        if (rec.checkOut) {
          const hm = parseTimeToHM(String(rec.checkOut));
          if (hm) {
            checkOutDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), hm.h, hm.m, 0));
          }
        }

        // Safe Number Calculation for totalWorkHours
        let workHours = Number(rec.totalWorkHours);
        if (isNaN(workHours) || workHours <= 0) {
          if (checkInDate && checkOutDate) {
            const diffMs = checkOutDate.getTime() - checkInDate.getTime();
            const calculated = diffMs / (1000 * 60 * 60);
            workHours = !isNaN(calculated) && calculated > 0 ? parseFloat(calculated.toFixed(2)) : 8.0;
          } else {
            workHours = 8.0;
          }
        }

        let rawStatus = (rec.status || 'PRESENT').toUpperCase().trim();
        let status = 'PRESENT';
        let isHalfDay = Boolean(rec.isHalfDay);

        if (rawStatus === 'HALFDAY' || rawStatus === 'HD' || rawStatus === 'HALF DAY' || rawStatus === 'HALF_DAY') {
          status = 'HALFDAY';
          isHalfDay = true;
        } else if (rawStatus === 'ABSENT' || rawStatus === 'A') {
          status = 'ABSENT';
        } else if (rawStatus === 'CASUAL_LEAVE' || rawStatus === 'CL' || rawStatus === 'LEAVE') {
          status = 'ABSENT'; // Map leave to ABSENT in attendance status
        } else if (rawStatus === 'SICK_LEAVE' || rawStatus === 'SL') {
          status = 'ABSENT'; // Map leave to ABSENT in attendance status
        } else {
          status = 'PRESENT';
        }

        const dataPayload = {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: status as AttendanceStatus,
          shiftId: finalShiftId,
          shiftName: finalShiftName,
          totalWorkHours: workHours,
          otHours: isNaN(Number(rec.otHours)) ? 0 : Number(rec.otHours),
          lateHours: isNaN(Number(rec.lateHours)) ? 0 : Number(rec.lateHours),
          earlyGoingHours: isNaN(Number(rec.earlyGoingHours)) ? 0 : Number(rec.earlyGoingHours),
          presentDay: isHalfDay ? 0.5 : (isNaN(Number(rec.presentDay)) ? 1.0 : Number(rec.presentDay)),
          isHalfDay,
          isSundayPresent: Boolean(rec.isSundayPresent ?? false),
          isFullNightPresent: Boolean(rec.isFullNightPresent ?? false),
          isHolidayPresent: Boolean(rec.isHolidayPresent ?? false),
          captureMethod: rec.captureMethod || 'EXCEL_IMPORT',
        };

        const year = dateObj.getUTCFullYear();
        const month = dateObj.getUTCMonth();
        const day = dateObj.getUTCDate();

        const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
        const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        const noonDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

        const existing = await this.prisma.attendance.findFirst({
          where: {
            employeeId: empId,
            date: { gte: dayStart, lte: dayEnd },
          },
        });

        if (existing) {
          await this.prisma.attendance.update({
            where: { id: existing.id },
            data: {
              date: noonDate,
              ...dataPayload,
            } as any,
          });
        } else {
          await this.prisma.attendance.create({
            data: {
              employeeId: empId,
              date: noonDate,
              ...dataPayload,
            } as any,
          });
        }
        results.successCount++;
      } catch (err: any) {
        results.failureCount++;
        results.errors.push({ row: rowNum, employeeCodeOrId: rawCode, error: err.message || 'Save error' });
      }
    }

    return results;
  }

  // --- Break Misuse Incidents Repository Methods ---
  async findManyBreakIncidents(query: PaginationQueryDto & { employeeId?: string; departmentId?: string; date?: string } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    try {
      if ((this.prisma as any).breakMisuseIncident) {
        const where: any = {};
        if (query.employeeId) where.employeeId = query.employeeId;
        if (query.departmentId) where.employee = { departmentId: query.departmentId };
        if (query.date) where.incidentDate = new Date(query.date);

        const [total, data] = await Promise.all([
          (this.prisma as any).breakMisuseIncident.count({ where }),
          (this.prisma as any).breakMisuseIncident.findMany({
            where,
            skip,
            take: limit,
            orderBy: { incidentDate: 'desc' },
            include: { employee: { include: { department: true } } },
          }),
        ]);
        return { data, total, page, limit };
      }
    } catch (e) {
      // fallback to raw query
    }

    // Direct SQL fallback
    try {
      let whereClause = 'WHERE 1=1';
      if (query.employeeId) whereClause += ` AND b."employeeId" = '${query.employeeId}'`;
      if (query.date) whereClause += ` AND DATE(b."incidentDate") = DATE('${query.date}')`;

      const rows: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT b.*, 
          e."firstName", e."lastName", e."employeeId" as "empCode", e."departmentId",
          d."name" as "departmentName"
        FROM "BreakMisuseIncident" b
        LEFT JOIN "Employee" e ON b."employeeId" = e."id"
        LEFT JOIN "Department" d ON e."departmentId" = d."id"
        ${whereClause}
        ORDER BY b."incidentDate" DESC
        LIMIT ${limit} OFFSET ${skip}
      `);

      const countResult: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total FROM "BreakMisuseIncident" b ${whereClause}
      `);
      const total = countResult[0]?.total || rows.length;

      const formatted = rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        attendanceId: r.attendanceId,
        incidentDate: r.incidentDate,
        breakType: r.breakType,
        excessMinutes: r.excessMinutes,
        deductionHours: r.deductionHours,
        severity: r.severity,
        complaintDetails: r.complaintDetails,
        reportedByHodId: r.reportedByHodId,
        reportedByName: r.reportedByName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        employee: {
          id: r.employeeId,
          firstName: r.firstName,
          lastName: r.lastName,
          employeeId: r.empCode,
          department: r.departmentName ? { name: r.departmentName } : null,
        },
      }));

      return { data: formatted, total, page, limit };
    } catch (err) {
      return { data: [], total: 0, page, limit };
    }
  }

  async createBreakIncident(dto: any) {
    const incidentDate = new Date(dto.incidentDate || new Date());
    const excessMinutes = Number(dto.excessMinutes || 0);
    const deductionHours = Number(dto.deductionHours || (excessMinutes / 60).toFixed(2));
    const severity = dto.severity || 'WARNING';

    // 1. Check for existing attendance on that day
    const year = incidentDate.getUTCFullYear();
    const month = incidentDate.getUTCMonth();
    const day = incidentDate.getUTCDate();
    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    const attRecord = await this.prisma.attendance.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    let savedIncident: any = null;

    try {
      if ((this.prisma as any).breakMisuseIncident) {
        savedIncident = await (this.prisma as any).breakMisuseIncident.create({
          data: {
            employeeId: dto.employeeId,
            attendanceId: attRecord?.id || undefined,
            incidentDate,
            breakType: dto.breakType || 'LUNCH_BREAK',
            excessMinutes,
            deductionHours,
            severity,
            complaintDetails: dto.complaintDetails || '',
            reportedByHodId: dto.reportedByHodId || undefined,
            reportedByName: dto.reportedByName || 'Department HOD',
          },
          include: { employee: true },
        });
      }
    } catch (e) {
      // fallback to raw query
    }

    if (!savedIncident) {
      const generatedId = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "BreakMisuseIncident" 
          ("id", "employeeId", "attendanceId", "incidentDate", "breakType", "excessMinutes", "deductionHours", "severity", "complaintDetails", "reportedByHodId", "reportedByName", "createdAt", "updatedAt")
          VALUES (
            '${generatedId}',
            '${dto.employeeId}',
            ${attRecord ? `'${attRecord.id}'` : 'NULL'},
            '${incidentDate.toISOString()}',
            '${dto.breakType || 'LUNCH_BREAK'}',
            ${excessMinutes},
            ${deductionHours},
            '${severity}',
            '${(dto.complaintDetails || '').replace(/'/g, "''")}',
            ${dto.reportedByHodId ? `'${dto.reportedByHodId}'` : 'NULL'},
            '${(dto.reportedByName || 'Department HOD').replace(/'/g, "''")}',
            NOW(),
            NOW()
          )
        `);
      } catch (err) {
        await this.prisma.$executeRawUnsafe(`
          INSERT INTO "BreakMisuseIncident" 
          ("id", "employeeId", "attendanceId", "incidentDate", "breakType", "excessMinutes", "deductionHours", "severity", "complaintDetails", "reportedByHodId", "reportedByName", "createdAt")
          VALUES (
            '${generatedId}',
            '${dto.employeeId}',
            ${attRecord ? `'${attRecord.id}'` : 'NULL'},
            '${incidentDate.toISOString()}',
            '${dto.breakType || 'LUNCH_BREAK'}',
            ${excessMinutes},
            ${deductionHours},
            '${severity}',
            '${(dto.complaintDetails || '').replace(/'/g, "''")}',
            ${dto.reportedByHodId ? `'${dto.reportedByHodId}'` : 'NULL'},
            '${(dto.reportedByName || 'Department HOD').replace(/'/g, "''")}',
            NOW()
          )
        `);
      }
      savedIncident = { id: generatedId, ...dto, incidentDate, excessMinutes, deductionHours, severity };
    }

    // 2. Adjust Attendance penalty
    if (attRecord) {
      const currentWorkHours = Number(attRecord.totalWorkHours || 8.0);
      const newWorkHours = Math.max(0, currentWorkHours - deductionHours);
      const currentMisuseMins = Number((attRecord as any).breakMisuseMinutes || 0);
      const currentDeductionHours = Number((attRecord as any).breakDeductionHours || 0);

      const updateData: any = {
        totalWorkHours: newWorkHours,
      };

      if (severity === 'HALF_DAY_DEDUCTION') {
        updateData.status = 'HALFDAY';
        updateData.isHalfDay = true;
        updateData.presentDay = 0.5;
      }

      await this.prisma.attendance.update({
        where: { id: attRecord.id },
        data: updateData,
      });

      // Update break columns safely in Postgres
      try {
        await this.prisma.$executeRawUnsafe(`
          UPDATE "Attendance"
          SET "breakMisuseMinutes" = COALESCE("breakMisuseMinutes", 0) + ${excessMinutes},
              "breakDeductionHours" = COALESCE("breakDeductionHours", 0) + ${deductionHours},
              "hasBreakComplaint" = true
          WHERE "id" = '${attRecord.id}'
        `);
      } catch (e) {
        console.error('Failed to update Attendance break columns:', e);
      }
    }

    return savedIncident;
  }

  async deleteBreakIncident(id: string) {
    try {
      let incident: any = null;
      if ((this.prisma as any).breakMisuseIncident) {
        incident = await (this.prisma as any).breakMisuseIncident.findUnique({ where: { id } });
        if (incident) {
          await (this.prisma as any).breakMisuseIncident.delete({ where: { id } });
        }
      }
      if (!incident) {
        const rows: any[] = await this.prisma.$queryRawUnsafe(`SELECT * FROM "BreakMisuseIncident" WHERE "id" = '${id}'`);
        incident = rows[0];
        if (incident) {
          await this.prisma.$executeRawUnsafe(`DELETE FROM "BreakMisuseIncident" WHERE "id" = '${id}'`);
        }
      }

      if (incident && incident.attendanceId) {
        const deductionHours = Number(incident.deductionHours || 0);
        const excessMinutes = Number(incident.excessMinutes || 0);
        await this.prisma.$executeRawUnsafe(`
          UPDATE "Attendance"
          SET "totalWorkHours" = "totalWorkHours" + ${deductionHours},
              "breakMisuseMinutes" = GREATEST(0, COALESCE("breakMisuseMinutes", 0) - ${excessMinutes}),
              "breakDeductionHours" = GREATEST(0, COALESCE("breakDeductionHours", 0) - ${deductionHours}),
              "hasBreakComplaint" = CASE WHEN GREATEST(0, COALESCE("breakMisuseMinutes", 0) - ${excessMinutes}) = 0 THEN false ELSE true END
          WHERE "id" = '${incident.attendanceId}'
        `);
      }

      return { success: true, message: 'Break incident deleted' };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Failed to delete break incident' };
    }
  }
}

