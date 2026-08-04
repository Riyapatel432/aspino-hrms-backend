import * as fs from 'fs';
import PDFDocument = require('pdfkit');

export interface OfferPdfData {
  candidateName: string;
  candidateEmail: string;
  role: string;
  salary: number;
  joiningDate: Date | string;
}

export function generateOfferLetterPdf(
  filePath: string,
  data: OfferPdfData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 PDF Document with 35pt margins
      const doc = new PDFDocument({
        size: 'A4',
        margin: 35,
      });

      // Strict 1-Page Guard: Override addPage after page 1 so PDFKit can NEVER create extra pages
      doc.addPage = function () {
        return this;
      };

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // ----------------------------------------------------
      // TOP DECORATIVE CORPORATE BORDER
      // ----------------------------------------------------
      doc.rect(0, 0, 595, 12).fill('#0f172a'); // Deep charcoal header bar
      doc.rect(0, 12, 595, 3).fill('#0ea5e9'); // Sky blue accent line

      // ----------------------------------------------------
      // HEADER SECTION
      // ----------------------------------------------------
      doc.y = 30;
      doc
        .fillColor('#0f172a')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('ASPINO CHEMICALS CORP', 40, 30, {
          align: 'center',
          characterSpacing: 1,
        });
      doc.y = 56;
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#0ea5e9')
        .text('GMP CERTIFIED PHARMACEUTICAL & CHEMICAL UNIT', 40, 56, {
          align: 'center',
        });
      doc.y = 68;
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(
          'HQ: Industrial Estate, Sector 5, India | Email: hr@aspinochemicals.com',
          40,
          68,
          { align: 'center' },
        );

      // Clean divider line
      doc
        .moveTo(40, 82)
        .lineTo(555, 82)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // ----------------------------------------------------
      // METADATA & RECIPIENT
      // ----------------------------------------------------
      const formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.y = 94;
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${formattedDate}`, 40, 94, { align: 'right', width: 515 });

      doc.y = 94;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('To,', 40, 94);
      doc.y = 106;
      doc.fontSize(11).font('Helvetica-Bold').text(data.candidateName, 40, 106);
      doc.y = 120;
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Email: ${data.candidateEmail}`, 40, 120);

      // ----------------------------------------------------
      // SUBJECT BLOCK
      // ----------------------------------------------------
      const subjectY = 138;
      doc.rect(40, subjectY, 515, 24).fill('#f8fafc');
      doc.rect(40, subjectY, 3, 24).fill('#0ea5e9'); // Left border accent line
      doc.y = subjectY + 7;
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Subject: Appointment & Offer of Employment', 52, subjectY + 7);

      // ----------------------------------------------------
      // SALUTATION & INTRODUCTION BODY
      // ----------------------------------------------------
      let bodyY = 172;
      doc.y = bodyY;
      doc
        .fillColor('#334155')
        .fontSize(9.5)
        .font('Helvetica')
        .text(`Dear ${data.candidateName},`, 40, bodyY);

      bodyY += 16;
      doc.y = bodyY;
      doc.text(
        `We are pleased to extend to you a formal offer of employment for the position of ${data.role} at Aspino Chemicals Corp. Following our comprehensive interview process and review of your professional accomplishments, we are confident that your technical expertise, qualifications, and industry knowledge will make a substantial contribution to the success and strategic objectives of our organization.`,
        40,
        bodyY,
        { width: 515, align: 'justify', lineGap: 2 },
      );

      bodyY += 46;
      doc.y = bodyY;
      doc.text(
        `Under this appointment, your Annual CTC (Cost to Company) will be Rs. ${data.salary.toLocaleString('en-IN')} per annum, subject to statutory deductions as applicable. The detailed breakdown and joining requirements are outlined below.`,
        40,
        bodyY,
        { width: 515, align: 'justify', lineGap: 2 },
      );

      // ----------------------------------------------------
      // POSITION DETAILS (TABLE STYLING)
      // ----------------------------------------------------
      bodyY += 38;
      doc.y = bodyY;
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Position Details:', 40, bodyY);

      const tableTop = bodyY + 14;
      const col1X = 52;
      const col2X = 230;

      // Row 1
      doc.rect(40, tableTop, 515, 20).fill('#f1f5f9');
      doc.y = tableTop + 5;
      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Offered Designation', col1X, tableTop + 5);
      doc.y = tableTop + 5;
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .text(data.role, col2X, tableTop + 5);

      // Row 2
      const row2Top = tableTop + 20;
      doc.rect(40, row2Top, 515, 20).fill('#ffffff');
      doc.y = row2Top + 5;
      doc
        .fillColor('#475569')
        .font('Helvetica-Bold')
        .text('Annual CTC (INR)', col1X, row2Top + 5);
      doc.y = row2Top + 5;
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .text(`Rs. ${data.salary.toLocaleString('en-IN')} / annum`, col2X, row2Top + 5);

      // Row 3
      const row3Top = row2Top + 20;
      doc.rect(40, row3Top, 515, 20).fill('#f8fafc');
      doc.y = row3Top + 5;
      doc
        .fillColor('#475569')
        .font('Helvetica-Bold')
        .text('Expected Joining Date', col1X, row3Top + 5);
      const dateVal =
        typeof data.joiningDate === 'string'
          ? new Date(data.joiningDate)
          : data.joiningDate;
      const formattedJoiningDate = dateVal.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.y = row3Top + 5;
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .text(formattedJoiningDate, col2X, row3Top + 5);

      // Table border outline
      doc
        .rect(40, tableTop, 515, 60)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      // ----------------------------------------------------
      // TERMS & CONDITIONS
      // ----------------------------------------------------
      let termsY = row3Top + 26;
      doc.y = termsY;
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Terms & Conditions:', 40, termsY);

      termsY += 14;
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
      doc.y = termsY;
      doc.text(
        '1. Credential Verification: This offer of employment is contingent upon successful completion of background checks, reference verifications, and submission of academic & professional credentials.',
        40,
        termsY,
        { width: 515, align: 'justify', lineGap: 2 },
      );

      termsY += 26;
      doc.y = termsY;
      doc.text(
        '2. Probationary Period: Upon commencement, you will undergo a probationary period of six (6) months. Confirmation is subject to satisfactory performance appraisals.',
        40,
        termsY,
        { width: 515, align: 'justify', lineGap: 2 },
      );

      termsY += 26;
      doc.y = termsY;
      doc.text(
        '3. Acceptance of Offer: Please indicate formal acceptance by signing and returning the duplicate copy of this letter on or before your scheduled joining date.',
        40,
        termsY,
        { width: 515, align: 'justify', lineGap: 2 },
      );

      // ----------------------------------------------------
      // SIGNATURE BLOCKS (SIDE-BY-SIDE ON SAME PAGE)
      // ----------------------------------------------------
      const sigY = 525;
      const lineY = sigY + 45;

      // Left Sign: Employer
      doc.y = sigY;
      doc
        .fillColor('#334155')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('Sincerely,', 40, sigY);
      doc
        .moveTo(40, lineY)
        .lineTo(190, lineY)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();
      doc.y = lineY + 6;
      doc
        .fillColor('#475569')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Authorized Signatory', 40, lineY + 6);
      doc.y = lineY + 17;
      doc
        .font('Helvetica')
        .fillColor('#64748b')
        .text('HR Director, Aspino Chemicals Corp', 40, lineY + 17);

      // Right Sign: Candidate Acceptance
      doc.y = sigY;
      doc
        .fillColor('#334155')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('Accepted & Agreed,', 365, sigY);
      doc
        .moveTo(365, lineY)
        .lineTo(515, lineY)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();
      doc.y = lineY + 6;
      doc
        .fillColor('#475569')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Candidate Signature & Date', 365, lineY + 6);
      doc.y = lineY + 17;
      doc
        .font('Helvetica')
        .fillColor('#64748b')
        .text(data.candidateName, 365, lineY + 17);

      // Bottom Footer note
      doc.y = 750;
      doc
        .fillColor('#94a3b8')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          'Aspino Speciality Chemicals Pvt. Ltd. | Corporate HR Office | Confidential',
          40,
          750,
          { align: 'center', width: 515 },
        );

      // Outer page border frame
      doc.rect(20, 20, 555, 755).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // GUARANTEE: If PDFKit created more than 1 page in buffer, delete extra pages
      const range = doc.bufferedPageRange();
      if (range.count > 1) {
        // PDFKit internal pages array trim
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
