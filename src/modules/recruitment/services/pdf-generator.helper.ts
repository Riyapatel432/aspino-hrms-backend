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
        path.resolve(
          process.cwd(),
          '../nextjs-aspino-hrms/public/aspino-logo.png',
        ),
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
        currentY +=
          doc.heightOfString(`- ${item}`, { width: 505, lineGap: 1.5 }) + 2.5;
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

export interface CnvPdfData {
  requisitionId: string;
  title: string;
  departmentName: string;
  headcount: number;
  experienceRequired?: string | number | null;
  requisitionType: string;
  jobSpecification?: string | null;
  exchangeOffice?: string | null;
  refNumber?: string | null;
}

export function generateCnvNotificationPdf(
  filePath: string,
  data: CnvPdfData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
      });

      doc.addPage = function () {
        return this;
      };

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const now = new Date();
      const dateFormatted = formatLetterDate(now);
      const year = now.getFullYear();
      const refNo =
        data.refNumber ||
        `REF/CNV/${year}/${String(data.requisitionId || '1')
          .slice(-4)
          .padStart(4, '0')}`;
      const exchangeOffice =
        data.exchangeOffice || 'District Employment Exchange Office';

      // ----------------------------------------------------
      // TOP HEADER BANNER (Full Width 595.28 pt)
      // ----------------------------------------------------
      doc.rect(0, 0, 595.28, 85).fill('#0f3d70');
      doc.rect(0, 83, 595.28, 3.5).fill('#f59e0b');

      // Company Title & Info
      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('ASPINO SPECIALTY CHEMICALS PVT. LTD.', 36, 18);

      doc
        .fillColor('#cbd5e1')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'CIN: U20297GJ2024PTC150782  |  SRN-271, BLK-314, Nakoda Road, Ta-Mangrol, Surat - 394125',
          36,
          40,
        );

      doc
        .fillColor('#f59e0b')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('HUMAN RESOURCES COMPLIANCE CELL', 36, 56);

      // Top Right Contact
      doc
        .fillColor('#e2e8f0')
        .fontSize(8)
        .font('Helvetica')
        .text('info@aspinochemicals.com', 380, 22, {
          width: 180,
          align: 'right',
        })
        .text('+91 98259 57173', 380, 36, { width: 180, align: 'right' })
        .text('Official Form (CNV-1959)', 380, 50, {
          width: 180,
          align: 'right',
        });

      // ----------------------------------------------------
      // REFERENCE & DATE BAR
      // ----------------------------------------------------
      let currentY = 100;
      doc
        .fillColor('#334155')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text(`Ref. No.: ${refNo}`, 36, currentY)
        .text(`Date: ${dateFormatted}`, 36, currentY, {
          width: 523.28,
          align: 'right',
        });

      currentY += 16;
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(0.8)
        .dash(3, { space: 2 })
        .moveTo(36, currentY)
        .lineTo(559.28, currentY)
        .stroke();
      doc.undash();

      // ----------------------------------------------------
      // TO ADDRESS
      // ----------------------------------------------------
      currentY += 12;
      doc
        .fillColor('#0f172a')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('To,', 36, currentY);

      currentY += 12;
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .text(
          'The Employment Officer / Designated Competent Authority,',
          36,
          currentY,
        );

      currentY += 12;
      doc.font('Helvetica-Bold').text(exchangeOffice, 36, currentY);

      // ----------------------------------------------------
      // SUBJECT BADGE
      // ----------------------------------------------------
      currentY += 18;
      doc.rect(36, currentY, 523.28, 26).fillAndStroke('#eff6ff', '#bfdbfe');

      doc
        .fillColor('#0f3d70')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(
          'STATUTORY NOTIFICATION OF VACANCY (CNV ACT, 1959)',
          36,
          currentY + 7,
          { width: 523.28, align: 'center' },
        );

      // ----------------------------------------------------
      // STATUTORY CLAUSE BOX
      // ----------------------------------------------------
      currentY += 34;
      doc.rect(36, currentY, 523.28, 38).fill('#f8fafc');
      doc.rect(36, currentY, 4, 38).fill('#0f3d70');

      doc
        .fillColor('#334155')
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          'This official notification is submitted in strict compliance with Section 4 of the Employment Exchanges (Compulsory Notification of Vacancies) Act, 1959 and applicable state rules. The particulars of the open vacancy / requirement are furnished below for registration and sponsor action.',
          48,
          currentY + 6,
          { width: 500, align: 'justify', lineGap: 2 },
        );

      // ----------------------------------------------------
      // TABLE GRID
      // ----------------------------------------------------
      currentY += 46;
      const tableX = 36;
      const tableWidth = 523.28;
      const col1Width = 190;
      const col2Width = tableWidth - col1Width;
      const rowHeight = 22;

      // Table Header
      doc.rect(tableX, currentY, tableWidth, rowHeight).fill('#0f3d70');
      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('COMPLIANCE PARTICULARS', tableX + 12, currentY + 6)
        .text('DETAILS / SPECIFICATION', tableX + col1Width + 12, currentY + 6);

      currentY += rowHeight;

      const rows: [string, string][] = [
        ['Employer / Organization', 'Aspino Specialty Chemicals Pvt. Ltd.'],
        ['Vacancy / Job Title', data.title || '—'],
        ['Department / Unit', data.departmentName || 'General Operations'],
        [
          'Number of Open Vacancies (Headcount)',
          `${data.headcount || 1} Position(s)`,
        ],
        [
          'Experience Required',
          data.experienceRequired
            ? `${data.experienceRequired} Year(s)`
            : 'Freshers / Entry level eligible',
        ],
        ['Nature of Employment', 'Full-Time / Regular & Permanent'],
        [
          'Vacancy Type',
          data.requisitionType === 'REPLACEMENT'
            ? 'Replacement Requirement'
            : 'New Requirement / Expansion',
        ],
        [
          'Job Specification / Brief',
          data.jobSpecification ||
            'As per standardized corporate job description',
        ],
        ['Statutory Ref. Number', refNo],
        ['Notification Date', dateFormatted],
      ];

      rows.forEach(([label, val], idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(tableX, currentY, tableWidth, rowHeight).fill(bg);
        doc
          .rect(tableX, currentY, tableWidth, rowHeight)
          .strokeColor('#cbd5e1')
          .lineWidth(0.5)
          .stroke();
        doc
          .rect(tableX, currentY, col1Width, rowHeight)
          .fillAndStroke(idx % 2 === 0 ? '#f1f5f9' : '#e2e8f0', '#cbd5e1');

        doc
          .fillColor('#334155')
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(label, tableX + 10, currentY + 6, { width: col1Width - 16 });

        doc
          .fillColor(label === 'Vacancy / Job Title' ? '#0f3d70' : '#0f172a')
          .fontSize(8.5)
          .font(
            label === 'Vacancy / Job Title' ? 'Helvetica-Bold' : 'Helvetica',
          )
          .text(val, tableX + col1Width + 10, currentY + 6, {
            width: col2Width - 16,
          });

        currentY += rowHeight;
      });

      // ----------------------------------------------------
      // CLOSING TEXT
      // ----------------------------------------------------
      currentY += 10;
      doc
        .fillColor('#334155')
        .fontSize(8)
        .font('Helvetica')
        .text(
          'We request your esteemed office to kindly record this notification and refer suitable candidate profiles as per standard procedure. Aspino Specialty Chemicals Pvt. Ltd. maintains equal employment opportunities across all categories including persons with benchmark disabilities.',
          36,
          currentY,
          { width: 523.28, align: 'justify', lineGap: 1.5 },
        );

      // ----------------------------------------------------
      // SIGNATURE & SEAL BOXES
      // ----------------------------------------------------
      currentY += 30;

      // Employer Signatory (Left)
      doc
        .strokeColor('#64748b')
        .lineWidth(1)
        .moveTo(36, currentY + 40)
        .lineTo(190, currentY + 40)
        .stroke();

      doc
        .fillColor('#0f3d70')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('Authorized Signatory', 36, currentY + 46);

      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text('Aspino Specialty Chemicals Pvt. Ltd.', 36, currentY + 58);

      // Middle Company Seal Box
      doc
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .dash(3, { space: 2 })
        .rect(245, currentY, 105, 60)
        .stroke();
      doc.undash();

      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('OFFICIAL\nCOMPANY SEAL', 245, currentY + 20, {
          width: 105,
          align: 'center',
        });

      // Right Receiving Officer Receipt Box
      doc
        .strokeColor('#64748b')
        .lineWidth(1)
        .moveTo(405, currentY + 40)
        .lineTo(559.28, currentY + 40)
        .stroke();

      doc
        .fillColor('#0f3d70')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('Employment Exchange Receipt', 405, currentY + 46, {
          width: 154.28,
          align: 'right',
        });

      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text('Receiving Officer Signature & Seal', 405, currentY + 58, {
          width: 154.28,
          align: 'right',
        });

      // ----------------------------------------------------
      // FOOTER BANNER
      // ----------------------------------------------------
      doc.rect(0, 808, 595.28, 33.89).fill('#0f3d70');
      doc.rect(0, 806, 595.28, 2).fill('#f59e0b');

      doc
        .fillColor('#ffffff')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          `Ref: ${refNo}   |   Statutory CNV Notification Form   |   Generated: ${dateFormatted}`,
          36,
          818,
          { width: 300, align: 'left' },
        );

      doc
        .fillColor('#cbd5e1')
        .fontSize(7.5)
        .font('Helvetica')
        .text('System Generated Record  |  Aspino HRMS Portal', 300, 818, {
          width: 259.28,
          align: 'right',
        });

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
