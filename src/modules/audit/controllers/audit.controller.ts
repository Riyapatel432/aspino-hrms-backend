import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'hr')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get('logs')
  async getLogs(@Query() query: PaginationQueryDto & { userEmail?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }) {
    return this.auditService.getLogs(query);
  }
}
