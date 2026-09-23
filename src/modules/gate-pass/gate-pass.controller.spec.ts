import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { GatePassType } from './dto/create-gate-pass.dto';

describe('GatePassController Unit Tests', () => {
  let controller: GatePassController;
  let service: GatePassService;

  const mockGatePassService = {
    createGatePass: jest.fn(),
    getAllGatePasses: jest.fn(),
    getGatePassById: jest.fn(),
    recordTimeOut: jest.fn(),
    linkGrnPo: jest.fn(),
    generateGatePassPdfBuffer: jest.fn(),
  };

  beforeEach(() => {
    service = mockGatePassService as any;
    controller = new GatePassController(service);
  });

  it('should call createGatePass service method', async () => {
    const dto = {
      type: GatePassType.INWARD,
      categoryId: 'cat-1',
      vehicleNumber: 'MH12AB1234',
      driverName: 'Driver',
    };
    mockGatePassService.createGatePass.mockResolvedValue({ message: 'Success', gatePass: dto });

    const result = await controller.create(dto as any);
    expect(mockGatePassService.createGatePass).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('message');
  });

  it('should call getAllGatePasses with query params', async () => {
    mockGatePassService.getAllGatePasses.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const result = await controller.findAll('INWARD', 'search-term', '1', '10');
    expect(mockGatePassService.getAllGatePasses).toHaveBeenCalledWith(
      'INWARD',
      'search-term',
      1,
      10,
    );
    expect(result.data).toEqual([]);
  });

  it('should call getGatePassById', async () => {
    const mockPass = { id: 'gp-1', passNumber: 'GP-001' };
    mockGatePassService.getGatePassById.mockResolvedValue(mockPass);

    const result = await controller.findOne('gp-1');
    expect(result).toEqual(mockPass);
  });

  it('should call recordTimeOut', async () => {
    mockGatePassService.recordTimeOut.mockResolvedValue({ id: 'gp-1', status: 'COMPLETED' });

    const result = await controller.recordTimeOut('gp-1');
    expect(mockGatePassService.recordTimeOut).toHaveBeenCalledWith('gp-1');
    expect(result.status).toBe('COMPLETED');
  });
});
