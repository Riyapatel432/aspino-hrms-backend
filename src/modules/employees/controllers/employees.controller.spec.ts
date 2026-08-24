import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let prisma: any;

  const mockEmployee = {
    id: 'emp-uuid-1',
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@aspino.com',
    phone: '9876543210',
    qrToken: 'qr-token-123',
    department: { name: 'Engineering' },
    designation: 'Senior Software Engineer',
    documents: [
      {
        documentType: 'Photo',
        status: 'VERIFIED',
        fileUrl: '["https://example.com/photo.jpg"]',
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEmployeeJson', () => {
    it('should return employee json when found by qrToken or employeeId', async () => {
      prisma.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await controller.getEmployeeJson('qr-token-123');

      expect(result).toHaveProperty('id', 'emp-uuid-1');
      expect(result).toHaveProperty('employeeId', 'EMP001');
      expect(result.photoUrl).toBe('https://example.com/photo.jpg');
    });

    it('should throw NotFoundException if employee not found', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(controller.getEmployeeJson('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
