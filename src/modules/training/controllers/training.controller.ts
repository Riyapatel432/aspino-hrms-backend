import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TrainingService } from '../services/training.service';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { RequirePermission } from '../../casl/decorators/require-permission.decorator';

@Controller('training')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('trainings')
  @RequirePermission('read', 'training')
  async getTrainings(
    @Query()
    query: PaginationQueryDto & { employeeId?: string; trainingType?: string },
  ) {
    return this.trainingService.getTrainings(query);
  }

  @Post('trainings')
  @RequirePermission('create', 'training')
  async createTraining(@Body() dto: CreateTrainingDto) {
    return this.trainingService.createTraining(dto);
  }

  @Patch('trainings/:id')
  @RequirePermission('update', 'training')
  async updateTraining(@Body() body: any, @Param('id') id: string) {
    return this.trainingService.updateTraining(id, body);
  }

  @Delete('trainings/:id')
  @RequirePermission('delete', 'training')
  async deleteTraining(@Param('id') id: string) {
    return this.trainingService.deleteTraining(id);
  }
}
