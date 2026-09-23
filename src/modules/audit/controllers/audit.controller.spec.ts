import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from '../services/audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let service: any;

  beforeEach(async () => {
    service = {
      getLogs: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }, { provide: CaslAbilityFactory, useValue: { createForUser: jest.fn(), getUserPermissionsPayload: jest.fn() } }],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
