import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateQcSpecificationDto } from './dto/create-qc-specification.dto';
import { UpdateQcSpecificationDto } from './dto/update-qc-specification.dto';

@Injectable()
export class QcSpecificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQcSpecificationDto) {
    const formattedCode = dto.specCode.trim().toUpperCase();

    const existing = await this.prisma.qcSpecification.findUnique({
      where: { specCode: formattedCode },
    });

    if (existing) {
      throw new BadRequestException(
        `QC Specification with code '${formattedCode}' already exists.`,
      );
    }

    const effectiveDate = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : new Date();
    const reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;

    const spec = await this.prisma.qcSpecification.create({
      data: {
        specCode: formattedCode,
        productMaterialCode: dto.productMaterialCode.trim().toUpperCase(),
        itemName: dto.itemName.trim(),
        itemType: dto.itemType.toUpperCase(),
        testParameters: dto.testParameters || [],
        testMethod: dto.testMethod?.trim() || null,
        acceptableLimits: dto.acceptableLimits?.trim() || null,
        versionNo: dto.versionNo?.trim() || 'v1.0',
        effectiveDate,
        reviewDate,
        status: dto.status?.toUpperCase() || 'ACTIVE',
        preparedBy: dto.preparedBy?.trim() || null,
        approvedBy: dto.approvedBy?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    return {
      message: 'QC Specification created successfully',
      specification: spec,
    };
  }

  async findAll(
    search?: string,
    itemType?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    const where: any = {};

    if (itemType && itemType.toUpperCase() !== 'ALL') {
      where.itemType = itemType.toUpperCase();
    }

    if (status && status.toUpperCase() !== 'ALL') {
      if (
        ['ACTIVE', 'DRAFT', 'SUPERSEDED', 'OBSOLETE'].includes(
          status.toUpperCase(),
        )
      ) {
        where.status = status.toUpperCase();
      } else if (status.toUpperCase() === 'ACTIVE_STATUS') {
        where.isActive = true;
      } else if (status.toUpperCase() === 'INACTIVE_STATUS') {
        where.isActive = false;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { specCode: { contains: q, mode: 'insensitive' } },
        { productMaterialCode: { contains: q, mode: 'insensitive' } },
        { itemName: { contains: q, mode: 'insensitive' } },
        { testMethod: { contains: q, mode: 'insensitive' } },
        { versionNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [totalCount, activeCount, draftCount, productCount, materialCount] =
      await Promise.all([
        this.prisma.qcSpecification.count({ where }),
        this.prisma.qcSpecification.count({
          where: { ...where, status: 'ACTIVE' },
        }),
        this.prisma.qcSpecification.count({
          where: { ...where, status: 'DRAFT' },
        }),
        this.prisma.qcSpecification.count({
          where: { ...where, itemType: 'PRODUCT' },
        }),
        this.prisma.qcSpecification.count({
          where: {
            ...where,
            itemType: { in: ['PACKING_MATERIAL', 'RAW_MATERIAL'] },
          },
        }),
      ]);

    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && limit && page > 0 ? (page - 1) * limit : undefined;

    const specs = await this.prisma.qcSpecification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return {
      data: specs,
      meta: {
        total: totalCount,
        active: activeCount,
        draft: draftCount,
        product: productCount,
        material: materialCount,
        page: page || 1,
        limit: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      },
    };
  }

  async findOne(id: string) {
    const spec = await this.prisma.qcSpecification.findUnique({
      where: { id },
    });

    if (!spec) {
      throw new NotFoundException(`QC Specification with ID '${id}' not found`);
    }

    return spec;
  }

  async update(id: string, dto: UpdateQcSpecificationDto) {
    const existing = await this.findOne(id);

    let formattedCode = existing.specCode;
    if (
      dto.specCode &&
      dto.specCode.trim().toUpperCase() !== existing.specCode
    ) {
      formattedCode = dto.specCode.trim().toUpperCase();
      const duplicate = await this.prisma.qcSpecification.findUnique({
        where: { specCode: formattedCode },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `QC Specification with code '${formattedCode}' already exists.`,
        );
      }
    }

    const effectiveDate = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : undefined;
    const reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : undefined;

    const updated = await this.prisma.qcSpecification.update({
      where: { id },
      data: {
        specCode: formattedCode,
        ...(dto.productMaterialCode !== undefined && {
          productMaterialCode: dto.productMaterialCode.trim().toUpperCase(),
        }),
        ...(dto.itemName !== undefined && { itemName: dto.itemName.trim() }),
        ...(dto.itemType !== undefined && {
          itemType: dto.itemType.toUpperCase(),
        }),
        ...(dto.testParameters !== undefined && {
          testParameters: dto.testParameters,
        }),
        ...(dto.testMethod !== undefined && {
          testMethod: dto.testMethod?.trim() || null,
        }),
        ...(dto.acceptableLimits !== undefined && {
          acceptableLimits: dto.acceptableLimits?.trim() || null,
        }),
        ...(dto.versionNo !== undefined && { versionNo: dto.versionNo.trim() }),
        ...(effectiveDate !== undefined && { effectiveDate }),
        ...(reviewDate !== undefined && { reviewDate }),
        ...(dto.status !== undefined && { status: dto.status.toUpperCase() }),
        ...(dto.preparedBy !== undefined && {
          preparedBy: dto.preparedBy?.trim() || null,
        }),
        ...(dto.approvedBy !== undefined && {
          approvedBy: dto.approvedBy?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'QC Specification updated successfully',
      specification: updated,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.qcSpecification.delete({
      where: { id },
    });

    return {
      message: 'QC Specification deleted successfully',
      id,
    };
  }
}
