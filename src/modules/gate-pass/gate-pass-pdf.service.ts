import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class GatePassPdfService {
  private readonly logger = new Logger(GatePassPdfService.name);

  // Generate Exact Card-Based Layout PDF matching Enterprise Spec
  async generateGatePassPdfBuffer(pass: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isInward = pass.type === 'INWARD';

      // 1. Header Section
      doc
        .fillColor('#0284c7')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('Aspino Speciality Chemicals Private Limited', 40, 36, {
          width: 340,
        });
      doc
        .fillColor('#475569')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(
          'Facility Digital Gate Pass Slip • Official ERP Register Record',
          40,
          68,
          { width: 340 },
        );

      // Badge & Pass #
      const badgeText = `${pass.type} GATE PASS`;
      const badgeColor = isInward ? '#0284c7' : '#15803d';
      doc
        .fillColor(badgeColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(badgeText, 390, 38, { align: 'right', width: 165 });
      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`Pass #: ${pass.passNumber}`, 390, 56, {
          align: 'right',
          width: 165,
        });

      // Blue Divider Bar
      doc
        .moveTo(40, 88)
        .lineTo(555, 88)
        .strokeColor('#0284c7')
        .lineWidth(3)
        .stroke();

      // Helper for Card Box
      const drawCardBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        title: string,
      ) => {
        doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', '#cbd5e1');
        doc
          .fillColor('#0284c7')
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(title, x + 12, y + 10);
        doc
          .moveTo(x + 12, y + 24)
          .lineTo(x + w - 12, y + 24)
          .strokeColor('#e2e8f0')
          .lineWidth(1)
          .stroke();
      };

      // Helper for Card Row
      const drawCardRow = (
        x: number,
        y: number,
        w: number,
        label: string,
        value: string,
      ) => {
        doc
          .fillColor('#64748b')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(label, x + 12, y);
        doc
          .fillColor('#0f172a')
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(value || 'N/A', x + 12, y, { align: 'right', width: w - 24 });
        doc
          .moveTo(x + 12, y + 15)
          .lineTo(x + w - 12, y + 15)
          .dash(2, { space: 2 })
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke()
          .undash();
      };

      // 2. Row 1 Cards (Y: 105)
      const cardY = 105;
      const cardH = 125;
      const cardW = 248;

      const isVisitor =
        pass.category?.name?.toLowerCase().includes('visitor') ||
        pass.category?.code?.toLowerCase().includes('vis');

      // Left Box: VEHICLE & DRIVER / VISITOR INFORMATION
      const leftBoxTitle = isVisitor
        ? 'VISITOR & CONTACT INFORMATION'
        : 'VEHICLE & DRIVER INFORMATION';
      drawCardBox(40, cardY, cardW, cardH, leftBoxTitle);
      drawCardRow(
        40,
        cardY + 32,
        cardW,
        isVisitor ? 'Visitor Name:' : 'Vehicle Number:',
        isVisitor ? pass.driverName : pass.vehicleNumber,
      );
      drawCardRow(
        40,
        cardY + 52,
        cardW,
        isVisitor ? 'Contact Number:' : 'Driver Name:',
        isVisitor ? pass.driverContact || 'N/A' : pass.driverName,
      );
      drawCardRow(
        40,
        cardY + 72,
        cardW,
        isVisitor ? 'Visiting From / Org:' : 'Driver Contact:',
        isVisitor
          ? pass.transporterName || 'Self / Personal'
          : pass.driverContact || 'N/A',
      );
      drawCardRow(
        40,
        cardY + 92,
        cardW,
        isVisitor ? 'Entry Mode / Vehicle:' : 'Transporter Name:',
        isVisitor
          ? pass.vehicleNumber || 'WALKING'
          : pass.transporterName || 'N/A',
      );

      // Right Box: MOVEMENT & CATEGORY STATUS
      drawCardBox(307, cardY, cardW, cardH, 'MOVEMENT & CATEGORY STATUS');
      drawCardRow(
        307,
        cardY + 32,
        cardW,
        'Pass Category:',
        pass.category?.name || 'N/A',
      );
      drawCardRow(
        307,
        cardY + 52,
        cardW,
        'Gate Entry (Time In):',
        new Date(pass.timeIn).toLocaleString(),
      );
      drawCardRow(
        307,
        cardY + 72,
        cardW,
        'Gate Exit (Time Out):',
        pass.timeOut
          ? new Date(pass.timeOut).toLocaleString()
          : 'Still Inside Facility',
      );
      drawCardRow(307, cardY + 92, cardW, 'Security Status:', pass.status);

      // 3. Row 2 Card: LOGISTICS & REFERENCES (Y: 245)
      const btmY = 245;
      const btmH = 105;
      const btmW = 515;

      const titleLogistics = isVisitor
        ? 'VISIT PURPOSE & HOST DETAILS'
        : isInward
          ? 'INWARD MATERIAL & LOGISTICS REFERENCES'
          : 'OUTWARD DISPATCH & LOGISTICS REFERENCES';
      drawCardBox(40, btmY, btmW, btmH, titleLogistics);

      if (isVisitor) {
        drawCardRow(
          40,
          btmY + 32,
          btmW,
          'Person To Meet / Dept:',
          pass.supplierSource || 'N/A',
        );
        drawCardRow(
          40,
          btmY + 52,
          btmW,
          'Purpose of Visit:',
          pass.purpose || 'Official Visit',
        );
        drawCardRow(
          40,
          btmY + 72,
          btmW,
          'Visitor Count / Badge Ref:',
          pass.declaredQuantity || pass.deliveryChallanNumber || '1 Person',
        );
      } else if (isInward) {
        drawCardRow(
          40,
          btmY + 32,
          btmW,
          'Supplier / Source:',
          pass.supplierSource || 'N/A',
        );
        drawCardRow(
          40,
          btmY + 52,
          btmW,
          'Delivery Challan (DC) #:',
          pass.deliveryChallanNumber || 'N/A',
        );
        drawCardRow(
          40,
          btmY + 72,
          btmW,
          'Declared Quantity:',
          pass.declaredQuantity || 'N/A',
        );
      } else {
        drawCardRow(
          40,
          btmY + 32,
          btmW,
          'Invoice Number:',
          pass.invoiceNumber || 'N/A',
        );
        drawCardRow(
          40,
          btmY + 52,
          btmW,
          'Outward Purpose:',
          pass.purpose || 'N/A',
        );
        drawCardRow(
          40,
          btmY + 72,
          btmW,
          'COA Verification:',
          pass.coaGenerated ? 'VERIFIED & GENERATED' : 'NOT APPLICABLE',
        );
      }

      // 4. Signatures Section (Y: 410)
      const sigY = btmY + btmH + 60;
      doc
        .moveTo(40, sigY)
        .lineTo(180, sigY)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();
      doc
        .moveTo(227, sigY)
        .lineTo(367, sigY)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();
      doc
        .moveTo(415, sigY)
        .lineTo(555, sigY)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Gate Security Officer', 40, sigY + 6, {
          width: 140,
          align: 'center',
        })
        .text('Warehouse / Store Manager', 227, sigY + 6, {
          width: 140,
          align: 'center',
        })
        .text('Driver Signature', 415, sigY + 6, {
          width: 140,
          align: 'center',
        });

      // 5. Footer Line (Y: 510)
      const footY = sigY + 65;
      doc
        .moveTo(40, footY)
        .lineTo(555, footY)
        .strokeColor('#f1f5f9')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#94a3b8')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          `Generated via Aspino ERP Digital Gate Pass Module • Certified Security Receipt • ${new Date().toLocaleString()}`,
          40,
          footY + 10,
          { width: 515, align: 'center' },
        );

      doc.end();
    });
  }
}
