const fs = require('fs');

function generatePdf(title, text) {
  const content = `BT\n/F1 24 Tf\n50 700 Td\n(${title}) Tj\n/F1 14 Tf\n0 -30 Td\n(${text}) Tj\nET`;
  const streamLen = Buffer.byteLength(content);
  
  let pdf = `%PDF-1.4\n`;
  const offsets = [];
  
  offsets.push(pdf.length);
  pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  
  offsets.push(pdf.length);
  pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  
  offsets.push(pdf.length);
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  
  offsets.push(pdf.length);
  pdf += `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`;
  
  offsets.push(pdf.length);
  pdf += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  
  const xrefOffset = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const o of offsets) {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  
  return Buffer.from(pdf, 'utf-8');
}

fs.writeFileSync('scripts/test-sample-1.pdf', generatePdf('Acadex Document 1', 'Testing Adobe PDF Embed API Dark and Light Themes'));
fs.writeFileSync('scripts/test-sample-2.pdf', generatePdf('Acadex Document 2', 'Testing Second Document Navigation and Theme Consistency'));
console.log('Generated test PDFs successfully.');
