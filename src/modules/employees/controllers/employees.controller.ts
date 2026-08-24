import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../../database/prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helper: resolve employee by qrToken or employeeId ───────────────────────
  private async resolveEmployee(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ qrToken: id }, { employeeId: id }],
      },
      include: {
        documents: {
          where: { documentType: 'Photo', fileUrl: { not: null } },
        },
        department: true,
      },
    });
    if (!employee)
      throw new NotFoundException(
        'Employee profile not found or invalid token.',
      );

    // Resolve photo URL
    let photoUrl: string | null = null;
    const photoDoc =
      employee.documents.find((d) => d.status === 'VERIFIED') ||
      employee.documents.find((d) => d.status === 'SUBMITTED');
    if (photoDoc?.fileUrl) {
      try {
        const urls = photoDoc.fileUrl.startsWith('[')
          ? JSON.parse(photoDoc.fileUrl)
          : [photoDoc.fileUrl];
        photoUrl = urls[0] || null;
      } catch {
        photoUrl = photoDoc.fileUrl;
      }
    }
    return { employee, photoUrl };
  }

  // ── GET /employees/qr/:id  →  JSON profile (kept for backward compat) ───────
  @Get('qr/:id')
  async getEmployeeJson(@Param('id') id: string) {
    const { employee, photoUrl } = await this.resolveEmployee(id);
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department?.name || '',
      designation: employee.designation,
      dateOfJoining: employee.dateOfJoining,
      location: employee.location,
      phone: employee.phone,
      status: employee.status,
      photoUrl,
    };
  }

  // ── GET /employees/pdf/:qrToken  →  Inline PDF ───────────────────────────────
  @Get('pdf/:qrToken')
  async getEmployeePdf(
    @Param('qrToken') qrToken: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const cleanToken = qrToken.endsWith('.pdf')
      ? qrToken.slice(0, -4)
      : qrToken;
    const { employee, photoUrl } = await this.resolveEmployee(cleanToken);

    const fullName = `${employee.firstName} ${employee.lastName}`;
    const joinDate = employee.dateOfJoining
      ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';

    // ── Build PDF in memory ──────────────────────────────────────────────────
    const W = 220; // Card width (in points)
    const H = 340; // Card height (in points)

    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: {
        Title: `${fullName} — ID Card`,
        Author: 'Aspino HRMS',
        Subject: 'Employee ID Card',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${employee.employeeId}-id-card.pdf"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-store',
      });
      res.end(pdfBuffer);
    });

    // ── Card Frame Background ──────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#ffffff');

    // ── Header (Flat Dark Navy) ──────────────────────────────────────────────
    doc.rect(0, 0, W, 65).fill('#0b1329');
    // Header green accent stripe
    doc.rect(0, 65, W, 3).fill('#10b981');

    // ── Header Logo ────────────────────────────────────────────────────────
    const logoPath =
      'd:\\Aspino-Hrms\\nextjs-aspino-hrms\\public\\aspino-logo.png';
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, W / 2 - 50, 14, {
          fit: [100, 36],
          align: 'center',
          valign: 'center',
        });
      } catch (err) {
        doc
          .fillColor('#10b981')
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('ASPINO', 0, 20, { align: 'center', width: W });
      }
    } else {
      doc
        .fillColor('#10b981')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('ASPINO', 0, 20, { align: 'center', width: W });
    }

    // ── Avatar Photo (Symmetric Double-Ring Circle) ────────────────────────
    const avatarX = W / 2 - 32;
    const avatarY = 78;
    const avatarR = 32;

    // Draw outer emerald green ring
    doc.circle(W / 2, avatarY + avatarR, avatarR + 2).fill('#10b981');

    // Draw inner white border ring
    doc.circle(W / 2, avatarY + avatarR, avatarR).fill('#ffffff');

    // Try to embed photo
    let photoEmbedded = false;
    if (photoUrl) {
      const absPath = path.join(process.cwd(), photoUrl);
      if (fs.existsSync(absPath)) {
        try {
          doc.save();
          // Clip to circle area (radius 30 for white space between photo and ring)
          doc.circle(W / 2, avatarY + avatarR, avatarR - 2).clip();
          doc.image(absPath, avatarX + 2, avatarY + 2, {
            width: (avatarR - 2) * 2,
            height: (avatarR - 2) * 2,
            cover: [(avatarR - 2) * 2, (avatarR - 2) * 2],
          });
          doc.restore();
          photoEmbedded = true;
        } catch {
          photoEmbedded = false;
        }
      }
    }

    // Initials fallback
    if (!photoEmbedded) {
      doc.circle(W / 2, avatarY + avatarR, avatarR - 2).fill('#1e293b');

      const initials =
        `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase();
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(initials, avatarX + 2, avatarY + avatarR - 10, {
          width: (avatarR - 2) * 2,
          align: 'center',
        });
    }

    // ── Name & Designation ─────────────────────────────────────────────────
    doc
      .fillColor('#0b1329')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(fullName, 0, 152, { align: 'center', width: W });

    doc
      .fillColor('#10b981')
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(employee.designation.toUpperCase(), 0, 166, {
        align: 'center',
        width: W,
      });

    // Small centered design line accent under designation
    doc.rect(W / 2 - 12, 177, 24, 1.2).fill('#e2e8f0');

    // ── Details Vertical List ──────────────────────────────────────────────
    const drawField = (label: string, val: string, yPos: number) => {
      doc
        .fillColor('#94a3b8')
        .font('Helvetica-Bold')
        .fontSize(6)
        .text(label, 26, yPos, { width: 56, align: 'left', lineBreak: false });

      doc
        .fillColor('#0b1329')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text(val || '—', 82, yPos, {
          width: 112,
          align: 'left',
          ellipsis: true,
          lineBreak: false,
          height: 10,
        });

      // Thin separator line
      doc
        .moveTo(26, yPos + 10)
        .lineTo(194, yPos + 10)
        .strokeColor('#f1f5f9')
        .lineWidth(0.5)
        .stroke();
    };

    drawField('EMPLOYEE ID', employee.employeeId, 185);
    drawField(
      'DEPARTMENT',
      (employee.department?.name || '').toUpperCase(),
      199,
    );
    drawField('JOIN DATE', joinDate, 213);
    drawField('LOCATION', (employee.location || '—').toUpperCase(), 227);
    drawField('PHONE', employee.phone || '—', 241);

    // ── Footer ─────────────────────────────────────────────────────────────
    const footerY = 275;

    // Solid dark footer
    doc.rect(0, footerY, W, H - footerY).fill('#0b1329');
    // Top border line of bottom bar
    doc.rect(0, footerY, W, 2).fill('#10b981');

    // Verification text
    doc
      .fillColor('#10b981')
      .font('Helvetica-Bold')
      .fontSize(6.5)
      .text('✓ VERIFIED DIGITAL ID', 0, footerY + 14, {
        align: 'center',
        width: W,
      });

    doc
      .fillColor('#94a3b8')
      .font('Helvetica')
      .fontSize(5.5)
      .text('SCAN QR CODE TO VALIDATE STATUS', 0, footerY + 24, {
        align: 'center',
        width: W,
      });

    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(5)
      .text(`ISSUED ON: ${new Date().toLocaleDateString()}`, 0, footerY + 34, {
        align: 'center',
        width: W,
      });

    // Outer rounded plastic card border overlay
    doc
      .roundedRect(1, 1, W - 2, H - 2, 8)
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();

    doc.end();
  }
}
