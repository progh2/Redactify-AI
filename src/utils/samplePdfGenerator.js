/**
 * Sample PDF Generator
 * Generates a realistic multi-page test PDF with Korean PII and repeated page patterns.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to draw text box
  const drawField = (page, label, value, x, y, isRedactable = true) => {
    page.drawText(`${label}:`, { x, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: x + 80, y, size: 10, font, color: rgb(0, 0, 0) });
  };

  // Page 1 & 3: Repeat Pattern A (Personal Consent Form)
  [1, 3].forEach((pageNo) => {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Header
    page.drawRectangle({ x: 40, y: height - 60, width: width - 80, height: 40, color: rgb(0.9, 0.94, 0.98) });
    page.drawText(`[Form Type A] Personal Information Consent Form (Page ${pageNo})`, {
      x: 50,
      y: height - 45,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.3, 0.6),
    });

    // Form Box
    page.drawRectangle({ x: 40, y: height - 320, width: width - 80, height: 240, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });

    drawField(page, 'Name', pageNo === 1 ? 'Hong Gil-Dong' : 'Lee Young-Hee', 60, height - 110);
    drawField(page, 'Resident ID', pageNo === 1 ? '900101-1234567' : '850505-2345678', 60, height - 140);
    drawField(page, 'Mobile Phone', pageNo === 1 ? '010-1234-5678' : '010-9876-5432', 60, height - 170);
    drawField(page, 'Email Address', pageNo === 1 ? 'hong.gildong@example.com' : 'lee.yh@example.org', 60, height - 200);
    drawField(page, 'Bank Account', pageNo === 1 ? '110-123-456789' : '3333-01-987654', 60, height - 230);
    drawField(page, 'Home Address', pageNo === 1 ? '123 Teheran-ro, Gangnam-gu, Seoul' : '456 Centum-ro, Haeundae-gu, Busan', 60, height - 260);

    // Footer
    page.drawText('Confidential Document - PII Redaction Required', { x: 60, y: 40, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  });

  // Page 2 & 4: Repeat Pattern B (Corporate Application Form)
  [2, 4].forEach((pageNo) => {
    const page = pdfDoc.insertPage(pageNo - 1, [595.28, 841.89]);
    const { width, height } = page.getSize();

    // Header
    page.drawRectangle({ x: 40, y: height - 60, width: width - 80, height: 40, color: rgb(0.95, 0.92, 0.98) });
    page.drawText(`[Form Type B] Corporate Business Application (Page ${pageNo})`, {
      x: 50,
      y: height - 45,
      size: 13,
      font: fontBold,
      color: rgb(0.4, 0.1, 0.6),
    });

    // Form Box
    page.drawRectangle({ x: 40, y: height - 320, width: width - 80, height: 240, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });

    drawField(page, 'Company Reg No', pageNo === 2 ? '123-45-67890' : '987-65-43210', 60, height - 110);
    drawField(page, 'CEO Name', pageNo === 2 ? 'Kim Cheol-Su' : 'Park Min-Su', 60, height - 140);
    drawField(page, 'Passport No', pageNo === 2 ? 'M12345678' : 'M98765432', 60, height - 170);
    drawField(page, 'Office Tel', pageNo === 2 ? '02-987-6543' : '051-456-7890', 60, height - 200);
    drawField(page, 'Corporate Account', pageNo === 2 ? '010-999-888877' : '100-222-333344', 60, height - 230);
    drawField(page, 'Driver License', pageNo === 2 ? '11-01-123456-78' : '12-02-876543-21', 60, height - 260);

    // Footer
    page.drawText('Confidential Document - PII Redaction Required', { x: 60, y: 40, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
