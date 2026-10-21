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
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async generateInvoicePdfBuffer(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 25, right: 25 },
        bufferPages: true,
        info: {
          Title: `Invoice_${invoice.invoiceNumber}`,
          Author: 'Aspino Pharma & Healthcare ERP',
          Subject: `${invoice.type === 'SALES' ? 'Tax Invoice' : 'Purchase Invoice'}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isSales = invoice.type === 'SALES';
      const curSym = invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : 'INR';

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
      const headerTitle = isSales ? 'TAX INVOICE' : 'PURCHASE INVOICE';
      doc.rect(startX, curY, tableW, 26).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#ffffff')
        .text(headerTitle, startX, curY + 7, { width: tableW, align: 'center' });

      curY += 26;

      // Section 1: Company Profile (Left) & Invoice Details (Right)
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

      // Right: Invoice Meta Info
      let metaY = curY + 5;
      const rightW = startX + tableW - splitX - pad * 2;
      const drawMetaLine = (lbl: string, val: string, isBold: boolean = false) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#0f172a')
          .text(lbl, splitX + pad, metaY, { width: 95 });
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.5)
          .fillColor('#1e293b')
          .text(val || '-', splitX + pad + 97, metaY, { width: rightW - 97 });
        metaY += 13;
      };

      drawMetaLine('Invoice No:', invoice.invoiceNumber, true);
      drawMetaLine(
        'Invoice Date:',
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : '-'
      );
      drawMetaLine(
        'Due Date:',
        invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '-'
      );
      drawMetaLine('Ref / PO No:', invoice.referenceNumber || invoice.purchaseOrder?.poNumber || '-');
      drawMetaLine('Place of Supply:', invoice.placeOfSupply || 'Telangana (36)');
      drawMetaLine('Mode of Delivery:', invoice.deliveryMode || 'Road / Transport');
      drawMetaLine('Truck / Vehicle No:', invoice.truckNumber || '-');

      curY += sec1H;

      // Section 2: Bill To & Ship To
      const sec2H = 88;
      strokeBorder(startX, curY, tableW, sec2H);
      doc.moveTo(splitX, curY).lineTo(splitX, curY + sec2H).stroke();

      // Bill To
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text(isSales ? 'BILLED TO (BUYER):' : 'SUPPLIER / VENDOR DETAILS:', startX + pad, curY + 5);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(invoice.partyName || '-', startX + pad, curY + 18, { width: splitX - startX - pad * 2 });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(
          `${invoice.billingAddress || invoice.partyAddress || '-'}\n` +
            `GSTIN: ${invoice.partyGstNo || 'Unregistered'} | PAN: ${invoice.partyPanNo || '-'}\n` +
            `Phone: ${invoice.partyPhone || '-'} | Email: ${invoice.partyEmail || '-'}`,
          startX + pad,
          curY + 30,
          { width: splitX - startX - pad * 2, lineGap: 2 }
        );

      // Ship To
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text('SHIPPED TO (CONSIGNEE):', splitX + pad, curY + 5);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(invoice.partyName || '-', splitX + pad, curY + 18, { width: rightW });

      let shipInfo =
        `${invoice.shippingAddress || invoice.billingAddress || invoice.partyAddress || '-'}\n` +
        `State: ${invoice.placeOfSupply || 'Telangana'} | Contact: ${invoice.partyPhone || '-'}`;

      if (invoice.deliveryMode || invoice.truckNumber) {
        shipInfo += `\nMode of Delivery: ${invoice.deliveryMode || 'Road'} | Truck No: ${invoice.truckNumber || 'N/A'}`;
      }

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(shipInfo, splitX + pad, curY + 29, { width: rightW, lineGap: 1.5 });

      curY += sec2H;

      // Section 3: Line Items Table Header
      const thH = 22;
      doc.rect(startX, curY, tableW, thH).fill('#f1f5f9');
      strokeBorder(startX, curY, tableW, thH);

      // Column widths: Total = 545.28
      // S.No(26), Item Description(175), HSN(54), UOM(36), Qty(44), Rate(60), Disc%(36), Tax%(36), Total(78.28)
      const cols = [
        { label: '#', x: startX, w: 26, align: 'center' },
        { label: 'Item & Specifications', x: startX + 26, w: 175, align: 'left' },
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
      const items = Array.isArray(invoice.items) ? invoice.items : [];
      const itemStartY = curY;
      let rowY = curY;

      items.forEach((it: any, idx: number) => {
        const rowH = 24;
        // Background zebra
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

        // Line Total
        doc
          .font('Helvetica-Bold')
          .text(formatINR(it.totalPrice), cols[8].x, rowY + 6, {
            width: cols[8].w - 5,
            align: 'right',
          });

        rowY += rowH;
      });

      // Maintain minimum table height so layout looks crisp
      const minTableBodyH = 140;
      const actualTableH = Math.max(rowY - itemStartY, minTableBodyH);
      strokeBorder(startX, itemStartY, tableW, actualTableH);

      // Draw vertical column dividers for line items
      cols.forEach((c) => {
        doc.moveTo(c.x, itemStartY).lineTo(c.x, itemStartY + actualTableH).stroke();
      });

      curY = itemStartY + actualTableH;

      // Section 5: Financials & Totals
      const finH = 110;
      strokeBorder(startX, curY, tableW, finH);

      // Left split: Amount in Words + Bank details
      const finSplitX = startX + 310;
      doc.moveTo(finSplitX, curY).lineTo(finSplitX, curY + finH).stroke();

      // Amount in words
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('TOTAL AMOUNT IN WORDS:', startX + pad, curY + 6);

      const wordsStr = numberToWords(invoice.totalAmount || 0);
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#1e293b')
        .text(wordsStr, startX + pad, curY + 18, { width: finSplitX - startX - pad * 2 });

      // Bank Details
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('BANK & PAYMENT DETAILS:', startX + pad, curY + 45);

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(
          `Bank: ${invoice.bankName || 'HDFC Bank Ltd., Mallapur Branch'}\n` +
            `Account Name: ASPINO CHEMICALS & PHARMACEUTICALS PVT LTD\n` +
            `A/C No: ${invoice.bankAccountNumber || '50200067489210'} | IFSC: ${invoice.bankIfsc || 'HDFC0001824'}\n` +
            `UPI / IMPS: aspinopharma@hdfcbank`,
          startX + pad,
          curY + 57,
          { width: finSplitX - startX - pad * 2, lineGap: 2 }
        );

      // Right split: Breakdown (SubTotal, Discount, CGST, SGST, IGST, Shipping, Total)
      let finY = curY + 5;
      const finRightW = startX + tableW - finSplitX - pad * 2;

      const drawFinLine = (lbl: string, val: number | string, isBold: boolean = false, isHighlight: boolean = false) => {
        if (isHighlight) {
          doc.rect(finSplitX, finY - 2, startX + tableW - finSplitX, 16).fill('#0f172a');
        }
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHighlight ? 9 : 7.5)
          .fillColor(isHighlight ? '#ffffff' : '#334155')
          .text(lbl, finSplitX + pad, finY, { width: 110 });

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHighlight ? 9 : 7.5)
          .fillColor(isHighlight ? '#ffffff' : '#0f172a')
          .text(`${curSym} ${typeof val === 'number' ? formatINR(val) : val}`, finSplitX + pad + 110, finY, {
            width: finRightW - 110,
            align: 'right',
          });
        finY += isHighlight ? 18 : 13.5;
      };

      drawFinLine('Sub Total (Taxable):', invoice.subTotal);
      if (invoice.discountAmount > 0) {
        drawFinLine(`Discount (${invoice.discountPercentage}%):`, -invoice.discountAmount);
      }
      if (invoice.cgstAmount > 0) {
        drawFinLine('CGST:', invoice.cgstAmount);
      }
      if (invoice.sgstAmount > 0) {
        drawFinLine('SGST:', invoice.sgstAmount);
      }
      if (invoice.igstAmount > 0) {
        drawFinLine('IGST:', invoice.igstAmount);
      }
      if (invoice.shippingCharges > 0) {
        drawFinLine('Freight / Shipping:', invoice.shippingCharges);
      }
      if (invoice.otherCharges > 0) {
        drawFinLine('Other Charges:', invoice.otherCharges);
      }
      drawFinLine('Grand Total:', invoice.totalAmount, true, true);

      curY += finH;

      // Section 6: Terms & Conditions and Authorized Signatory
      const termsH = 80;
      strokeBorder(startX, curY, tableW, termsH);
      doc.moveTo(splitX, curY).lineTo(splitX, curY + termsH).stroke();

      // Left: Terms
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('TERMS & CONDITIONS:', startX + pad, curY + 6);

      const termsText =
        invoice.termsAndConditions ||
        '1. Payment due strictly within agreed credit terms.\n' +
          '2. Interest @18% p.a. will be levied on overdue bills.\n' +
          '3. Material once sold will not be accepted back without prior QC approval.\n' +
          '4. Disputes subject exclusively to Hyderabad jurisdiction.';

      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#64748b')
        .text(termsText, startX + pad, curY + 18, {
          width: splitX - startX - pad * 2,
          lineGap: 2,
        });

      // Right: Signatory
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text('For ASPINO CHEMICALS & PHARMACEUTICALS PVT. LTD.', splitX + pad, curY + 6, {
          width: rightW,
          align: 'right',
        });

      doc
        .font('Helvetica-Oblique')
        .fontSize(7)
        .fillColor('#94a3b8')
        .text('[Digitally Generated & Verified]', splitX + pad, curY + 45, {
          width: rightW,
          align: 'right',
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0f172a')
        .text('Authorized Signatory', splitX + pad, curY + 60, {
          width: rightW,
          align: 'right',
        });

      doc.end();
    });
  }
}
