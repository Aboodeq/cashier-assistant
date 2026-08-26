/**
 * Shared print stylesheet for every sales-module printable (invoice, client
 * statement, stock report, ...). Injected into a popup window that can't
 * reach the app's bundled CSS — see src/utils/printWindow.js. Keeping one
 * shared `.iv-*` class set means every printout from this module has the
 * same visual identity instead of each page inventing its own.
 */
export const SALES_PRINT_STYLES = `
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;background:#fff;color:#1e293b;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 15mm;background:#fff;}
  .iv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .iv-title{font-size:26px;font-weight:900;color:#1e293b;margin-bottom:6px;}
  .iv-ref{font-size:13px;color:#666;}
  .iv-head-date{text-align:left;font-size:13px;color:#444;line-height:1.9;}
  .iv-printed{color:#999;font-size:12px;}
  .iv-num{direction:ltr;unicode-bidi:isolate;display:inline-block;}
  .iv-line{height:2px;background:#4338ca;margin:16px 0 24px;}

  .iv-client-card{background:#f8f9fc;border:1px solid #e9e9f5;border-right:5px solid #4338ca;border-radius:6px;padding:16px 20px;margin-bottom:28px;}
  .iv-client-name{font-size:18px;font-weight:900;color:#1e293b;margin-bottom:8px;}
  .iv-client-meta{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:13px;color:#333;}
  .iv-client-meta strong{font-weight:700;color:#555;}

  .iv-section-title{font-size:15px;font-weight:900;color:#1e293b;margin:26px 0 10px;}
  .iv-section-title:first-of-type{margin-top:0;}

  .iv-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:22px;}
  .iv-table th,.iv-table td{border:1px solid #ddd;text-align:center;vertical-align:middle;}
  .iv-table th{background:#f8f9fa;color:#000;font-size:13px;font-weight:800;padding:10px 8px;}
  .iv-table td{color:#000;font-size:13px;line-height:1.5;padding:9px 8px;}
  .iv-table tr{break-inside:avoid;page-break-inside:avoid;}
  .iv-col-index{width:34px;}
  .iv-col-name{width:38%;}
  .iv-col-qty{width:16%;}
  .iv-col-price{width:20%;}
  .iv-col-total{width:22%;}
  .iv-col-date{width:18%;}
  .iv-col-type{width:18%;}
  .iv-col-currency{width:16%;}
  .iv-col-amount{width:20%;}
  .iv-col-notes{width:24%;}
  .iv-col-status{width:16%;}
  .iv-empty{border:1px solid #ddd;background:#fafafa;color:#666;text-align:center;padding:18px;margin-bottom:22px;}

  .iv-summary{margin-right:auto;width:60%;min-width:260px;}
  .iv-summary-row{display:flex;align-items:center;justify-content:space-between;padding:8px 4px;font-size:14px;color:#333;}
  .iv-summary-row--total{border-top:2px solid #1e293b;margin-top:4px;padding-top:12px;font-size:19px;font-weight:900;color:#1e293b;}
  .iv-pay-tag{font-size:12px;font-weight:800;padding:3px 12px;border-radius:99px;}
  .iv-pay-tag--cash{background:#dcfce7;color:#166534;}
  .iv-pay-tag--credit{background:#fef3c7;color:#92400e;}

  .iv-status-badge{font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;}
  .iv-status-badge--ok{background:#dcfce7;color:#166534;}
  .iv-status-badge--low{background:#fee2e2;color:#991b1b;}

  .iv-notes{margin-top:20px;padding:12px 16px;background:#fafafa;border:1px solid #eee;border-radius:6px;font-size:13px;color:#444;white-space:pre-wrap;word-break:break-word;}

  .iv-footer{border-top:1px solid #e5e7eb;margin-top:36px;padding-top:16px;display:flex;align-items:center;justify-content:space-between;color:#666;font-size:12px;}
  .iv-footer strong{font-size:13px;font-weight:900;color:#4338ca;}
  .iv-thanks{font-weight:700;color:#4338ca;}

  @media print{
    @page{size:A4;margin:0;}
    .page{width:210mm;min-height:297mm;padding:14mm 15mm;}
  }
`;
