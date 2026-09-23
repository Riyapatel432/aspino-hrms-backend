import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { GatePassRepository } from './repositories/gate-pass.repository';
import { CreateGatePassDto, GatePassType } from './dto/create-gate-pass.dto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { GatePassPdfService } from './gate-pass-pdf.service';

@Injectable()
export class GatePassService {
  private readonly logger = new Logger(GatePassService.name);

  constructor(
    private readonly repository: GatePassRepository,
    private readonly prisma: PrismaService,
    private readonly pdfService: GatePassPdfService,
  ) {}

  async createGatePass(dto: CreateGatePassDto) {
    // 1. Vehicle Number validation & sanitation
    const formattedVehicleNo = dto.vehicleNumber.trim().toUpperCase();

    // 2. Validate Category exists in DB
    const categoryExists = await this.prisma.passCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!categoryExists) {
      throw new BadRequestException(
        `Pass category with ID ${dto.categoryId} not found.`,
      );
    }

    // 3. Rule 9.2: System will not allow an outward pass for a sales dispatch unless Invoice and COA are already generated
    const isSalesDispatch = categoryExists.name.toLowerCase().includes('sales');
    if (dto.type === GatePassType.OUTWARD && isSalesDispatch) {
      if (!dto.invoiceNumber || !dto.invoiceNumber.trim()) {
        throw new BadRequestException(
          'Outward pass for Sales Dispatch requires a valid Invoice reference.',
        );
      }
      if (dto.coaGenerated !== true) {
        throw new BadRequestException(
          'Outward pass CANNOT be issued for Sales Dispatch until Certificate of Analysis (COA) is generated.',
        );
      }
    }

    const year = new Date().getFullYear();
    const count = (await this.prisma.gatePass.count()) + 1;
    const prefix = dto.type === GatePassType.INWARD ? 'GP-IN' : 'GP-OUT';
    const passNumber = `${prefix}-${year}-${String(count).padStart(3, '0')}`;

    const gatePass = await this.repository.create({
      passNumber,
      type: dto.type,
      category: { connect: { id: dto.categoryId } },
      vehicleNumber: formattedVehicleNo,
      driverName: dto.driverName.trim(),
      driverContact: dto.driverContact?.trim(),
      transporterName: dto.transporterName?.trim(),
      supplierSource: dto.supplierSource?.trim(),
      deliveryChallanNumber: dto.deliveryChallanNumber?.trim(),
      declaredQuantity: dto.declaredQuantity?.trim(),
      poNumber: dto.poNumber?.trim(),
      grnNumber: dto.grnNumber?.trim(),
      invoiceNumber: dto.invoiceNumber?.trim(),
      coaGenerated: dto.coaGenerated || false,
      purpose: dto.purpose?.trim(),
      notes: dto.notes?.trim(),
      imageUrl: dto.imageUrl?.trim(),
    });

    this.logger.log(`Generated ${dto.type} Gate Pass: ${passNumber}`);
    return {
      message: `${dto.type} Gate Pass generated successfully`,
      gatePass,
    };
  }

  async getAllGatePasses(
    type?: string,
    search?: string,
    page?: number,
    limit?: number,
  ) {
    return this.repository.findAll(type, search, page, limit);
  }

  async getGatePassById(id: string) {
    const pass = await this.repository.findById(id);
    if (!pass) {
      throw new NotFoundException(`Gate pass with ID ${id} not found.`);
    }
    return pass;
  }

  async recordTimeOut(id: string) {
    const pass = await this.repository.findById(id);
    if (!pass) {
      throw new NotFoundException(`Gate pass with ID ${id} not found.`);
    }
    if (pass.status === 'COMPLETED') {
      throw new BadRequestException('Vehicle has already completed Time-Out.');
    }
    return this.repository.markTimeOut(id);
  }

  async linkGrnPo(id: string, poNumber?: string, grnNumber?: string) {
    return this.repository.linkGrnPo(id, poNumber, grnNumber);
  }

  // Delegate PDF Generation to GatePassPdfService
  async generateGatePassPdfBuffer(id: string): Promise<Buffer> {
    const pass = await this.getGatePassById(id);
    return this.pdfService.generateGatePassPdfBuffer(pass);
  }
}
