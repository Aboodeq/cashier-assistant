/**
 * Opens a new browser window, injects a self-contained printable document (its own
 * markup + stylesheet — it can't reach the app's stylesheets since it's a separate
 * document), and returns the window so the caller can trigger `.print()` once the
 * browser has laid it out. Purely a generic "open + print this HTML" mechanism —
 * every feature supplies its own `bodyHtml` and `styles`.
 */
export function openPrintWindow({ title, bodyHtml, styles }) {
  const w = window.open("", "_blank");
  if (!w) return null;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
    <style>${styles}</style>
  </head><body>${bodyHtml}</body></html>`);
  w.document.close();
  return w;
}
