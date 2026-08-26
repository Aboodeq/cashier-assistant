/**
 * Opens a new browser window, injects a self-contained printable report (its own
 * markup + stylesheet — it can't reach the app's stylesheets since it's a separate
 * document), and returns the window so the caller can trigger `.print()` once the
 * browser has laid it out.
 */
export function openPrintWindow({ title, bodyHtml }) {
  const w = window.open("", "_blank");
  if (!w) return null;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
    <style>${PRINT_STYLES}</style>
  </head><body>${bodyHtml}</body></html>`);
  w.document.close();
  return w;
}

const PRINT_STYLES = `
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;background:#fff;color:#2c3e50;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm 11mm 15mm;background:#fff;}
  .pr-title{text-align:center;font-size:27px;font-weight:900;line-height:1.3;color:#2c3e50;margin:0 0 8px;}
  .pr-date{text-align:center;direction:ltr;color:#666;font-size:16px;line-height:1.4;margin-bottom:36px;}
  .pr-summary-title{text-align:right;font-size:25px;font-weight:900;line-height:1.25;color:#2c3e50;margin:0 0 16px;}
  .pr-blue-line{height:2px;background:#3498db;margin-bottom:22px;}
  .pr-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:32px;}
  .pr-summary-card{min-height:103px;background:#f8f9fa;border:1px solid #e9edf2;border-right:5px solid #3498db;border-radius:6px;padding:18px 20px 17px;}
  .pr-summary-name{font-size:17px;font-weight:900;color:#2c3e50;line-height:1.35;margin-bottom:13px;}
  .pr-summary-line{font-size:15px;color:#000;line-height:1.55;}
  .pr-summary-line strong{font-weight:500;}
  .pr-summary-net{font-size:18px;font-weight:900;color:#2c3e50;margin-top:10px;line-height:1.45;}
  .pr-num{direction:ltr;unicode-bidi:isolate;display:inline-block;}
  .pr-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:0;}
  .pr-table th,.pr-table td{border:1px solid #ddd;text-align:center;vertical-align:middle;}
  .pr-table th{background:#f8f9fa;color:#000;font-size:14px;font-weight:800;padding:11px 8px;}
  .pr-table td{color:#000;font-size:13px;line-height:1.55;padding:9px 8px;}
  .pr-table tr{break-inside:avoid;page-break-inside:avoid;}
  .pr-col-index{width:34px;}
  .pr-col-name{width:17%;}
  .pr-col-date{width:14%;}
  .pr-col-type{width:15%;}
  .pr-col-amounts{width:32%;}
  .pr-col-notes{width:17%;}
  .pr-amounts{display:flex;flex-direction:column;align-items:center;gap:2px;}
  .pr-amount-line{display:flex;align-items:baseline;justify-content:center;gap:4px;direction:ltr;white-space:nowrap;}
  .pr-amount-unit{direction:rtl;}
  .pr-note{white-space:pre-wrap;word-break:break-word;}
  .pr-empty{border:1px solid #ddd;background:#fafafa;color:#666;text-align:center;padding:18px;margin-top:0;}
  .pr-footer{border-top:1px solid #e5e7eb;margin-top:34px;padding-top:18px;text-align:center;color:#666;font-size:12px;}
  .pr-footer strong{font-size:13px;font-weight:900;color:#3498db;}

  @media print{
    @page{size:A4;margin:0;}
    .page{width:210mm;min-height:297mm;padding:10mm 11mm 15mm;}
  }
`;
