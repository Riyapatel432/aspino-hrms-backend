import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GatePassService } from './gate-pass.service';
import { GatePassType } from './dto/create-gate-pass.dto';

describe('GatePassService Unit Tests', () => {
  let service: GatePassService;
  let mockRepository: any;
  let mockPrisma: any;
  let mockPdfService: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      markTimeOut: jest.fn(),
      linkGrnPo: jest.fn(),
    };

    mockPrisma = {
      passCategory: {
        findUnique: jest.fn(),
      },
      gatePass: {
        count: jest.fn().mockResolvedValue(10),
      },
    };

    mockPdfService = {
      generateGatePassPdfBuffer: jest.fn(),
    };

    service = new GatePassService(mockRepository, mockPrisma, mockPdfService);
  });

  describe('createGatePass', () => {
    it('should create an INWARD gate pass successfully', async () => {
      mockPrisma.passCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Raw Material Inward',
      });

      const expectedPass = {
        id: 'gp-1',
        passNumber: 'GP-IN-2026-011',
        type: GatePassType.INWARD,
        vehicleNumber: 'MH12AB1234',
        driverName: 'John Doe',
        driverContact: '+919876543210',
        transporterName: 'ABC Logistics',
      };

      mockRepository.create.mockResolvedValue(expectedPass);

      const result = await service.createGatePass({
        type: GatePassType.INWARD,
        categoryId: 'cat-1',
        vehicleNumber: 'mh12ab1234',
        driverName: ' John Doe ',
        driverContact: '+919876543210',
        transporterName: 'ABC Logistics',
      });

      expect(result.message).toContain('INWARD Gate Pass generated successfully');
      expect(result.gatePass).toEqual(expectedPass);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleNumber: 'MH12AB1234',
          driverName: 'John Doe',
        }),
      );
    });

    it('should throw BadRequestException if category does not exist', async () => {
      mockPrisma.passCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createGatePass({
          type: GatePassType.INWARD,
          categoryId: 'non-existent-id',
          vehicleNumber: 'MH12AB1234',
          driverName: 'John Doe',
          driverContact: '+919876543210',
          transporterName: 'ABC Logistics',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OUTWARD Sales Dispatch pass has no Invoice', async () => {
      mockPrisma.passCategory.findUnique.mockResolvedValue({
        id: 'cat-sales',
        name: 'Sales Dispatch',
      });

      await expect(
        service.createGatePass({
          type: GatePassType.OUTWARD,
          categoryId: 'cat-sales',
          vehicleNumber: 'MH12AB1234',
          driverName: 'John Doe',
          driverContact: '+919876543210',
          transporterName: 'ABC Logistics',
          invoiceNumber: '',
          coaGenerated: true,
        }),
      ).rejects.toThrow('Outward pass for Sales Dispatch requires a valid Invoice reference.');
    });

    it('should throw BadRequestException if OUTWARD Sales Dispatch pass has COA not generated', async () => {
      mockPrisma.passCategory.findUnique.mockResolvedValue({
        id: 'cat-sales',
        name: 'Sales Dispatch',
      });

      await expect(
        service.createGatePass({
          type: GatePassType.OUTWARD,
          categoryId: 'cat-sales',
          vehicleNumber: 'MH12AB1234',
          driverName: 'John Doe',
          driverContact: '+919876543210',
          transporterName: 'ABC Logistics',
          invoiceNumber: 'INV-12345',
          coaGenerated: false,
        }),
      ).rejects.toThrow('Certificate of Analysis (COA) is generated');
    });

    it('should allow OUTWARD Sales Dispatch when Invoice and COA are present', async () => {
      mockPrisma.passCategory.findUnique.mockResolvedValue({
        id: 'cat-sales',
        name: 'Sales Dispatch',
      });

      mockRepository.create.mockResolvedValue({
        id: 'gp-out-1',
        passNumber: 'GP-OUT-2026-011',
        type: GatePassType.OUTWARD,
      });

      const result = await service.createGatePass({
        type: GatePassType.OUTWARD,
        categoryId: 'cat-sales',
        vehicleNumber: 'MH12AB1234',
        driverName: 'John Doe',
        driverContact: '+919876543210',
        transporterName: 'ABC Logistics',
        invoiceNumber: 'INV-12345',
        coaGenerated: true,
      });

      expect(result.message).toContain('OUTWARD Gate Pass generated successfully');
    });
  });

  describe('getGatePassById', () => {
    it('should return gate pass when found', async () => {
      const mockPass = { id: 'gp-1', passNumber: 'GP-IN-2026-001' };
      mockRepository.findById.mockResolvedValue(mockPass);

      const result = await service.getGatePassById('gp-1');
      expect(result).toEqual(mockPass);
    });

    it('should throw NotFoundException when gate pass is not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getGatePassById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordTimeOut', () => {
    it('should throw BadRequestException if vehicle already completed Time-Out', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'gp-1',
        status: 'COMPLETED',
      });

      await expect(service.recordTimeOut('gp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark time-out successfully if pass is active', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'gp-1',
        status: 'ACTIVE',
      });
      mockRepository.markTimeOut.mockResolvedValue({
        id: 'gp-1',
        status: 'COMPLETED',
        timeOut: new Date(),
      });

      const result = await service.recordTimeOut('gp-1');
      expect(result.status).toBe('COMPLETED');
    });
  });
});
