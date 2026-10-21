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

function formatDate(dateVal: any): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

@Injectable()
export class PurchaseOrderPdfService {
  private readonly logger = new Logger(PurchaseOrderPdfService.name);

  async generatePurchaseOrderPdfBuffer(po: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Standard A4: 595.28 x 841.89 pt
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 22, bottom: 22, left: 25, right: 25 },
        bufferPages: true,
        info: {
          Title: `PurchaseOrder_${po.poNumber}`,
          Author: 'Aspino Pharma & Healthcare ERP',
          Subject: 'Official Purchase Order',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isProcurement = po.type === 'PROCUREMENT';
      const currency = po.currency || 'INR';

      // Dimensions
      const startX = 25;
      const startY = 22;
      const tableW = 545.28;
      const splitX = startX + 300; // Left: 300pt, Right: 245.28pt

      // Section heights
      const titleH = 24;
      const row1H = 96;  // Company info (Left) + PO Meta (Right)
      const row2H = 90;  // Vendor/Customer info (Left) + Shipping/Delivery (Right)
      const thH = 24;    // Item Table Header
      const subRowH = 22;
      const finH = 114;  // Financials + In words + Bank info
      const termsH = 100; // Terms + Signature

      const totalBottomSectionsH = subRowH + finH + termsH;
      const fixedTopH = titleH + row1H + row2H + thH;
      const targetTableBottom = 780;
      const itemsTableBodyH = targetTableBottom - (startY + fixedTopH + totalBottomSectionsH);

      const items = Array.isArray(po.items) ? po.items : [];
      let actualItemsH = 0;
      items.forEach((item) => {
        const hasSub = !!(item.itemCode || item.description || item.product?.productCode);
        actualItemsH += hasSub ? 32 : 24;
      });

      const bodyH = Math.max(actualItemsH, itemsTableBodyH);
      const totalFrameH = fixedTopH + bodyH + totalBottomSectionsH;

      // 0. TOP TITLE BANNER
      doc.rect(startX, startY, tableW, titleH).fill('#0f172a');
      doc.rect(startX, startY, tableW, titleH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .fillColor('#ffffff')
        .fontSize(11.5)
        .font('Helvetica-Bold')
        .text(
          isProcurement ? 'OFFICIAL PURCHASE ORDER (PROCUREMENT)' : 'COMMERCIAL PURCHASE ORDER (SALES)',
          startX,
          startY + 6.5,
          { width: tableW, align: 'center' }
        );

      // 1. HEADER ROW (Company on left, PO Meta on right)
      const row1Y = startY + titleH;
      const leftCellW = splitX - startX;
      const rightCellW = tableW - leftCellW;

      doc.rect(startX, row1Y, tableW, row1H).strokeColor('#000000').lineWidth(0.8).stroke();
      doc.moveTo(splitX, row1Y).lineTo(splitX, row1Y + row1H).strokeColor('#000000').lineWidth(0.8).stroke();

      // Aspino Header (Left)
      doc
        .fillColor('#000000')
        .fontSize(13.5)
        .font('Helvetica-Bold')
        .text('ASPINO PHARMA & HEALTHCARE', startX + 9, row1Y + 7, { width: leftCellW - 18 });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#222222')
        .text('Plot 45-48, Pharma City Industrial Zone, Hyderabad - 500001, India', startX + 9, row1Y + 25, { width: leftCellW - 18 })
        .text('Email: procurement@aspinochemicals.com   |   Ph: +91 (040) 2456-7890', startX + 9, row1Y + 37, { width: leftCellW - 18 })
        .text('Web: www.aspinopharma.com   |   CIN: U24239TG2020PTC145678', startX + 9, row1Y + 49, { width: leftCellW - 18 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('GSTIN: 36AABCU9603R1ZM   |   PAN: AABCU9603R', startX + 9, row1Y + 65, { width: leftCellW - 18 });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#444444')
        .text('Drug Lic: TS/HYD/2021/4891, TS/HYD/2021/4892 • WHO-GMP Certified', startX + 9, row1Y + 79, { width: leftCellW - 18 });

      // PO Metadata (Right cell)
      const rMetaX = splitX + 9;
      const rValX = splitX + 115;
      const rWidth = rightCellW - 18;

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('PO NUMBER:', rMetaX, row1Y + 7)
        .fillColor('#0284c7')
        .text(po.poNumber || 'PO-2026-0001', rValX, row1Y + 7, { width: rWidth - 110 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('PO DATE:', rMetaX, row1Y + 22)
        .font('Helvetica')
        .fillColor('#000000')
        .text(formatDate(po.poDate), rValX, row1Y + 22);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('EXP. DELIVERY:', rMetaX, row1Y + 36)
        .font('Helvetica')
        .fillColor('#000000')
        .text(formatDate(po.expectedDeliveryDate), rValX, row1Y + 36);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('REFERENCE / RFQ:', rMetaX, row1Y + 50)
        .font('Helvetica')
        .fillColor('#000000')
        .text(po.referenceNumber || (po.quotation?.quotationNumber ? `Ref: ${po.quotation.quotationNumber}` : '-'), rValX, row1Y + 50, { width: rWidth - 110 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('ORDER STATUS:', rMetaX, row1Y + 64)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text(po.status || 'DRAFT', rValX, row1Y + 64);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('ORDER TYPE:', rMetaX, row1Y + 78)
        .font('Helvetica')
        .fillColor('#000000')
        .text(po.type || 'PROCUREMENT', rValX, row1Y + 78);

      // 2. ROW 2: PARTY DETAILS (VENDOR / SUPPLIER / CUSTOMER) on Left, SHIPPING / BILLING on Right
      const row2Y = row1Y + row1H;
      doc.rect(startX, row2Y, tableW, row2H).strokeColor('#000000').lineWidth(0.8).stroke();
      doc.moveTo(splitX, row2Y).lineTo(splitX, row2Y + row2H).strokeColor('#000000').lineWidth(0.8).stroke();

      // Left Box: Supplier / Vendor / Customer
      const partyLabel = isProcurement ? 'ISSUED TO (SUPPLIER / VENDOR):' : 'BILL TO (CUSTOMER):';
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#555555')
        .text(partyLabel, startX + 9, row2Y + 6);

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#000000')
        .text(po.partyName || 'M/s. Partner Organization', startX + 9, row2Y + 18, { width: leftCellW - 18 });

      const partyAddr = po.partyAddress || po.supplier?.address || po.vendor?.address || po.customer?.billingAddress || 'Address on record';
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#222222')
        .text(partyAddr, startX + 9, row2Y + 31, { width: leftCellW - 18, height: 28, ellipsis: true });

      const partyGst = po.partyGstNo || po.supplier?.gstNo || po.customer?.gstNo || '-';
      const partyPhone = po.partyPhone || po.supplier?.phone || po.customer?.phone || '-';
      const partyEmail = po.partyEmail || po.supplier?.email || po.customer?.email || '-';

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#000000')
        .text(`GSTIN: ${partyGst}`, startX + 9, row2Y + 62)
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#444444')
        .text(`Ph: ${partyPhone}   |   Email: ${partyEmail}`, startX + 9, row2Y + 74, { width: leftCellW - 18, ellipsis: true });

      // Right Box: Delivery & Dispatch Destination
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#555555')
        .text('DELIVERY & SHIP-TO DESTINATION:', splitX + 9, row2Y + 6);

      const shipAddr = po.shippingAddress || (isProcurement ? 'Aspino Pharma Central Warehouse, Plot 45-48 Pharma City, Hyderabad' : (po.customer?.shippingAddress || 'Customer Warehouse'));
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text(isProcurement ? 'Aspino Pharma & Healthcare Central Receiving Store' : (po.partyName || 'Customer Delivery Site'), splitX + 9, row2Y + 18, { width: rightCellW - 18 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#222222')
        .text(shipAddr, splitX + 9, row2Y + 31, { width: rightCellW - 18, height: 28, ellipsis: true });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('DELIVERY TERMS:', splitX + 9, row2Y + 62)
        .font('Helvetica')
        .fillColor('#000000')
        .text(po.deliveryTerms || 'Door Delivery / F.O.R Destination', splitX + 95, row2Y + 62, { width: rightCellW - 105 });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333')
        .text('PAYMENT TERMS:', splitX + 9, row2Y + 74)
        .font('Helvetica')
        .fillColor('#000000')
        .text(po.paymentTerms || '30 Days Net from GRN / Invoice', splitX + 95, row2Y + 74, { width: rightCellW - 105 });

      // 3. TABLE HEADER
      const thY = row2Y + row2H;
      // Columns:
      // S.No: 30pt
      // Item Description: 215.28pt
      // HSN/SAC: 60pt
      // Qty: 50pt
      // UOM: 45pt
      // Rate: 65pt
      // Total: 80pt
      const colX = {
        sno: startX,
        desc: startX + 30,
        hsn: startX + 30 + 215.28,
        qty: startX + 30 + 215.28 + 60,
        uom: startX + 30 + 215.28 + 60 + 50,
        rate: startX + 30 + 215.28 + 60 + 50 + 45,
        total: startX + 30 + 215.28 + 60 + 50 + 45 + 65,
      };

      doc.rect(startX, thY, tableW, thH).fill('#e2e8f0');
      doc.rect(startX, thY, tableW, thH).strokeColor('#000000').lineWidth(0.8).stroke();

      // Column divider lines in header
      Object.values(colX).forEach((x) => {
        if (x > startX) {
          doc.moveTo(x, thY).lineTo(x, thY + thH).strokeColor('#000000').lineWidth(0.6).stroke();
        }
      });

      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
      doc.text('#', colX.sno, thY + 7, { width: 30, align: 'center' });
      doc.text('ITEM NAME & SPECIFICATIONS', colX.desc + 6, thY + 7, { width: 205, align: 'left' });
      doc.text('HSN / SAC', colX.hsn, thY + 7, { width: 60, align: 'center' });
      doc.text('QTY', colX.qty, thY + 7, { width: 50, align: 'center' });
      doc.text('UOM', colX.uom, thY + 7, { width: 45, align: 'center' });
      doc.text(`RATE (${currency})`, colX.rate, thY + 7, { width: 60, align: 'right' });
      doc.text(`AMOUNT (${currency})`, colX.total, thY + 7, { width: 74, align: 'right' });

      // 4. TABLE BODY (ITEMS)
      const bodyY = thY + thH;
      let currY = bodyY;

      items.forEach((item, idx) => {
        const itemCode = item.itemCode || item.product?.productCode || '';
        const description = item.description || item.product?.shelfLife || '';
        const hasSub = !!(itemCode || description);
        const rowH = hasSub ? 32 : 24;

        // Alternating faint row tint
        if (idx % 2 === 1) {
          doc.rect(startX, currY, tableW, rowH).fill('#f8fafc');
        }

        // Horizontal bottom line of each item
        doc.moveTo(startX, currY + rowH).lineTo(startX + tableW, currY + rowH).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

        // Row Content
        doc.fillColor('#000000').font('Helvetica').fontSize(8.5);
        doc.text(String(idx + 1), colX.sno, currY + 6, { width: 30, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(8.5).text(item.itemName || 'Product Item', colX.desc + 6, currY + 5, { width: 205, height: 12, ellipsis: true });

        if (hasSub) {
          const subText = [itemCode ? `Code: ${itemCode}` : '', description ? description : ''].filter(Boolean).join(' • ');
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(subText, colX.desc + 6, currY + 18, { width: 205, height: 10, ellipsis: true });
        }

        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        doc.text(item.hsnCode || item.product?.hsnCode || '-', colX.hsn, currY + 6, { width: 60, align: 'center' });
        doc.text(formatINR(item.quantity), colX.qty, currY + 6, { width: 50, align: 'center' });
        doc.text(item.uom || item.product?.uom || 'Units', colX.uom, currY + 6, { width: 45, align: 'center' });
        doc.text(formatINR(item.unitPrice), colX.rate, currY + 6, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text(formatINR(item.totalPrice), colX.total, currY + 6, { width: 74, align: 'right' });

        currY += rowH;
      });

      // Draw vertical column separators through full body height
      Object.values(colX).forEach((x) => {
        if (x > startX) {
          doc.moveTo(x, bodyY).lineTo(x, bodyY + bodyH).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
        }
      });

      // Bottom border of item grid
      doc.moveTo(startX, bodyY + bodyH).lineTo(startX + tableW, bodyY + bodyH).strokeColor('#000000').lineWidth(0.8).stroke();

      // 5. SUBTOTAL ROW
      const subY = bodyY + bodyH;
      doc.rect(startX, subY, tableW, subRowH).fill('#f1f5f9');
      doc.rect(startX, subY, tableW, subRowH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('TAXABLE SUB-TOTAL:', startX + 9, subY + 6, { width: colX.total - startX - 18, align: 'right' })
        .text(`${currency} ${formatINR(po.subTotal)}`, colX.total, subY + 6, { width: 74, align: 'right' });

      // 6. FINANCIALS & BANK/WORDS BLOCK
      const finY = subY + subRowH;
      doc.rect(startX, finY, tableW, finH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc.moveTo(splitX, finY).lineTo(splitX, finY + finH).strokeColor('#000000').lineWidth(0.8).stroke();

      // Left of Financials: Amount in words + Company Bank Account for remittance
      const leftInnerW = leftCellW - 18;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#475569')
        .text('TOTAL AMOUNT IN WORDS:', startX + 9, finY + 6);

      const wordsStr = numberToWords(po.totalAmount);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#0f172a')
        .text(wordsStr, startX + 9, finY + 17, { width: leftInnerW });

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#475569')
        .text('BANK & REMITTANCE DETAILS (ASPINO COMMERCIAL):', startX + 9, finY + 44);

      doc
        .font('Helvetica')
        .fontSize(7.8)
        .fillColor('#1e293b')
        .text('Bank: HDFC Bank Ltd   |   Branch: Banjara Hills, Hyderabad', startX + 9, finY + 56)
        .text('A/C Name: Aspino Pharma & Healthcare Private Limited', startX + 9, finY + 67)
        .text('A/C Number: 50200058492019   |   IFSC Code: HDFC0001234', startX + 9, finY + 78)
        .text('LUT / Bond Ref: ARN-AD360224009182C (Eligible for Zero-rated Supplies)', startX + 9, finY + 89);

      // Right of Financials: Breakdown Summary
      const rFinLabelX = splitX + 9;
      const rFinValX = splitX + 130;
      const rFinW = rightCellW - 139;

      let lineY = finY + 6;
      const lineStep = 15;

      const printSummaryLine = (label: string, value: string, isBold = false, isAccent = false) => {
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8)
          .fillColor(isAccent ? '#0f172a' : '#475569')
          .text(label, rFinLabelX, lineY);

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8)
          .fillColor(isAccent ? '#0284c7' : '#000000')
          .text(value, rFinValX, lineY, { width: rFinW, align: 'right' });

        lineY += lineStep;
      };

      printSummaryLine('Sub-Total:', `${currency} ${formatINR(po.subTotal)}`);

      if (po.discountAmount > 0 || po.discountPercentage > 0) {
        printSummaryLine(`Discount (${po.discountPercentage || 0}%):`, `- ${currency} ${formatINR(po.discountAmount)}`);
      }

      printSummaryLine(`Tax (${po.taxType || 'GST'} ${po.taxPercentage || 0}%):`, `+ ${currency} ${formatINR(po.taxAmount)}`);

      if (po.shippingCharges > 0) {
        printSummaryLine('Freight / Shipping:', `+ ${currency} ${formatINR(po.shippingCharges)}`);
      }

      if (po.otherCharges > 0) {
        printSummaryLine('Other Handling:', `+ ${currency} ${formatINR(po.otherCharges)}`);
      }

      // Grand Total Box
      const gtBoxY = finY + finH - 25;
      doc.rect(splitX, gtBoxY, rightCellW, 25).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#ffffff')
        .text('GRAND TOTAL:', splitX + 9, gtBoxY + 7)
        .text(`${currency} ${formatINR(po.totalAmount)}`, splitX + 100, gtBoxY + 7, { width: rightCellW - 109, align: 'right' });

      // 7. TERMS & SIGNATURE BLOCK
      const termsTop = finY + finH;
      doc.rect(startX, termsTop, tableW, termsH).strokeColor('#000000').lineWidth(0.8).stroke();
      doc.moveTo(splitX, termsTop).lineTo(splitX, termsTop + termsH).strokeColor('#000000').lineWidth(0.8).stroke();

      // Left: Terms
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#475569')
        .text('PURCHASE ORDER TERMS & QUALITY CONDITIONS:', startX + 9, termsTop + 6);

      const standardTerms = po.termsAndConditions || (isProcurement
        ? '1. Certificate of Analysis (COA) must accompany each batch dispatch.\n2. Goods must strictly match approved QC standards and Pharmacopoeial specs.\n3. Defective or non-compliant lots will be rejected at supplier cost.\n4. Disputes subject exclusively to Hyderabad judicial jurisdiction.'
        : '1. Standard warranty and quality certificates provided upon shipment.\n2. Deliveries subject to agreed lead times and commercial payment terms.\n3. Title transfers upon delivery at destination.');

      doc
        .font('Helvetica')
        .fontSize(7.2)
        .fillColor('#334155')
        .text(standardTerms, startX + 9, termsTop + 18, { width: leftInnerW, height: 75, ellipsis: true });

      // Right: Authorized Signatory
      const rightInnerW = rightCellW - 18;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#000000')
        .text('FOR ASPINO PHARMA & HEALTHCARE:', splitX + 9, termsTop + 6, { width: rightInnerW, align: 'center' });

      doc
        .rect(splitX + 25, termsTop + 66, rightInnerW - 34, 0.8)
        .strokeColor('#000000')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#333333')
        .text(isProcurement ? 'Authorized Procurement Signatory' : 'Authorized Commercial Signatory', splitX + 9, termsTop + 74, { width: rightInnerW, align: 'center' });

      // Outer border enclosing everything
      doc.rect(startX, startY, tableW, totalFrameH).strokeColor('#000000').lineWidth(1.2).stroke();

      // Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        doc
          .fontSize(7.5)
          .fillColor('#64748b')
          .font('Helvetica')
          .text(
            `This is an Official Computer Generated Purchase Order via Aspino ERP • Confidential • Page ${i + 1} of ${range.count}`,
            startX,
            810,
            { width: tableW, align: 'center', lineBreak: false }
          );
      }

      doc.end();
    });
  }
}
