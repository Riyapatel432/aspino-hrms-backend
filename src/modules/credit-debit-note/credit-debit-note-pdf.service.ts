import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// Helper for Indian Currency in Words
function numberToWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(n: number) {
    if (n < 20) return a[n];
    const unit = n % 10;
    return b[Math.floor(n / 10)] + (unit ? ` ${a[unit]}` : '');
  }

  function convertThreeDigits(n: number) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += `${a[hundred]} Hundred`;
    if (rest > 0)
      res += `${hundred > 0 ? ' and ' : ''}${convertTwoDigits(rest)}`;
    return res;
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  let hundred = rem % 1000;

  let str = '';
  if (crore > 0) str += `${convertThreeDigits(crore)} Crore `;
  if (lakh > 0) str += `${convertThreeDigits(lakh)} Lakh `;
  if (thousand > 0) str += `${convertThreeDigits(thousand)} Thousand `;
  if (hundred > 0) str += `${convertThreeDigits(hundred)} `;

  str = str.trim() ? `${str.trim()} Rupees` : 'Zero Rupees';

  if (decimalPart > 0) {
    str += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  return `${str} Only`;
}

function formatINR(val: number | string): string {
  const n = Number(val) || 0;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

@Injectable()
export class CreditDebitNotePdfService {
  private readonly logger = new Logger(CreditDebitNotePdfService.name);

  async generateNotePdfBuffer(note: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 25, right: 25 },
        bufferPages: true,
        info: {
          Title: `${note.noteNumber || 'Note'}_Document`,
          Author: 'Aspino Pharma & Healthcare ERP',
          Subject: `${note.type === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isCredit = note.type === 'CREDIT_NOTE';
      const curSym = note.currency === 'USD' ? '$' : note.currency === 'EUR' ? '€' : 'INR';

      // Page Geometry
      const startX = 25;
      let curY = 20;
      const tableW = 545.28;
      const splitX = startX + 310;

      // Outer border helper
      const strokeBorder = (x: number, y: number, w: number, h: number) => {
        doc.rect(x, y, w, h).lineWidth(0.75).strokeColor('#334155').stroke();
      };

      // Header Banner
      const headerTitle = isCredit ? 'CREDIT NOTE (GST SECTION 34)' : 'DEBIT NOTE (GST SECTION 34)';
      const headerColor = isCredit ? '#0f766e' : '#b45309'; // teal for credit, amber/brown for debit
      doc.rect(startX, curY, tableW, 26).fill(headerColor);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#ffffff')
        .text(headerTitle, startX, curY + 7, { width: tableW, align: 'center' });

      curY += 26;

      // Section 1: Company Profile (Left) & Note Meta Info (Right)
      const sec1H = 104;
      strokeBorder(startX, curY, tableW, sec1H);
      doc.moveTo(splitX, curY).lineTo(splitX, curY + sec1H).stroke();

      // Left: Company Info
      const pad = 6;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text('ASPINO CHEMICALS & PHARMACEUTICALS PVT. LTD.', startX + pad, curY + 6, {
          width: splitX - startX - pad * 2,
        });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#475569')
        .text(
          'Plot No. 42, IDA Phase-II, Mallapur, Hyderabad - 500076, Telangana, India\n' +
            'Email: sales@aspinochemicals.com | Web: www.aspinochemicals.com\n' +
            'GSTIN: 36AABCA1234F1Z8 | CIN: U24231TG2020PTC145678 | State: Telangana (36)',
          startX + pad,
          curY + 22,
          { width: splitX - startX - pad * 2, lineGap: 2.5 }
        );

      // Right: Note Meta Info
      let metaY = curY + 5;
      const rightW = startX + tableW - splitX - pad * 2;
      const drawMetaLine = (lbl: string, val: string, isBold: boolean = false) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#0f172a')
          .text(lbl, splitX + pad, metaY, { width: 105 });
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.5)
          .fillColor('#1e293b')
          .text(val || '-', splitX + pad + 107, metaY, { width: rightW - 107 });
        metaY += 13;
      };

      drawMetaLine(isCredit ? 'Credit Note No:' : 'Debit Note No:', note.noteNumber, true);
      drawMetaLine(
        'Note Date:',
        note.noteDate ? new Date(note.noteDate).toLocaleDateString('en-IN') : '-'
      );
      drawMetaLine('Original Invoice No:', note.invoiceNumber || note.invoice?.invoiceNumber || '-');
      drawMetaLine(
        'Original Invoice Date:',
        note.originalInvoiceDate
          ? new Date(note.originalInvoiceDate).toLocaleDateString('en-IN')
          : (note.invoice?.invoiceDate ? new Date(note.invoice.invoiceDate).toLocaleDateString('en-IN') : '-')
      );
      drawMetaLine('Reason for Issue:', note.reason || 'Sales Return / Adjustment');
      drawMetaLine('Place of Supply:', note.placeOfSupply || 'Telangana (36)');
      drawMetaLine('Status:', note.status || 'ISSUED', true);

      curY += sec1H;

      // Section 2: Party Details (Bill To & Ship To)
      const sec2H = 80;
      strokeBorder(startX, curY, tableW, sec2H);
      doc.moveTo(splitX, curY).lineTo(splitX, curY + sec2H).stroke();

      // Party Details Left
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text('ISSUED TO (PARTY DETAILS):', startX + pad, curY + 5);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(note.partyName || '-', startX + pad, curY + 18, { width: splitX - startX - pad * 2 });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(
          `${note.billingAddress || note.partyAddress || '-'}\n` +
            `GSTIN: ${note.partyGstNo || 'Unregistered'} | PAN: ${note.partyPanNo || '-'}\n` +
            `Phone: ${note.partyPhone || '-'} | Email: ${note.partyEmail || '-'}`,
          startX + pad,
          curY + 30,
          { width: splitX - startX - pad * 2, lineGap: 2 }
        );

      // Shipping / Dispatch Right
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text('SHIPPED / DISPATCHED TO:', splitX + pad, curY + 5);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(note.partyName || '-', splitX + pad, curY + 18, { width: rightW });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(
          `${note.shippingAddress || note.billingAddress || note.partyAddress || '-'}\n` +
            `State: ${note.placeOfSupply || 'Telangana'} | Contact: ${note.partyPhone || '-'}`,
          splitX + pad,
          curY + 30,
          { width: rightW, lineGap: 1.5 }
        );

      curY += sec2H;

      // Section 3: Line Items Table Header
      const thH = 22;
      doc.rect(startX, curY, tableW, thH).fill('#f1f5f9');
      strokeBorder(startX, curY, tableW, thH);

      const cols = [
        { label: '#', x: startX, w: 26, align: 'center' },
        { label: 'Item & Specifications / Reason Details', x: startX + 26, w: 175, align: 'left' },
        { label: 'HSN/SAC', x: startX + 201, w: 54, align: 'center' },
        { label: 'UOM', x: startX + 255, w: 36, align: 'center' },
        { label: 'Qty', x: startX + 291, w: 44, align: 'right' },
        { label: `Rate (${curSym})`, x: startX + 335, w: 60, align: 'right' },
        { label: 'Disc %', x: startX + 395, w: 36, align: 'right' },
        { label: 'Tax %', x: startX + 431, w: 36, align: 'right' },
        { label: `Total (${curSym})`, x: startX + 467, w: 78.28, align: 'right' },
      ];

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b');
      cols.forEach((c) => {
        const textX = c.align === 'right' ? c.x : c.x + 3;
        const textW = c.align === 'right' ? c.w - 5 : c.w - 6;
        doc.text(c.label, textX, curY + 6.5, { width: textW, align: c.align as any });
      });

      curY += thH;

      // Section 4: Line Items Table Body
      const items = Array.isArray(note.items) ? note.items : [];
      let rowY = curY;

      items.forEach((it: any, idx: number) => {
        const rowH = 24;
        if (idx % 2 === 1) {
          doc.rect(startX, rowY, tableW, rowH).fill('#f8fafc');
        }

        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');
        // S.No
        doc.text(String(idx + 1), cols[0].x, rowY + 5, { width: cols[0].w, align: 'center' });

        // Item Name & Description
        doc.font('Helvetica-Bold').text(it.itemName || 'Item', cols[1].x + 3, rowY + 4, {
          width: cols[1].w - 6,
          lineBreak: false,
        });
        if (it.description || it.batchNumber) {
          doc
            .font('Helvetica')
            .fontSize(6.5)
            .fillColor('#64748b')
            .text(
              [it.batchNumber ? `Batch: ${it.batchNumber}` : '', it.description]
                .filter(Boolean)
                .join(' | '),
              cols[1].x + 3,
              rowY + 13,
              { width: cols[1].w - 6, lineBreak: false }
            );
        }

        // HSN
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(it.hsnCode || '-', cols[2].x, rowY + 6, { width: cols[2].w, align: 'center' });

        // UOM
        doc.text(it.uom || 'Nos', cols[3].x, rowY + 6, { width: cols[3].w, align: 'center' });

        // Qty
        doc.text(formatINR(it.quantity), cols[4].x, rowY + 6, {
          width: cols[4].w - 5,
          align: 'right',
        });

        // Rate
        doc.text(formatINR(it.unitPrice), cols[5].x, rowY + 6, {
          width: cols[5].w - 5,
          align: 'right',
        });

        // Disc %
        doc.text(it.discountPercent ? `${it.discountPercent}%` : '0%', cols[6].x, rowY + 6, {
          width: cols[6].w - 5,
          align: 'right',
        });

        // Tax %
        doc.text(it.taxPercent ? `${it.taxPercent}%` : '0%', cols[7].x, rowY + 6, {
          width: cols[7].w - 5,
          align: 'right',
        });

        // Total
        doc.font('Helvetica-Bold').text(formatINR(it.totalPrice), cols[8].x, rowY + 6, {
          width: cols[8].w - 5,
          align: 'right',
        });

        rowY += rowH;
      });

      // Border around items
      const totalItemsH = Math.max(rowY - curY, 48);
      strokeBorder(startX, curY, tableW, totalItemsH);

      // Draw vertical column grid lines
      cols.slice(1).forEach((c) => {
        doc.moveTo(c.x, curY).lineTo(c.x, curY + totalItemsH).strokeColor('#e2e8f0').stroke();
      });

      curY += totalItemsH;

      // Section 5: Summary & Totals
      const summaryH = 110;
      strokeBorder(startX, curY, tableW, summaryH);
      const sumSplitX = startX + 310;
      doc.moveTo(sumSplitX, curY).lineTo(sumSplitX, curY + summaryH).strokeColor('#334155').stroke();

      // Left: Amount in Words, Reason & Notes
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('AMOUNT IN WORDS:', startX + pad, curY + 6);

      const words = numberToWords(note.totalAmount || 0);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#1e293b')
        .text(words, startX + pad, curY + 17, { width: sumSplitX - startX - pad * 2 });

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('REASON / REMARKS:', startX + pad, curY + 40);

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(note.reason || 'Adjustment against invoice', startX + pad, curY + 50, {
          width: sumSplitX - startX - pad * 2,
        });

      if (note.notes) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(6.5)
          .fillColor('#64748b')
          .text(`Notes: ${note.notes}`, startX + pad, curY + 70, {
            width: sumSplitX - startX - pad * 2,
          });
      }

      // Right: Calculations Breakdown
      let calcY = curY + 6;
      const calcW = startX + tableW - sumSplitX - pad * 2;
      const drawCalcLine = (lbl: string, val: number, isTotal: boolean = false) => {
        doc
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal ? 8.5 : 7.5)
          .fillColor(isTotal ? '#0f172a' : '#475569')
          .text(lbl, sumSplitX + pad, calcY, { width: 120 });
        doc
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal ? 8.5 : 7.5)
          .fillColor(isTotal ? '#0f172a' : '#1e293b')
          .text(`${curSym} ${formatINR(val)}`, sumSplitX + pad + 120, calcY, {
            width: calcW - 120,
            align: 'right',
          });
        calcY += isTotal ? 16 : 12;
      };

      drawCalcLine('Sub Total (Taxable):', note.subTotal || 0);
      if (note.cgstAmount > 0) drawCalcLine('CGST:', note.cgstAmount);
      if (note.sgstAmount > 0) drawCalcLine('SGST:', note.sgstAmount);
      if (note.igstAmount > 0) drawCalcLine('IGST:', note.igstAmount);
      if (note.otherCharges > 0) drawCalcLine('Other Charges:', note.otherCharges);
      if (note.roundOff !== 0) drawCalcLine('Round Off:', note.roundOff || 0);

      doc.moveTo(sumSplitX, calcY).lineTo(startX + tableW, calcY).strokeColor('#cbd5e1').stroke();
      calcY += 3;
      drawCalcLine(isCredit ? 'Total Credit Note Value:' : 'Total Debit Note Value:', note.totalAmount || 0, true);

      curY += summaryH;

      // Section 6: Declaration & Signatures
      const footerH = 60;
      strokeBorder(startX, curY, tableW, footerH);
      doc.moveTo(sumSplitX, curY).lineTo(sumSplitX, curY + footerH).strokeColor('#334155').stroke();

      // Terms
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#0f172a')
        .text('DECLARATION / CONDITIONS:', startX + pad, curY + 5);

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#475569')
        .text(
          note.termsAndConditions ||
            '1. This note is issued in accordance with Section 34 of the CGST Act, 2017.\n' +
            '2. Credit/Debit value will be adjusted in subsequent billing or statement of account.\n' +
            '3. Subject to Hyderabad Jurisdiction only.',
          startX + pad,
          curY + 16,
          { width: sumSplitX - startX - pad * 2, lineGap: 2 }
        );

      // Signatory
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('For ASPINO CHEMICALS & PHARMA PVT LTD', sumSplitX + pad, curY + 5, {
          width: calcW,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#64748b')
        .text('Authorized Signatory', sumSplitX + pad, curY + footerH - 14, {
          width: calcW,
          align: 'right',
        });

      doc.end();
    });
  }
}
