import * as fs from 'fs';
import PDFDocument = require('pdfkit');

export interface OfferPdfData {
  candidateName: string;
  candidateEmail: string;
  role: string;
  salary: number;
  joiningDate: Date | string;
}

export function generateOfferLetterPdf(filePath: string, data: OfferPdfData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 PDF Document with clean 50pt margins
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // ----------------------------------------------------
      // TOP DECORATIVE CORPORATE BORDER
      // ----------------------------------------------------
      doc.rect(0, 0, 595, 15).fill('#0f172a'); // Deep charcoal/navy header bar
      doc.rect(0, 15, 595, 4).fill('#0ea5e9');  // Sky blue accent line

      // ----------------------------------------------------
      // HEADER SECTION
      // ----------------------------------------------------
      doc.moveDown(3);
      doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('ASPINO CHEMICALS CORP', { align: 'center', characterSpacing: 1 });
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0ea5e9').text('GMP CERTIFIED PHARMACEUTICAL & CHEMICAL UNIT', { align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('HQ: Industrial Estate, Sector 5, India | Email: hr@aspinochemicals.com', { align: 'center' });
      doc.moveDown(1.5);

      // Clean divider line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(2);

      // ----------------------------------------------------
      // METADATA & RECIPIENT
      // ----------------------------------------------------
      const formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Date aligned on the right using a simple inline paragraph text flow
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Date: ${formattedDate}`, { align: 'right' });
      doc.moveDown(1);

      // Recipient details
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('To,');
      doc.fontSize(12).font('Helvetica-Bold').text(data.candidateName);
      doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Email: ${data.candidateEmail}`);
      doc.moveDown(2);

      // ----------------------------------------------------
      // SUBJECT BLOCK
      // ----------------------------------------------------
      const subjectY = doc.y;
      doc.rect(50, subjectY, 495, 28).fill('#f8fafc');
      doc.rect(50, subjectY, 3, 28).fill('#0ea5e9'); // Left border accent line
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Subject: Appointment & Offer of Employment', 65, subjectY + 8);
      
      // Advance cursor explicitly below the subject block
      doc.y = subjectY + 45;

      // ----------------------------------------------------
      // SALUTATION & INTRODUCTION BODY
      // ----------------------------------------------------
      doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`Dear ${data.candidateName},`);
      doc.moveDown(0.8);
      doc.text(
        `We are pleased to extend to you a formal offer of employment for the position of ${data.role} at Aspino Chemicals Corp. Following our comprehensive interview process and review of your professional accomplishments, we are confident that your technical expertise, qualifications, and industry knowledge will make a substantial contribution to the success and strategic objectives of our organization.`,
        { align: 'justify', lineGap: 3 }
      );
      doc.moveDown(1.5);

      // ----------------------------------------------------
      // POSITION DETAILS (TABLE STYLING WITH EXPLICIT CURSOR SETTING)
      // ----------------------------------------------------
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Position Details:');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const col1X = 60;
      const col2X = 250;

      // Draw table background headers
      doc.rect(50, tableTop, 495, 22).fill('#f1f5f9');
      doc.fillColor('#475569').fontSize(9.5).font('Helvetica-Bold').text('Offered Designation', col1X, tableTop + 6);
      doc.fillColor('#0f172a').font('Helvetica').text(data.role, col2X, tableTop + 6);

      const row2Top = tableTop + 22;
      doc.rect(50, row2Top, 495, 22).fill('#ffffff');
      doc.fillColor('#475569').font('Helvetica-Bold').text('Annual Compensation (CTC)', col1X, row2Top + 6);
      doc.fillColor('#0f172a').font('Helvetica').text(`Rs. ${data.salary.toLocaleString('en-IN')} / annum`, col2X, row2Top + 6);

      const row3Top = row2Top + 22;
      doc.rect(50, row3Top, 495, 22).fill('#f8fafc');
      doc.fillColor('#475569').font('Helvetica-Bold').text('Expected Joining Date', col1X, row3Top + 6);
      const dateVal = typeof data.joiningDate === 'string' ? new Date(data.joiningDate) : data.joiningDate;
      const formattedJoiningDate = dateVal.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.fillColor('#0f172a').font('Helvetica').text(formattedJoiningDate, col2X, row3Top + 6);

      // Outer table border outline
      doc.rect(50, tableTop, 495, 66).strokeColor('#e2e8f0').lineWidth(1).stroke();
      
      // Advance cursor explicitly past the table
      doc.y = row3Top + 35;

      // ----------------------------------------------------
      // TERMS & CONDITIONS
      // ----------------------------------------------------
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Terms & Conditions:');
      doc.moveDown(0.5);
      doc.fillColor('#475569').fontSize(9.5).font('Helvetica');
      doc.list([
        'Credential Verification: This offer of employment is contingent upon the successful completion of background checks, reference verifications, and the submission of all required academic and professional credentials.',
        'Probationary Period: Upon commencement of your employment, you will undergo a probationary period of six (6) months. Confirmation of permanent status is subject to satisfactory performance appraisals by management.',
        'Acceptance of Offer: Please indicate your formal acceptance of these terms by signing and returning the duplicate copy of this letter on or before your scheduled joining date.'
      ], { bulletRadius: 1.5, textIndent: 12, lineGap: 4 });
      doc.moveDown(2.5);

      // ----------------------------------------------------
      // SIGNATURE blocks (SIDE-BY-SIDE)
      // ----------------------------------------------------
      const sigY = doc.y;
      
      // Left Sign
      doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('Sincerely,', 50, sigY);
      doc.moveDown(2.5);
      const lineY = doc.y;
      doc.moveTo(50, lineY).lineTo(180, lineY).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#475569').fontSize(9).font('Helvetica').text('HR Director', 50, lineY + 5);
      doc.text('Aspino Chemicals Corp', 50, lineY + 17);

      // Right Sign
      doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('Accepted by,', 365, sigY);
      doc.moveDown(2.5);
      doc.moveTo(365, lineY).lineTo(495, lineY).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#475569').fontSize(9).font('Helvetica').text('Candidate Signature & Date', 365, lineY + 5);

      // Premium page frame border (replaces the plain red box with a subtle corporate slate border)
      doc.rect(25, 25, 545, 792).strokeColor('#e2e8f0').lineWidth(1.5).stroke();

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
