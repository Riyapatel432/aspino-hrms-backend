import { Module } from '@nestjs/common';
import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { GatePassPdfService } from './gate-pass-pdf.service';
import { GatePassRepository } from './repositories/gate-pass.repository';

@Module({
  controllers: [GatePassController],
  providers: [GatePassService, GatePassPdfService, GatePassRepository],
  exports: [GatePassService, GatePassPdfService],
})
export class GatePassModule {}
