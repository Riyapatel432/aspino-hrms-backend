import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  async getShifts() {
    return this.attendanceRepository.findManyShifts();
  }

  async createShift(dto: { name: string; startTime: string; endTime: string }) {
    return this.attendanceRepository.createShift(dto);
  }

  async updateShift(id: string, dto: any) {
    return this.attendanceRepository.updateShift(id, dto);
  }

  async deleteShift(id: string) {
    return this.attendanceRepository.deleteShift(id);
  }

  async getRosters() {
    return this.attendanceRepository.findManyRosters();
  }

  async createRoster(dto: { employeeId: string; shiftId: string; date: string }) {
    return this.attendanceRepository.createRoster(dto);
  }

  async updateRoster(id: string, dto: any) {
    return this.attendanceRepository.updateRoster(id, dto);
  }

  async deleteRoster(id: string) {
    return this.attendanceRepository.deleteRoster(id);
  }

  async getAttendance() {
    return this.attendanceRepository.findManyAttendance();
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
    return this.attendanceRepository.captureAttendance(dto);
  }

  async updateAttendance(id: string, dto: any) {
    return this.attendanceRepository.updateAttendance(id, dto);
  }

  async deleteAttendance(id: string) {
    return this.attendanceRepository.deleteAttendance(id);
  }
}
