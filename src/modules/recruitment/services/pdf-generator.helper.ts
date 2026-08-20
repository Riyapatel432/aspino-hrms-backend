import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

export interface OfferPdfData {
  candidateName: string;
  candidateEmail: string;
  role: string;
  salary: number;
  joiningDate: Date | string;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatLetterDate(dateVal: Date | string): string {
  const d = dateVal ? new Date(dateVal) : new Date();
  const day = getOrdinal(d.getDate());
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatJoiningDateFull(dateVal: Date | string): string {
  const d = dateVal ? new Date(dateVal) : new Date();
  const day = getOrdinal(d.getDate());
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function generateOfferLetterPdf(
  filePath: string,
  data: OfferPdfData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
      });

      // Strict 1-Page Guard
      doc.addPage = function () {
        return this;
      };

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const year = new Date().getFullYear();
      const refNo = `Ref.ASCPL/OL-${year}-003`;
      const dateFormatted = formatLetterDate(new Date());
      const joiningDateFormatted = formatJoiningDateFull(data.joiningDate);
      const roleUpper = (data.role || 'PACKING SUPERVISOR').toUpperCase();
      const salaryClause = data.salary
        ? `Your annual salary package shall be mutually agreed at Rs. ${Number(data.salary).toLocaleString('en-IN')}/- per annum at the time of an Interview.`
        : 'Your annual salary package shall be mutually agreed at the time of an Interview.';

      // ----------------------------------------------------
      // TOP DECORATIONS
      // ----------------------------------------------------
      // Top-Left Blue Tab
      doc.save();
      doc
        .path('M 0 0 L 195 0 C 175 22, 145 28, 110 28 L 0 28 Z')
        .fill('#2073bd');
      doc.restore();

      // Top-Right Ribbon Wings
      doc.save();
      doc
        .path(
          'M 595 0 C 570 30, 535 25, 515 45 C 500 62, 510 82, 535 98 C 550 85, 545 68, 560 55 C 578 35, 590 20, 595 0 Z',
        )
        .fillOpacity(0.85)
        .fill('#38bdf8');
      doc
        .path(
          'M 595 10 C 575 40, 545 35, 525 55 C 510 72, 520 90, 545 98 C 535 85, 530 72, 545 60 C 565 42, 582 28, 595 10 Z',
        )
        .fill('#1b75bb');
      doc
        .path(
          'M 595 22 C 580 48, 555 45, 540 65 C 525 80, 535 93, 555 98 C 545 88, 540 78, 555 68 C 572 52, 588 35, 595 22 Z',
        )
        .fill('#173660');
      doc.restore();

      // ----------------------------------------------------
      // WATERMARK
      // ----------------------------------------------------
      const logoPaths = [
        path.resolve(process.cwd(), 'uploads/aspino-logo.png'),
        path.resolve(process.cwd(), '../nextjs-aspino-hrms/public/aspino-logo.png'),
      ];
      let foundLogo = '';
      for (const p of logoPaths) {
        if (fs.existsSync(p)) {
          foundLogo = p;
          break;
        }
      }

      if (foundLogo) {
        doc.save();
        doc.opacity(0.045);
        doc.image(foundLogo, 175, 300, { width: 245 });
        doc.restore();
      }

      // ----------------------------------------------------
      // HEADER CONTENT (LOGO & CIN)
      // ----------------------------------------------------
      if (foundLogo) {
        doc.image(foundLogo, 45, 34, { width: 90 });
      } else {
        doc
          .fillColor('#1b75bb')
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('ASPINO', 45, 38);
        doc
          .fillColor('#1e293b')
          .fontSize(7.5)
          .font('Helvetica')
          .text('Aspino Speciality Chemicals Private Limited', 45, 54);
      }

      doc
        .fillColor('#1e293b')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('CIN: U20297GJ2024PTC150782', 300, 115, {
          align: 'right',
          width: 250,
        });

      // ----------------------------------------------------
      // RECIPIENT & REF DETAILS
      // ----------------------------------------------------
      let currentY = 162;
      doc
        .fillColor('#1e293b')
        .fontSize(9)
        .font('Helvetica')
        .text(`${refNo}`, 45, currentY);

      currentY += 13;
      doc.text(`Dt. ${dateFormatted}`, 45, currentY);

      currentY += 13;
      doc.text(`Mr. ${data.candidateName || 'Ravi Babariya'},`, 45, currentY);

      currentY += 11;
      doc.text('Dadri, Kosamba Tarsadi', 45, currentY);
      currentY += 10;
      doc.text('Surat', 45, currentY);
      currentY += 10;
      doc.text('Gujarat- 394 120', 45, currentY);

      // ----------------------------------------------------
      // TITLE: OFFER LETTER
      // ----------------------------------------------------
      currentY += 24;
      doc
        .fillColor('#162a55')
        .fontSize(11.5)
        .font('Helvetica-Bold')
        .text('OFFER LETTER', 45, currentY, {
          align: 'center',
          width: 505,
          underline: true,
        });

      // ----------------------------------------------------
      // INTRODUCTORY PARAGRAPH
      // ----------------------------------------------------
      currentY += 22;
      doc
        .fillColor('#162a55')
        .fontSize(8.8)
        .font('Helvetica-Bold')
        .text(
          'This has reference to your application and the subsequent interview you had with us, we are pleased to confirm our decision wherein we have mutually agreed upon the following:',
          45,
          currentY,
          { width: 505, align: 'justify', lineGap: 2.5 },
        );

      // ----------------------------------------------------
      // NUMBERED TERMS & CONDITIONS
      // ----------------------------------------------------
      currentY += 26;
      doc.fillColor('#1e293b').font('Helvetica').fontSize(8.8);

      const terms = [
        `1. You shall be designated as "${roleUpper}".`,
        `2. ${salaryClause}`,
        `3. Acceptance of the offer would automatically bind you to agree with all the terms and conditions of the employment as discussed during the interview.`,
        `4. You will come to finish all formalities and collect appointment letter on or before ${joiningDateFormatted}`,
      ];

      for (const term of terms) {
        doc.text(term, 45, currentY, {
          width: 505,
          align: 'justify',
          lineGap: 2,
        });
        currentY += doc.heightOfString(term, { width: 505, lineGap: 2 }) + 4;
      }

      // ----------------------------------------------------
      // DOCUMENT CHECKLIST
      // ----------------------------------------------------
      currentY += 5;
      doc
        .font('Helvetica-Bold')
        .fillColor('#162a55')
        .fontSize(8.8)
        .text(
          'Kindly bring the following documents on the date of joining:',
          45,
          currentY,
        );

      currentY += 13;
      const checklist = [
        'Copies of all education certificates for the purpose of admitting the date of birth and all mark sheets of all academic qualifications and achievements.',
        'Copy Experience Certificates',
        'Proof of past employments.',
        'Relieving letter from your current employer',
        'Photocopy of last salary slip.',
        'Four copies of passport size photographs',
        'Photocopy of driving license and your blood group details',
        'Two References.',
      ];

      doc.font('Helvetica').fillColor('#334155').fontSize(8.2);
      for (const item of checklist) {
        doc.text(`- ${item}`, 45, currentY, {
          width: 505,
          align: 'left',
          lineGap: 1.5,
        });
        currentY += doc.heightOfString(`- ${item}`, { width: 505, lineGap: 1.5 }) + 2.5;
      }

      // ----------------------------------------------------
      // CLOSING & SIGN OFF
      // ----------------------------------------------------
      currentY += 6;
      doc
        .fontSize(8.8)
        .font('Helvetica')
        .fillColor('#1e293b')
        .text(
          'With best wishes for an enjoyable, exciting and prosperous career association with Aspino Specialty Chemicals Private Limited.',
          45,
          currentY,
          { width: 505, align: 'justify', lineGap: 2 },
        );

      currentY += 20;
      doc
        .font('Helvetica-Bold')
        .fillColor('#162a55')
        .text('Thankfully yours,', 45, currentY);

      currentY += 12;
      doc
        .font('Helvetica-Bold')
        .fillColor('#162a55')
        .text('For Aspino Speciality Chemicals Pvt.Ltd.', 45, currentY);

      // ----------------------------------------------------
      // FOOTER
      // ----------------------------------------------------
      doc
        .fillColor('#1e293b')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text(
          'Registered office  |  SRN-271,BLK-314, Nakoda Road, Ta-Mangrol, Hathuran, Surat, 394125, Gujarat - India.',
          45,
          788,
          { align: 'center', width: 505 },
        );

      doc.rect(0, 806, 595, 36).fill('#173660');
      doc
        .fillColor('#ffffff')
        .fontSize(8)
        .font('Helvetica')
        .text(
          '+91 98259 57173        info@aspinochemicals.com        www.aspinochemicals.com',
          0,
          818,
          { align: 'center', width: 595 },
        );

      // Clean up extra pages if any
      const range = doc.bufferedPageRange();
      if (range.count > 1) {
        const pages = (doc as any)._pages;
        if (Array.isArray(pages) && pages.length > 1) {
          pages.splice(1, pages.length - 1);
        }
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
