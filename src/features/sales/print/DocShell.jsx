import { formatDateTime } from "../domain/dates";
import "./docs.css";

export const Num = ({ children }) => <span className="doc-num">{children}</span>;

/**
 * Shared frame for every printed document: business letterhead, document
 * title/number, then the body, signatures and footer.
 */
export default function DocShell({
  settings = {},
  title,
  number,
  meta = [],
  narrow = false,
  signatures,
  printedAt,
  children,
}) {
  const businessName = settings.businessName?.trim() || settings.repName?.trim() || "";
  const businessMeta = [settings.businessPhone, settings.businessAddress].filter(Boolean).join(" · ");

  return (
    <div className={`doc ${narrow ? "doc--narrow" : ""}`}>
      <header className="doc-head">
        <div>
          {businessName && <div className="doc-biz-name">{businessName}</div>}
          {businessMeta && <div className="doc-biz-meta">{businessMeta}</div>}
          {settings.repName && businessName !== settings.repName && (
            <div className="doc-biz-meta">المندوب: {settings.repName}</div>
          )}
        </div>
        <div className="doc-head-left">
          <div className="doc-title">{title}</div>
          {number && (
            <div className="doc-meta">
              رقم: <Num>{number}</Num>
            </div>
          )}
          {meta.map((m) => (
            <div key={m.label} className="doc-meta">
              {m.label}: <Num>{m.value}</Num>
            </div>
          ))}
        </div>
      </header>

      {children}

      {signatures !== false && (
        <div className="doc-signs">
          <div className="doc-sign">
            <div className="doc-sign-line">توقيع المستلم</div>
          </div>
          <div className="doc-sign">
            <div className="doc-sign-line">توقيع المندوب</div>
          </div>
        </div>
      )}

      <footer className="doc-foot">
        <span>{settings.footerNote || ""}</span>
        <span>
          طُبع في <Num>{formatDateTime(printedAt)}</Num>
        </span>
      </footer>
    </div>
  );
}

export function InfoBox({ label, name, lines = [] }) {
  return (
    <div className="doc-box">
      <div className="doc-box-label">{label}</div>
      {name && <div className="doc-box-name">{name}</div>}
      {lines.filter(Boolean).map((line, i) => (
        <div key={i} className="doc-box-line">
          {line}
        </div>
      ))}
    </div>
  );
}

export function SummaryRow({ label, value, grand = false }) {
  return (
    <div className={`doc-sum-row ${grand ? "doc-sum-row--grand" : ""}`}>
      <span>{label}</span>
      <span className="doc-sum-value doc-num">{value}</span>
    </div>
  );
}
