import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermission('read', 'audit')
  async getLogs(
    @Query()
    query: PaginationQueryDto & {
      userEmail?: string;
      action?: string;
      entityType?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.auditService.getLogs(query);
  }
}
