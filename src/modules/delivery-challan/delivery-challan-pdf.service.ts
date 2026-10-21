import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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
export class DeliveryChallanPdfService {
  private readonly logger = new Logger(DeliveryChallanPdfService.name);

  async generatePdfBuffer(challan: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 25, right: 25 },
        bufferPages: true,
        info: {
          Title: `${challan.challanNumber || 'Delivery_Challan'}_Document`,
          Author: 'Aspino Pharma & Healthcare ERP',
          Subject: 'Delivery Challan (Rule 55 CGST Rules)',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const curSym = challan.currency === 'USD' ? '$' : challan.currency === 'EUR' ? '€' : 'INR';

      // Page Geometry
      const startX = 25;
      let curY = 20;
      const tableW = 545.28;
      const splitX = startX + 310;

      const strokeBorder = (x: number, y: number, w: number, h: number) => {
        doc.rect(x, y, w, h).lineWidth(0.75).strokeColor('#334155').stroke();
      };

      // Header Banner
      doc.rect(startX, curY, tableW, 26).fill('#1e3a8a');
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#ffffff')
        .text('DELIVERY CHALLAN (RULE 55 OF CGST RULES, 2017)', startX, curY + 7, {
          width: tableW,
          align: 'center',
        });
      curY += 26;

      // Section 1: Company Header
      const headerH = 75;
      strokeBorder(startX, curY, tableW, headerH);

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#1e3a8a')
        .text('ASPINO PHARMACEUTICALS PVT. LTD.', startX + 10, curY + 8);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(
          'Plot No. 42-45, Phase-III, IDA Pashamylaram, Patancheru, Sangareddy Dist.\nTelangana - 502307, India | Regd. Office: Hyderabad\nGSTIN: 36AABCA1234F1Z5 | PAN: AABCA1234F | State: Telangana (Code: 36)\nPhone: +91 40 2345 6789 | Email: dispatch@aspinopharma.com | Web: www.aspinopharma.com',
          startX + 10,
          curY + 26,
          { width: 340, lineGap: 2 },
        );

      // Challan Meta Details Box on the Right
      doc.rect(splitX, curY, tableW - 310, headerH).fill('#f8fafc');
      strokeBorder(splitX, curY, tableW - 310, headerH);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0f172a')
        .text(`Challan No: ${challan.challanNumber}`, splitX + 8, curY + 8)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text(
          `Date: ${
            challan.challanDate
              ? new Date(challan.challanDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'
          }`,
          splitX + 8,
          curY + 22,
        )
        .text(
          `Type of Supply: ${String(challan.challanType || 'SUPPLY').replace(/_/g, ' ')}`,
          splitX + 8,
          curY + 36,
        )
        .text(
          `Status: ${challan.status || 'DRAFT'}`,
          splitX + 8,
          curY + 50,
        )
        .text(
          `Invoice Ref: ${challan.invoiceNumber || 'N/A (Without Invoice)'}`,
          splitX + 8,
          curY + 62,
        );

      curY += headerH;

      // Section 2: Consignee / Recipient & Transport Details
      const partyH = 95;
      strokeBorder(startX, curY, 310, partyH);
      strokeBorder(splitX, curY, tableW - 310, partyH);

      // Recipient Header
      doc.rect(startX, curY, 310, 16).fill('#f1f5f9');
      strokeBorder(startX, curY, 310, 16);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#1e293b')
        .text('CONSIGNEE / RECIPIENT DETAILS', startX + 8, curY + 4);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0f172a')
        .text(challan.partyName || 'Customer / Consignee', startX + 8, curY + 22)
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text(
          `${challan.shippingAddress || challan.partyAddress || 'Address on file'}\nGSTIN: ${
            challan.partyGstNo || 'Unregistered'
          } | PAN: ${challan.partyPanNo || '-'}\nPhone: ${
            challan.partyPhone || '-'
          } | Email: ${challan.partyEmail || '-'}\nPlace of Supply: ${
            challan.placeOfSupply || 'Telangana (36)'
          }`,
          startX + 8,
          curY + 36,
          { width: 295, lineGap: 2 },
        );

      // Transport / Dispatch Box
      doc.rect(splitX, curY, tableW - 310, 16).fill('#f1f5f9');
      strokeBorder(splitX, curY, tableW - 310, 16);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#1e293b')
        .text('TRANSPORT & DISPATCH DETAILS', splitX + 8, curY + 4);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text(`Mode of Transport: ${challan.transportMode || 'Road'}`, splitX + 8, curY + 22)
        .text(`Vehicle No: ${challan.vehicleNumber || '-'}`, splitX + 8, curY + 36)
        .text(`Transporter: ${challan.transporterName || '-'}`, splitX + 8, curY + 50)
        .text(`LR / RR No: ${challan.lrNumber || '-'}`, splitX + 8, curY + 64)
        .text(`E-Way Bill No: ${challan.eWayBillNumber || '-'}`, splitX + 8, curY + 78);

      curY += partyH;

      // Section 3: Items Table
 
        // =====================================================
        // Section 3: Items Table - FIXED
        // =====================================================

        const colW = {
          sno: 25,
          item: 190,
          hsn: 55,
          uom: 45,
          qty: 65,
          rate: 60,
          tax: 45,
          total: tableW - 485,
        };

        const colX = {
          sno: startX,
          item: startX + colW.sno,
          hsn: startX + colW.sno + colW.item,
          uom: startX + colW.sno + colW.item + colW.hsn,
          qty: startX + colW.sno + colW.item + colW.hsn + colW.uom,
          rate:
            startX +
            colW.sno +
            colW.item +
            colW.hsn +
            colW.uom +
            colW.qty,
          tax:
            startX +
            colW.sno +
            colW.item +
            colW.hsn +
            colW.uom +
            colW.qty +
            colW.rate,
          total: startX + tableW - colW.total,
        };

        const thH = 24;

        doc.rect(startX, curY, tableW, thH).fill('#1e3a8a');
        strokeBorder(startX, curY, tableW, thH);

        const headerY = curY + 7;

        const drawHeader = (
          text: string,
          x: number,
          width: number,
          align: 'left' | 'center' | 'right' = 'center',
        ) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#ffffff')
            .text(text, x + 2, headerY, {
              width: width - 4,
              align,
              lineBreak: false,
            });
        };

        drawHeader('#', colX.sno, colW.sno);
        drawHeader(
          'Item Description & Formulation',
          colX.item,
          colW.item,
          'left',
        );
        drawHeader('HSN/SAC', colX.hsn, colW.hsn);
        drawHeader('UOM', colX.uom, colW.uom);
        drawHeader('Qty Dispatched', colX.qty, colW.qty);
        drawHeader(`Rate (${curSym})`, colX.rate, colW.rate);
        drawHeader('GST %', colX.tax, colW.tax);
        drawHeader('Total Value', colX.total, colW.total);

        curY += thH;

        // =====================================================
        // Item Rows
        // =====================================================

        const items =
          challan.items && challan.items.length > 0
            ? challan.items
            : [];

        let rowIdx = 0;

        items.forEach((it: any) => {
          const itemH = 28;
          const rowY = curY;

          const bg =
            rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';

          doc.rect(startX, rowY, tableW, itemH).fill(bg);
          strokeBorder(startX, rowY, tableW, itemH);

          const qty = Number(it.quantity) || 0;
          const rate = Number(it.unitPrice) || 0;
          const disc = Number(it.discountPercent) || 0;
          const tax = Number(it.taxPercent) || 0;

          const base = qty * rate;

          const taxable = Math.max(
            0,
            base - (base * disc) / 100,
          );

          const lineTot =
            it.totalPrice !== undefined &&
            it.totalPrice !== null
              ? Number(it.totalPrice)
              : taxable + (taxable * tax) / 100;

          const rowTextY = rowY + 8;

          const drawCell = (
            value: string,
            x: number,
            width: number,
            align: 'left' | 'center' | 'right' = 'center',
            bold = false,
          ) => {
            doc
              .font(bold ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(7.5)
              .fillColor('#334155')
              .text(value, x + 3, rowTextY, {
                width: width - 6,
                align,
                lineBreak: false,
                ellipsis: true,
              });
          };

          drawCell(
            String(rowIdx + 1),
            colX.sno,
            colW.sno,
          );

          // Product name
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor('#0f172a')
            .text(
              it.itemName || 'Product',
              colX.item + 4,
              rowY + 4,
              {
                width: colW.item - 8,
                lineBreak: false,
                ellipsis: true,
              },
            );

          // Product code and batch
          const itemDetails = [
            it.itemCode ? `Code: ${it.itemCode}` : '',
            it.batchNumber
              ? `Batch: ${it.batchNumber}`
              : '',
          ]
            .filter(Boolean)
            .join(' | ');

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#64748b')
            .text(
              itemDetails,
              colX.item + 4,
              rowY + 16,
              {
                width: colW.item - 8,
                lineBreak: false,
                ellipsis: true,
              },
            );

          drawCell(
            String(it.hsnCode || '-'),
            colX.hsn,
            colW.hsn,
          );

          drawCell(
            String(it.uom || 'Nos'),
            colX.uom,
            colW.uom,
          );

          drawCell(
            String(qty),
            colX.qty,
            colW.qty,
            'right',
          );

          drawCell(
            formatINR(rate),
            colX.rate,
            colW.rate,
            'right',
          );

          drawCell(
            `${tax}%`,
            colX.tax,
            colW.tax,
          );

          // Fixed Total Value column
          drawCell(
            formatINR(lineTot),
            colX.total,
            colW.total,
            'right',
            true,
          );
          curY += itemH;
          rowIdx++;
        });


      // Section 4: Totals and Summary
      const summaryH = 80;
      strokeBorder(startX, curY, tableW, summaryH);

      // Left: Amount in Words & Notes
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1e293b')
        .text('Total Declared Value in Words:', startX + 10, curY + 8)
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#0f172a')
        .text(numberToWords(challan.totalAmount || 0), startX + 10, curY + 20, {
          width: 320,
        });

      if (challan.notes) {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#475569')
          .text('Remarks / Transport Instructions:', startX + 10, curY + 45)
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(challan.notes, startX + 10, curY + 56, { width: 320, ellipsis: true });
      }

      // Right: Financial Summary Box
      const rightX = splitX + 40;
      const rightValX = startX + tableW - 100;
      const rightValW = 90;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#475569')
        .text('Taxable Sub Total:', rightX, curY + 8)
        .text(formatINR(challan.subTotal || 0), rightValX, curY + 8, {
          width: rightValW,
          align: 'right',
        });

      if (Number(challan.cgstAmount) > 0) {
        doc
          .text('CGST:', rightX, curY + 22)
          .text(formatINR(challan.cgstAmount), rightValX, curY + 22, {
            width: rightValW,
            align: 'right',
          });
      }
      if (Number(challan.sgstAmount) > 0) {
        doc
          .text('SGST:', rightX, curY + 34)
          .text(formatINR(challan.sgstAmount), rightValX, curY + 34, {
            width: rightValW,
            align: 'right',
          });
      }
      if (Number(challan.igstAmount) > 0) {
        doc
          .text('IGST:', rightX, curY + 22)
          .text(formatINR(challan.igstAmount), rightValX, curY + 22, {
            width: rightValW,
            align: 'right',
          });
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#1e3a8a')
        .text('Total Consignment Value:', rightX, curY + 55)
        .text(`${curSym} ${formatINR(challan.totalAmount || 0)}`, rightValX, curY + 55, {
          width: rightValW,
          align: 'right',
        });

      curY += summaryH;

      // Section 5: Statutory Terms & Signatures
      const footerH = 85;
      strokeBorder(startX, curY, tableW, footerH);

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#334155')
        .text('Statutory Declaration & Terms (Under Rule 55):', startX + 10, curY + 6)
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#475569')
        .text(
          '1. Goods dispatched under this Delivery Challan are not for sale or pending tax invoice determination in accordance with Section 31(7) & Rule 55 of CGST Act, 2017.\n2. The transporter / carrier must carry a copy of this Delivery Challan and valid e-Way Bill during transit.\n3. Goods received in good condition and correct quantity.',
          startX + 10,
          curY + 18,
          { width: 340, lineGap: 1.5 },
        );

      // Signatures
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#475569')
        .text("Receiver's Signature & Seal", startX + 360, curY + 50, {
          width: 85,
          align: 'center',
        })
        .text('Authorized Signatory', startX + 460, curY + 50, {
          width: 80,
          align: 'center',
        })
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#1e3a8a')
        .text('For ASPINO PHARMACEUTICALS', startX + 440, curY + 62, {
          width: 100,
          align: 'center',
        });

      doc.end();
    });
  }
}
