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
    query: PaginationQueryDto & { employeeId?: string; shiftId?: string } = {},
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
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
        include: { employee: true, shift: true },
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
  }) {
    return this.prisma.shiftRoster.create({
      data: {
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        date: new Date(dto.date),
      },
    });
  }

  async updateRoster(id: string, dto: any) {
    if (dto.date) dto.date = new Date(dto.date);
    return this.prisma.shiftRoster.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRoster(id: string) {
    return this.prisma.shiftRoster.delete({
      where: { id },
    });
  }

  async findManyAttendance(
    query: PaginationQueryDto & { employeeId?: string; status?: string; date?: string; month?: string | number; year?: string | number } = {},
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
        include: { employee: true },
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

    // Cache and index employees with flexible normalizers
    const allEmployees = await this.prisma.employee.findMany({
      select: { id: true, employeeId: true },
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
          shiftName: rec.shiftName || 'General Shift',
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
}
