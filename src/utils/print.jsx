import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

/*
 * In-page printing that works on Android.
 *
 * The document is rendered into #print-root (hidden on screen), and a
 * `body.is-printing` class makes print media show only that element — see
 * the "Printing" rules in src/index.css. No popup window is involved, which is
 * what broke printing on Android Chrome: popups get blocked, and closing one
 * right after print() tears it down before the print dialog ever renders.
 *
 * Mobile print dialogs are also non-blocking (print() returns immediately and
 * the page is laid out later, possibly again when the paper size changes), so
 * the document is left in place until the user is actually back on the page.
 */

export const PRINT_FORMATS = [
  { value: "a4", label: "A4", width: null },
  { value: "80mm", label: "إيصال 80 مم", width: 80 },
  { value: "58mm", label: "إيصال 58 مم", width: 58 },
];

const PX_PER_MM = 96 / 25.4;

let root = null;
let pending = null;

function printRoot() {
  let el = document.getElementById("print-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "print-root";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

function clearPrintRoot() {
  if (root) {
    root.unmount();
    root = null;
  }
  printRoot().replaceChildren();
}

// Receipt rolls get their page height measured from the rendered document so
// the whole receipt comes out as one continuous strip instead of A4 pages.
function pageRule(format, el) {
  const preset = PRINT_FORMATS.find((f) => f.value === format);
  if (!preset?.width) return "@page { size: A4; margin: 12mm; }";
  el.classList.add("is-measuring");
  el.style.width = `${preset.width}mm`;
  const heightMm = Math.ceil(el.scrollHeight / PX_PER_MM) + 8;
  el.classList.remove("is-measuring");
  el.style.width = "";
  return `@page { size: ${preset.width}mm ${Math.max(heightMm, 60)}mm; margin: 3mm 2mm; }`;
}

function addStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
}

function finishPending() {
  if (!pending) return;
  const { cleanup } = pending;
  pending = null;
  cleanup();
}

function runPrint(title) {
  const previousTitle = document.title;
  if (title) document.title = title;
  document.body.classList.add("is-printing");

  const startedAt = performance.now();
  let wasHidden = false;
  let timer = null;

  function done() {
    clearTimeout(timer);
    timer = setTimeout(finishPending, 600);
  }
  // Android: the print dialog is a separate screen, so the page is hidden
  // while it's open and becomes visible again once the user is back.
  function onVisibility() {
    if (document.visibilityState === "hidden") wasHidden = true;
    else if (wasHidden) done();
  }
  // Desktop browsers fire afterprint when their (blocking or tab-modal) dialog
  // closes. Android fires it right away, before layout — so ignore early ones.
  function onAfterPrint() {
    if (performance.now() - startedAt > 1500) done();
  }

  pending = {
    cleanup() {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("is-printing");
      document.title = previousTitle;
      clearPrintRoot();
    },
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("afterprint", onAfterPrint);
  window.print();
  if (performance.now() - startedAt > 1500) done();
}

/**
 * Prints a React element. It renders into its own root, outside the app's
 * providers — so it must not rely on context (router, data); pass props.
 */
export function printElement(element, { title, format = "a4" } = {}) {
  finishPending();
  clearPrintRoot();
  const el = printRoot();
  const host = document.createElement("div");
  el.appendChild(host);
  root = createRoot(host);
  flushSync(() => root.render(element));
  addStyle(el, `@media print { ${pageRule(format, el)} }`);
  runPrint(title);
}

/**
 * Prints a pre-rendered HTML string with its own stylesheet. The stylesheet is
 * wrapped in `@media print`, so global selectors inside it (`*`, `html`, `body`)
 * can never affect the app on screen.
 */
export function printHtml({ title, html, css = "" }) {
  finishPending();
  clearPrintRoot();
  const el = printRoot();
  addStyle(el, `@media print { ${css} }`);
  const host = document.createElement("div");
  host.innerHTML = html;
  el.appendChild(host);
  runPrint(title);
}
