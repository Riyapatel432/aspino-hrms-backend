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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) { }

  @Get('trainings')
  async getTrainings(@Query() query: PaginationQueryDto & { employeeId?: string; trainingType?: string }) {
    return this.trainingService.getTrainings(query);
  }

  @Post('trainings')
  async createTraining(@Body() dto: CreateTrainingDto) {
    return this.trainingService.createTraining(dto);
  }

  @Patch('trainings/:id')
  async updateTraining(@Body() body: any, @Param('id') id: string) {
    return this.trainingService.updateTraining(id, body);
  }

  @Delete('trainings/:id')
  async deleteTraining(@Param('id') id: string) {
    return this.trainingService.deleteTraining(id);
  }
}
