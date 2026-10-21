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

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  const hundred = rem % 1000;

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
export class QuotationPdfService {
  private readonly logger = new Logger(QuotationPdfService.name);

  async generateQuotationPdfBuffer(quotation: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // A4 page: 595.28 x 841.89 pt
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 22, bottom: 22, left: 25, right: 25 },
        bufferPages: true,
        info: {
          Title: `Quotation_${quotation.quotationNumber}`,
          Author: 'Aspino Pharma & Healthcare ERP',
          Subject: 'Commercial Quotation Form',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const currency = quotation.currency || 'INR';
      const curSym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'INR';

      // Page Geometry: Table Frame fills A4 with balanced readable proportions
      const startX = 25;
      const startY = 22;
      const tableW = 545.28; // 595.28 - 50
      const splitX = startX + 300; // Left: 300pt, Right: 245.28pt

      // Heights allocation
      const titleH = 24;      // 22 -> 46
      const row1H = 96;       // 46 -> 142 (Company + Quotation Metadata)
      const row2H = 88;       // 142 -> 230 (Buyer + Consignee Details)
      const thH = 24;         // 230 -> 254 (Line Items Table Header)
      const subRowH = 22;     // Subtotal row
      const finH = 114;       // Financials + Amount in Words + Bank details
      const termsH = 100;     // Terms + Signatory Box

      // Target bottom of table = 780
      const totalBottomSectionsH = subRowH + finH + termsH; // 22 + 114 + 100 = 236 pt
      const fixedTopH = titleH + row1H + row2H + thH;       // 24 + 96 + 88 + 24 = 232 pt
      const targetTableBottom = 780;
      const itemsTableBodyH = targetTableBottom - (startY + fixedTopH + totalBottomSectionsH); // 290 pt

      const items = Array.isArray(quotation.items) ? quotation.items : [];
      let actualItemsH = 0;
      items.forEach((item) => {
        const hasSub = !!(
          item.itemCode ||
          item.description ||
          item.product?.itemCode ||
          item.product?.description
        );
        actualItemsH += hasSub ? 32 : 24;
      });

      const bodyH = Math.max(actualItemsH, itemsTableBodyH);
      const totalFrameH = fixedTopH + bodyH + totalBottomSectionsH;

      // 0. TOP TITLE HEADER BANNER
      doc.rect(startX, startY, tableW, titleH).fill('#f1f5f9');
      doc.rect(startX, startY, tableW, titleH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .fillColor('#000000')
        .fontSize(11.5)
        .font('Helvetica-Bold')
        .text('COMMERCIAL PRICE QUOTATION', startX, startY + 6.5, {
          width: tableW,
          align: 'center',
        });

      // 1. HEADER ROW (Company on left, Quotation meta on right)
      const row1Y = startY + titleH;
      const leftCellW = splitX - startX; // 300 pt
      const rightCellW = tableW - leftCellW; // 245.28 pt

      doc.rect(startX, row1Y, tableW, row1H).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(splitX, row1Y)
        .lineTo(splitX, row1Y + row1H)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      // Company Block (Left cell - cleanly spaced so NO text ever wraps or overflows)
      doc
        .fillColor('#000000')
        .fontSize(13.5)
        .font('Helvetica-Bold')
        .text('ASPINO PHARMA', startX + 9, row1Y + 7, { width: leftCellW - 18 });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#222222')
        .text(
          'Plot 45-48, Pharma City Industrial Zone, Hyderabad - 500001, India',
          startX + 9,
          row1Y + 25,
          { width: leftCellW - 18 },
        )
        .text(
          'Email: sales@aspinochemicals.com   |   Ph: +91 (040) 2456-7890',
          startX + 9,
          row1Y + 37,
          { width: leftCellW - 18 },
        )
        .text(
          'Web: www.aspinopharma.com   |   CIN: U24239TG2020PTC145678',
          startX + 9,
          row1Y + 49,
          { width: leftCellW - 18 },
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text(
          'GSTIN: 36AABCU9603R1ZM   |   PAN: AABCU9603R',
          startX + 9,
          row1Y + 65,
          { width: leftCellW - 18 },
        );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#333333')
        .text(
          'Drug License No: TS/HYD/2026/8841',
          startX + 9,
          row1Y + 78,
          { width: leftCellW - 18 },
        );

      // Quotation Details (Right cell - 9pt bold labels, ample width: 245pt)
      const rightInnerX = splitX + 9;
      const rightInnerW = rightCellW - 18;
      let rY = row1Y + 8;

      const qDate = quotation.quotationDate
        ? new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '-';
      const vDate = quotation.validUntil
        ? new Date(quotation.validUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : '-';

      const addMetaRow = (label: string, value: string, isBold = false) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.8)
          .fillColor('#000000')
          .text(label, rightInnerX, rY, { width: 95 });
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.8)
          .fillColor('#000000')
          .text(`:  ${value}`, rightInnerX + 95, rY, { width: rightInnerW - 95 });
        rY += 15;
      };

      addMetaRow('Quotation No.', quotation.quotationNumber, true);
      addMetaRow('Quotation Date', qDate);
      addMetaRow('Valid Until', vDate);
      addMetaRow('Ref / RFQ No.', quotation.referenceNumber || 'N/A');
      addMetaRow('Quotation Status', quotation.status || 'DRAFT', true);

      // 2. CUSTOMER & DELIVERY ROW (Grid Table)
      const row2Y = row1Y + row1H;
      const stripH = 18;

      // Left Cell: Billed To
      doc.rect(startX, row2Y, leftCellW, stripH).fill('#f8fafc');
      doc.rect(startX, row2Y, leftCellW, row2H).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(startX, row2Y + stripH)
        .lineTo(splitX, row2Y + stripH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('DETAILS OF RECEIVER / BILLED TO:', startX + 9, row2Y + 5, { width: leftCellW - 18 });

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#000000')
        .text(quotation.customerName || 'Client Name', startX + 9, row2Y + 24, {
          width: leftCellW - 18,
          ellipsis: true,
        });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#222222')
        .text(
          quotation.billingAddress || 'Registered Commercial Office Address',
          startX + 9,
          row2Y + 38,
          { width: leftCellW - 18, height: 26, ellipsis: true },
        );
      const billGst = quotation.gstNo ? `GSTIN: ${quotation.gstNo}` : 'GSTIN: Unregistered';
      const billPhone = quotation.customerPhone ? `Ph: ${quotation.customerPhone}` : '';
      doc
        .font('Helvetica-Bold')
        .fontSize(8.2)
        .fillColor('#000000')
        .text([billGst, billPhone].filter(Boolean).join('   |   '), startX + 9, row2Y + 68, {
          width: leftCellW - 18,
        });

      // Right Cell: Shipped To
      doc.rect(splitX, row2Y, rightCellW, stripH).fill('#f8fafc');
      doc.rect(splitX, row2Y, rightCellW, row2H).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(splitX, row2Y + stripH)
        .lineTo(startX + tableW, row2Y + stripH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('DISPATCH / SHIPPED TO & TERMS:', splitX + 9, row2Y + 5, { width: rightInnerW });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#222222')
        .text(
          `Delivery Destination:\n${quotation.shippingAddress || quotation.billingAddress || 'Customer Warehouse / Factory Site'}`,
          splitX + 9,
          row2Y + 24,
          { width: rightInnerW, height: 26, ellipsis: true },
        );
      doc
        .font('Helvetica-Bold')
        .fontSize(8.2)
        .fillColor('#000000')
        .text(`Payment Terms: ${quotation.paymentTerms || 'Net 30 Days'}`, splitX + 9, row2Y + 54, {
          width: rightInnerW,
        });
      doc.text(
        `Delivery Terms: ${quotation.deliveryTerms || 'Ex-Factory'}   |   Currency: ${currency}`,
        splitX + 9,
        row2Y + 68,
        { width: rightInnerW },
      );

      // 3. MAIN LINE ITEMS TABLE GRID
      // Generous Amount column (93.28pt) so amounts NEVER wrap onto 2 lines!
      const tableTop = row2Y + row2H;
      const cols = [
        { id: 'sr', label: 'S.No', x: startX, w: 26, align: 'center' },
        { id: 'name', label: 'Description of Goods & Specifications', x: startX + 26, w: 190, align: 'left' },
        { id: 'hsn', label: 'HSN/SAC', x: startX + 216, w: 48, align: 'center' },
        { id: 'qty', label: 'Qty', x: startX + 264, w: 36, align: 'right' },
        { id: 'uom', label: 'UOM', x: startX + 300, w: 30, align: 'center' },
        { id: 'rate', label: `Rate (${curSym})`, x: startX + 330, w: 58, align: 'right' },
        { id: 'disc', label: 'Disc %', x: startX + 388, w: 32, align: 'center' },
        { id: 'tax', label: 'GST %', x: startX + 420, w: 32, align: 'center' },
        { id: 'amt', label: `Amount (${curSym})`, x: startX + 452, w: 93.28, align: 'right' },
      ];

      // Table Header Row
      doc.rect(startX, tableTop, tableW, thH).fill('#f1f5f9');
      doc.rect(startX, tableTop, tableW, thH).strokeColor('#000000').lineWidth(0.8).stroke();

      doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold');
      cols.forEach((c) => {
        const pad = c.align === 'left' ? 5 : c.align === 'right' ? -5 : 0;
        doc.text(c.label, c.x + pad, tableTop + 7.5, {
          width: c.w - (pad !== 0 ? 10 : 0),
          align: c.align as any,
        });
      });

      cols.forEach((c, idx) => {
        if (idx > 0) {
          doc
            .moveTo(c.x, tableTop)
            .lineTo(c.x, tableTop + thH)
            .strokeColor('#000000')
            .lineWidth(0.8)
            .stroke();
        }
      });

      let currentY = tableTop + thH;
      const tableRowsStartY = currentY;
      let totalQty = 0;

      items.forEach((item, index) => {
        const itemCodeDesc = [
          item.itemCode || item.product?.itemCode ? `Code: ${item.itemCode || item.product?.itemCode}` : '',
          item.description || item.product?.description || '',
        ].filter(Boolean).join(' • ');

        const rowH = itemCodeDesc ? 32 : 24;
        const qNum = Number(item.quantity) || 0;
        totalQty += qNum;

        doc.fillColor('#000000').font('Helvetica').fontSize(9);
        doc.text(String(index + 1), cols[0].x, currentY + 6, {
          width: cols[0].w,
          align: 'center',
        });

        // Item Name
        doc
          .font('Helvetica-Bold')
          .fontSize(9.2)
          .text(item.itemName || 'Item', cols[1].x + 5, currentY + 5, {
            width: cols[1].w - 10,
            ellipsis: true,
          });

        if (itemCodeDesc) {
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#444444')
            .text(itemCodeDesc, cols[1].x + 5, currentY + 18, {
              width: cols[1].w - 10,
              ellipsis: true,
            });
        }

        doc.fillColor('#000000').fontSize(8.8).font('Helvetica');
        doc.text(item.hsnCode || '-', cols[2].x, currentY + 6, {
          width: cols[2].w,
          align: 'center',
        });
        doc.text(qNum.toLocaleString('en-IN'), cols[3].x, currentY + 6, {
          width: cols[3].w - 4,
          align: 'right',
        });
        doc.text(item.uom || 'NOS', cols[4].x, currentY + 6, {
          width: cols[4].w,
          align: 'center',
        });
        doc.text(formatINR(item.unitPrice), cols[5].x, currentY + 6, {
          width: cols[5].w - 4,
          align: 'right',
        });
        doc.text(
          Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '-',
          cols[6].x,
          currentY + 6,
          { width: cols[6].w, align: 'center' },
        );
        doc.text(`${item.taxPercent || 18}%`, cols[7].x, currentY + 6, {
          width: cols[7].w,
          align: 'center',
        });
        doc
          .font('Helvetica-Bold')
          .fontSize(9.2)
          .text(formatINR(item.totalPrice), cols[8].x, currentY + 6, {
            width: cols[8].w - 6,
            align: 'right',
          });

        doc
          .moveTo(startX, currentY + rowH)
          .lineTo(startX + tableW, currentY + rowH)
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .stroke();

        currentY += rowH;
      });

      const tableBodyEnd = tableRowsStartY + bodyH;

      doc
        .rect(startX, tableRowsStartY, tableW, bodyH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      cols.forEach((c, idx) => {
        if (idx > 0) {
          doc
            .moveTo(c.x, tableRowsStartY)
            .lineTo(c.x, tableBodyEnd)
            .strokeColor('#000000')
            .lineWidth(0.8)
            .stroke();
        }
      });

      // Subtotal Row
      doc.rect(startX, tableBodyEnd, tableW, subRowH).fill('#f8fafc');
      doc
        .rect(startX, tableBodyEnd, tableW, subRowH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .moveTo(cols[3].x, tableBodyEnd)
        .lineTo(cols[3].x, tableBodyEnd + subRowH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();
      doc
        .moveTo(cols[4].x, tableBodyEnd)
        .lineTo(cols[4].x, tableBodyEnd + subRowH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();
      doc
        .moveTo(cols[8].x, tableBodyEnd)
        .lineTo(cols[8].x, tableBodyEnd + subRowH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc.fillColor('#000000').fontSize(8.8).font('Helvetica-Bold');
      doc.text(
        'Total Items / Cumulative Quantity:',
        cols[1].x + 5,
        tableBodyEnd + 6.5,
        { width: cols[1].w + cols[2].w },
      );
      doc.text(totalQty.toLocaleString('en-IN'), cols[3].x, tableBodyEnd + 6.5, {
        width: cols[3].w - 4,
        align: 'right',
      });
      // In Amount column (width 93.28pt): Single line fits completely without breaking!
      doc.text(
        `${curSym} ${formatINR(quotation.subTotal)}`,
        cols[8].x,
        tableBodyEnd + 6.5,
        { width: cols[8].w - 6, align: 'right' },
      );

      // 4. FINANCIAL SUMMARY & AMOUNT IN WORDS (Grid row)
      const finTop = tableBodyEnd + subRowH;

      // Left Cell: Amount in words & Bank info
      doc.rect(startX, finTop, leftCellW, stripH).fill('#f8fafc');
      doc.rect(startX, finTop, leftCellW, finH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(startX, finTop + stripH)
        .lineTo(splitX, finTop + stripH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('TOTAL AMOUNT IN WORDS (INDIAN RUPEES):', startX + 9, finTop + 5, {
          width: leftCellW - 18,
        });

      const words = numberToWords(Number(quotation.totalAmount || 0));
      doc
        .font('Helvetica-Bold')
        .fontSize(8.8)
        .fillColor('#000000')
        .text(words, startX + 9, finTop + 24, {
          width: leftCellW - 18,
          height: 28,
          lineGap: 2,
        });

      // Bank Remittance Divider & Header
      doc
        .moveTo(startX, finTop + 54)
        .lineTo(splitX, finTop + 54)
        .strokeColor('#000000')
        .lineWidth(0.5)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#000000')
        .text('BANK REMITTANCE DETAILS:', startX + 9, finTop + 58, { width: leftCellW - 18 });

      doc.font('Helvetica').fontSize(8).fillColor('#222222');
      doc.text(
        'Bank: HDFC Bank Ltd   |   A/C No: 50200088991122',
        startX + 9,
        finTop + 71,
        { width: leftCellW - 18 },
      );
      doc.text(
        'IFSC: HDFC0001234   |   Branch: Banjara Hills, Hyderabad',
        startX + 9,
        finTop + 83,
        { width: leftCellW - 18 },
      );
      doc
        .font('Helvetica-Oblique')
        .fontSize(7.2)
        .fillColor('#555555')
        .text(
          'Note: Please mention Quotation No. in payment advice for reconciliation.',
          startX + 9,
          finTop + 97,
          { width: leftCellW - 18 },
        );

      // Right Cell: Financial breakdown grid (Ample width: 245.28pt)
      doc.rect(splitX, finTop, rightCellW, finH).strokeColor('#000000').lineWidth(0.8).stroke();

      let fY = finTop + 7;
      const addFinRow = (label: string, value: string, isBold = false) => {
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.8)
          .fillColor('#000000')
          .text(label, rightInnerX, fY, { width: 140 });
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.8)
          .fillColor('#000000')
          .text(value, rightInnerX + 140, fY, { width: rightInnerW - 140, align: 'right' });
        fY += 15;
      };

      addFinRow('Taxable Subtotal:', `${curSym} ${formatINR(quotation.subTotal)}`);
      addFinRow(
        `Overall Discount (${quotation.discountPercentage || 0}%):`,
        `- ${curSym} ${formatINR(quotation.discountAmount)}`,
      );
      addFinRow(
        `${quotation.taxType || 'GST'} Amount:`,
        `+ ${curSym} ${formatINR(quotation.taxAmount)}`,
      );
      addFinRow(
        'Freight & Handling:',
        `+ ${curSym} ${formatINR(Number(quotation.shippingCharges || 0) + Number(quotation.otherCharges || 0))}`,
      );

      // Net Grand Total Banner
      const netBannerH = 28;
      const netBannerY = finTop + finH - netBannerH;
      doc.rect(splitX, netBannerY, rightCellW, netBannerH).fill('#000000');
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9.2)
        .text('NET GRAND TOTAL:', rightInnerX, netBannerY + 8.5);
      doc
        .fontSize(10.8)
        .text(
          `${curSym} ${formatINR(quotation.totalAmount)}`,
          rightInnerX,
          netBannerY + 7.5,
          { width: rightInnerW, align: 'right' },
        );

      // 5. COMMERCIAL TERMS & CONDITIONS & SIGNATURE GRID ROW
      const termsTop = finTop + finH;

      // Left Cell: Terms
      doc.rect(startX, termsTop, leftCellW, stripH).fill('#f8fafc');
      doc.rect(startX, termsTop, leftCellW, termsH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(startX, termsTop + stripH)
        .lineTo(splitX, termsTop + stripH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('TERMS & CONDITIONS OF SALE:', startX + 9, termsTop + 5, { width: leftCellW - 18 });

      const termsText =
        quotation.termsAndConditions ||
        '1. Prices are valid for 30 days from date of quotation.\n2. Goods dispatched with Certificate of Analysis (COA) per batch.\n3. Goods once sold will be replaced only against verified manufacturing or QC defects within 7 days.\n4. Subject to Hyderabad, Telangana judicial jurisdiction.';

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#222222')
        .text(termsText, startX + 9, termsTop + 25, {
          width: leftCellW - 18,
          height: 56,
          ellipsis: true,
          lineGap: 2.2,
        });
      doc
        .fontSize(7.5)
        .fillColor('#555555')
        .text(
          `Prepared By: ${quotation.preparedBy || 'Commercial Sales Team'} • Computer Generated Document`,
          startX + 9,
          termsTop + 84,
          { width: leftCellW - 18 },
        );

      // Right Cell: Signatory Box
      doc.rect(splitX, termsTop, rightCellW, stripH).fill('#f8fafc');
      doc.rect(splitX, termsTop, rightCellW, termsH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .moveTo(splitX, termsTop + stripH)
        .lineTo(startX + tableW, termsTop + stripH)
        .strokeColor('#000000')
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('FOR ASPINO PHARMA & HEALTHCARE:', splitX + 9, termsTop + 5, {
          width: rightInnerW,
          align: 'center',
        });

      doc
        .rect(splitX + 25, termsTop + 68, rightInnerW - 34, 0.8)
        .strokeColor('#000000')
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#333333')
        .text('Authorized Commercial Signatory', splitX + 9, termsTop + 76, {
          width: rightInnerW,
          align: 'center',
        });

      // Outer Rectangular Border stroked last to ensure no gaps
      doc.rect(startX, startY, tableW, totalFrameH).strokeColor('#000000').lineWidth(1.2).stroke();

      // 6. FOOTER PASS
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;

        doc
          .fontSize(7.5)
          .fillColor('#666666')
          .font('Helvetica')
          .text(
            `This is a Computer Generated Commercial Quotation via Aspino ERP • Confidential • Page ${i + 1} of ${range.count}`,
            startX,
            808,
            { width: tableW, align: 'center', lineBreak: false },
          );
      }

      doc.end();
    });
  }
}
