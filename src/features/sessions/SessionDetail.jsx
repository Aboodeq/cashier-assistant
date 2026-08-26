import { auth } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { netTotals, sumEntries } from "../../utils/format";
import "./SessionDetail.css";

export default function SessionDetail({ session, onBack, onOpenEntries }) {
  const uid = auth.currentUser?.uid;
  const entries = useFirestoreCollection(
    uid && session && ["users", uid, "sessions", session.id, "entries"],
    { orderByField: "createdAt", direction: "asc" },
  );

  const deps = entries.filter((e) => e.type === "deposit");
  const wths = entries.filter((e) => e.type === "withdrawal");
  const dT = sumEntries(deps);
  const wT = sumEntries(wths);
  const nT = netTotals(dT, wT);

  return (
    <div className="sd-root">
      <div className="sd-header">
        <div className="sd-hbg" />
        <div className="sd-htop">
          <button className="back-btn" onClick={onBack}>
            <i className="fa-solid fa-arrow-right" />
            العودة
          </button>
          <div className="sd-hmeta-row">
            <span>
              <i className="fa-solid fa-building" style={{ fontSize: 10 }} />
              {session.companyName}
            </span>
            <span>
              <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
              {session.date}
            </span>
            <span>
              <i className="fa-solid fa-list" style={{ fontSize: 10 }} />
              {entries.length} إدخال
            </span>
          </div>
        </div>
        <div className="sd-hinfo">
          <div className="sd-hico">
            <i className="fa-solid fa-folder-open" style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <h1 className="sd-htitle">{session.label}</h1>
        </div>
        <div className="sd-net-bar">
          {[
            { lbl: "صافي ل.س", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
            { lbl: "صافي دولار", val: `$${nT.usd.toLocaleString()}`, pos: nT.usd >= 0 },
            { lbl: "إيداع / سحب", val: `${deps.length} / ${wths.length}`, neutral: true },
          ].map((n, i) => (
            <div key={i} className="sd-net-chip">
              <div className="sd-net-lbl">{n.lbl}</div>
              <div
                className={`sd-net-val ${n.neutral ? "" : "sd-net-val--" + (n.pos ? "pos" : "neg")}`}
              >
                {n.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sd-body">
        <div className="sd-summary-grid">
          {/* Deposit card */}
          <div className="sd-sum-card sd-sum-card--dep">
            <div className="sd-sum-card-header">
              <div className="sd-sum-card-ico sd-sum-card-ico--dep">
                <i className="fa-solid fa-arrow-down" style={{ fontSize: 16, color: "#059669" }} />
              </div>
              <div>
                <div className="sd-sum-card-title">الإيداعات</div>
                <div className="sd-sum-card-count">{deps.length} إدخال</div>
              </div>
            </div>
            <div className="sd-sum-amounts">
              {[
                {
                  lbl: "ل.س",
                  val: dT.newSYP.toLocaleString(),
                  cls: "sd-sum-val--purple",
                  net: nT.newSYP,
                  netPos: nT.newSYP >= 0,
                },
                {
                  lbl: "دولار",
                  val: `$${dT.usd.toLocaleString()}`,
                  cls: "sd-sum-val--amber",
                  net: nT.usd,
                  netPos: nT.usd >= 0,
                  prefix: "$",
                },
              ].map((a, i) => (
                <div key={i} className="sd-sum-row">
                  <div className="sd-sum-amount">
                    <span className="sd-sum-lbl">{a.lbl}</span>
                    <span className={`sd-sum-val ${a.cls}`}>{a.val}</span>
                  </div>
                  <div className={`sd-sum-net ${a.netPos ? "sd-sum-net--pos" : "sd-sum-net--neg"}`}>
                    <i
                      className={`fa-solid fa-${a.netPos ? "arrow-trend-up" : "arrow-trend-down"}`}
                      style={{ fontSize: 9 }}
                    />
                    صافي: {a.netPos && a.net !== 0 ? "+" : ""}
                    {a.prefix || ""}
                    {a.net.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="sd-sum-btn sd-sum-btn--dep"
              onClick={() => onOpenEntries(session, "deposit")}
            >
              <i className="fa-solid fa-table-list" />
              عرض وإدارة الإيداعات
              <i
                className="fa-solid fa-arrow-left"
                style={{ marginRight: "auto", marginLeft: 0 }}
              />
            </button>
          </div>

          {/* Withdrawal card */}
          <div className="sd-sum-card sd-sum-card--wth">
            <div className="sd-sum-card-header">
              <div className="sd-sum-card-ico sd-sum-card-ico--wth">
                <i className="fa-solid fa-arrow-up" style={{ fontSize: 16, color: "#dc2626" }} />
              </div>
              <div>
                <div className="sd-sum-card-title">السحوبات</div>
                <div className="sd-sum-card-count">{wths.length} إدخال</div>
              </div>
            </div>
            <div className="sd-sum-amounts">
              {[
                {
                  lbl: "ل.س",
                  val: wT.newSYP.toLocaleString(),
                  cls: "sd-sum-val--red",
                  net: nT.newSYP,
                  netPos: nT.newSYP >= 0,
                },
                {
                  lbl: "دولار",
                  val: `$${wT.usd.toLocaleString()}`,
                  cls: "sd-sum-val--pink",
                  net: nT.usd,
                  netPos: nT.usd >= 0,
                  prefix: "$",
                },
              ].map((a, i) => (
                <div key={i} className="sd-sum-row">
                  <div className="sd-sum-amount">
                    <span className="sd-sum-lbl">{a.lbl}</span>
                    <span className={`sd-sum-val ${a.cls}`}>{a.val}</span>
                  </div>
                  <div className={`sd-sum-net ${a.netPos ? "sd-sum-net--pos" : "sd-sum-net--neg"}`}>
                    <i
                      className={`fa-solid fa-${a.netPos ? "arrow-trend-up" : "arrow-trend-down"}`}
                      style={{ fontSize: 9 }}
                    />
                    صافي: {a.netPos && a.net !== 0 ? "+" : ""}
                    {a.prefix || ""}
                    {a.net.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="sd-sum-btn sd-sum-btn--wth"
              onClick={() => onOpenEntries(session, "withdrawal")}
            >
              <i className="fa-solid fa-table-list" />
              عرض وإدارة السحوبات
              <i
                className="fa-solid fa-arrow-left"
                style={{ marginRight: "auto", marginLeft: 0 }}
              />
            </button>
          </div>
        </div>

        {/* Net card */}
        <div className="sd-net-card">
          <div className="sd-net-card-title">
            <i className="fa-solid fa-scale-balanced" style={{ color: "#818cf8", fontSize: 15 }} />
            الصافي الإجمالي
          </div>
          <div className="sd-net-amounts">
            {[
              { lbl: "صافي ل.س", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
              { lbl: "صافي دولار", val: `$${nT.usd.toLocaleString()}`, pos: nT.usd >= 0 },
            ].map((n, i) => (
              <div key={i} className="sd-net-amount">
                <span className="sd-net-amount-lbl">{n.lbl}</span>
                <span
                  className={`sd-net-amount-val ${n.pos ? "sd-net-amount-val--pos" : "sd-net-amount-val--neg"}`}
                >
                  {n.pos && n.val !== "0" && n.val !== "$0" ? "+" : ""}
                  {n.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-quick-actions">
          <button
            className="sd-qa-btn sd-qa-btn--dep"
            onClick={() => onOpenEntries(session, "deposit")}
          >
            <i className="fa-solid fa-plus" />
            إضافة إيداع
          </button>
          <button
            className="sd-qa-btn sd-qa-btn--wth"
            onClick={() => onOpenEntries(session, "withdrawal")}
          >
            <i className="fa-solid fa-plus" />
            إضافة سحب
          </button>
        </div>
      </div>
    </div>
  );
}
