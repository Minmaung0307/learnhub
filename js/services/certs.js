// services/certs.js
export function renderCertificatePNG({name, courseTitle, dateText, certId, logoUrl}){
  const W=1200,H=850;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#1f2937'; ctx.lineWidth=6; ctx.strokeRect(20,20,W-40,H-40);
  ctx.fillStyle='#111827'; ctx.font='bold 42px Georgia,serif'; ctx.textAlign='center';
  ctx.fillText('Certificate of Completion', W/2, 120);
  ctx.font='24px Inter'; ctx.fillStyle='#374151'; ctx.fillText('This certifies that', W/2, 200);
  ctx.font='bold 36px Georgia,serif'; ctx.fillStyle='#111827'; ctx.fillText(name||'Student', W/2, 250);
  ctx.font='24px Inter'; ctx.fillStyle='#374151'; ctx.fillText('has successfully completed the course', W/2, 300);
  ctx.font='bold 28px Inter'; ctx.fillStyle='#111827'; ctx.fillText(courseTitle||'Course', W/2, 340);
  ctx.font='20px Inter'; ctx.fillStyle='#374151'; ctx.fillText('Date: '+(dateText||new Date().toLocaleDateString()), W/2, 390);
  ctx.fillText('Certificate ID: '+(certId||'LH-XXXX-XXXX'), W/2, 420);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='certificate.png'; a.click();
}
