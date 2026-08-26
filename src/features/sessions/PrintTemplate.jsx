/**
 * Rendered off-screen (display:none) purely so its `innerHTML` can be lifted into the
 * print popup window — see printReport.js. Its `.pr-*` classes only get styled there,
 * inside that popup's own injected stylesheet.
 */
export default function PrintTemplate({
  printRef,
  title,
  reportDate,
  totals,
  rows,
  money,
  entryDate,
  amountLines,
  printUserName,
}) {
  const { dep, wth, net } = totals;

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef}>
        <div className="page">
          <h1 className="pr-title">{title}</h1>
          <div className="pr-date">{reportDate}</div>

          <h2 className="pr-summary-title">ملخص الإجماليات</h2>
          <div className="pr-blue-line" />
          <div className="pr-summary-grid">
            {[
              { name: "الليرة السورية", total: dep.newSYP, withdrawn: wth.newSYP, net: net.newSYP },
              { name: "الدولار الأمريكي", total: dep.usd, withdrawn: wth.usd, net: net.usd },
            ].map((item) => (
              <div key={item.name} className="pr-summary-card">
                <div className="pr-summary-name">{item.name}</div>
                <div className="pr-summary-line">
                  الإجمالي: <span className="pr-num">{money(item.total)}</span>
                </div>
                <div className="pr-summary-line">
                  المسحوب: <span className="pr-num">{money(item.withdrawn)}</span>
                </div>
                <div className="pr-summary-net">
                  الصافي: <span className="pr-num">{money(item.net)}</span>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="pr-empty">لا توجد إدخالات للطباعة</div>
          ) : (
            <table className="pr-table">
              <thead>
                <tr>
                  <th className="pr-col-index">#</th>
                  <th className="pr-col-name">الاسم</th>
                  <th className="pr-col-date">التاريخ</th>
                  <th className="pr-col-type">النوع</th>
                  <th className="pr-col-amounts">المبالغ</th>
                  <th className="pr-col-notes">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry, index) => (
                  <tr key={entry.id || index}>
                    <td>{index + 1}</td>
                    <td>{entry.repName || "-"}</td>
                    <td>
                      <span className="pr-num">{entryDate(entry)}</span>
                    </td>
                    <td>{entry.type === "withdrawal" ? "سحب" : "إيداع"}</td>
                    <td>
                      <div className="pr-amounts">
                        {amountLines(entry).map((line, lineIndex) => (
                          <div key={lineIndex} className="pr-amount-line">
                            <span className="pr-num">{line.amount}</span>
                            {line.unit && <span className="pr-amount-unit">{line.unit}</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="pr-note">{entry.note || "-"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {printUserName && (
            <div className="pr-footer">
              <span>منسق التقرير: </span>
              <strong dir="ltr">{printUserName}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
