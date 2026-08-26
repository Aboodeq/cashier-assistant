import { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../firebase/config";
import { useStagger } from "../../hooks/useStagger";
import { useCanvasAnimation } from "../../hooks/useCanvasAnimation";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const canvasRef = useRef(null);
  const isVisible = useStagger(8);

  useCanvasAnimation(canvasRef, (ctx, getSize) => {
    const { width: W, height: H } = getSize();
    const DOTS = Array.from({ length: 62 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.2 + 0.5,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    const RINGS = [
      { x: 0.5, y: 0.4, r: 160, speed: 0.0006, phase: 0, color: "rgba(129,140,248," },
      { x: 0.8, y: 0.7, r: 110, speed: 0.0009, phase: 1.2, color: "rgba(94,234,212," },
      { x: 0.2, y: 0.8, r: 90, speed: 0.0007, phase: 2.4, color: "rgba(252,211,77," },
      { x: 0.7, y: 0.2, r: 130, speed: 0.0005, phase: 0.8, color: "rgba(165,180,252," },
    ];

    return (t) => {
      const { width: W, height: H } = getSize();
      ctx.clearRect(0, 0, W, H);
      RINGS.forEach((ring) => {
        const cx = ring.x * W;
        const cy = ring.y * H;
        const alpha = 0.12 + 0.06 * Math.sin(t * ring.speed * 1000 + ring.phase);
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r + 18 * Math.sin(t * ring.speed * 800 + ring.phase), 0, Math.PI * 2);
        ctx.strokeStyle = ring.color + alpha + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          ring.r * 0.6 + 10 * Math.cos(t * ring.speed * 600 + ring.phase),
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = ring.color + alpha * 0.6 + ")";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
      for (let i = 0; i < DOTS.length; i++) {
        for (let j = i + 1; j < DOTS.length; j++) {
          const dx = DOTS[i].x - DOTS[j].x;
          const dy = DOTS[i].y - DOTS[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(DOTS[i].x, DOTS[i].y);
            ctx.lineTo(DOTS[j].x, DOTS[j].y);
            ctx.strokeStyle = `rgba(129,140,248,${0.18 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      DOTS.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = W;
        if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H;
        if (d.y > H) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165,180,252,${d.opacity})`;
        ctx.fill();
      });
    };
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
    }
  };

  return (
    <div className="lr-root">
      {/* ══ الجانب التعريفي ══ */}
      <div className="lr-left">
        <div className="lr-left-bg" />
        <div className="lr-blob lr-blob1" />
        <div className="lr-blob lr-blob2" />
        <div className="lr-blob lr-blob3" />
        {pts.map((p, i) => (
          <div key={i} style={p} />
        ))}

        <div className="lr-left-content">
          <div className="lr-logo-row">
            <div className="lr-logo-box">
              <i className="fa-solid fa-cash-register" style={{ fontSize: 24, color: "#fff" }} />
            </div>
            <span className="lr-logo-label">Cashier Assistant</span>
          </div>

          <div className="lr-hero">
            <h1 className="lr-h1">
              إدارة
              <span className="lr-grad"> الصندوق </span>
              بذكاء
            </h1>
            <p className="lr-p">
              منصة متكاملة لتتبع الإيرادات وإدارة المناديب عبر شركات متعددة — بسرعة وأمان تام
            </p>
          </div>

          <div className="lr-feats">
            {feats.map((f, i) => (
              <FeatCard key={i} f={f} i={i} />
            ))}
          </div>

          <div className="lr-nums">
            {nums.map((n, i) => (
              <div key={i} className="lr-num-item">
                <span className="lr-num-val">{n.v}</span>
                <span className="lr-num-lbl">{n.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ الجانب الفورم ══ */}
      <div className="lr-right">
        <canvas ref={canvasRef} className="lr-canvas" />
        <div className="lr-right-bg" />

        <div className="lr-form-wrap">
          <div
            style={{
              ...fs.head,
              opacity: isVisible(0) ? 1 : 0,
              transform: isVisible(0) ? "translateY(0)" : "translateY(22px)",
              transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div style={fs.avatar}>
              <i className="fa-solid fa-user-tie" style={{ fontSize: 22, color: "#4f46e5" }} />
            </div>
            <h2 style={fs.title}>تسجيل الدخول</h2>
            <p style={fs.sub}>أدخل بياناتك للمتابعة</p>
          </div>

          {error && (
            <div style={fs.err}>
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={fs.form} noValidate>
            <Field
              label="البريد الإلكتروني"
              icon="fa-regular fa-envelope"
              visible={isVisible(1)}
              delay="0.08s"
            >
              <div style={{ ...fs.inputBox, ...(focused === "email" ? fs.focus : {}) }}>
                <i
                  className="fa-regular fa-envelope"
                  style={{ ...fs.icoR, color: focused === "email" ? "#6366f1" : "#94a3b8" }}
                />
                <input
                  style={fs.inp}
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  required
                />
              </div>
            </Field>

            <Field
              label="كلمة المرور"
              icon="fa-solid fa-lock"
              visible={isVisible(2)}
              delay="0.16s"
            >
              <div style={{ ...fs.inputBox, ...(focused === "pass" ? fs.focus : {}) }}>
                <i
                  className="fa-solid fa-lock"
                  style={{ ...fs.icoR, color: focused === "pass" ? "#6366f1" : "#94a3b8" }}
                />
                <input
                  style={fs.inp}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                  required
                />
                <button type="button" style={fs.eyeBtn} onClick={() => setShowPass((p) => !p)}>
                  <i
                    className={`fa-regular ${showPass ? "fa-eye-slash" : "fa-eye"}`}
                    style={{ fontSize: 15, color: "#94a3b8" }}
                  />
                </button>
              </div>
            </Field>

            <div
              style={{
                opacity: isVisible(3) ? 1 : 0,
                transform: isVisible(3) ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.6s 0.24s cubic-bezier(0.22,1,0.36,1)",
                marginTop: 4,
              }}
            >
              <BtnSubmit loading={loading} />
            </div>
          </form>

          <div
            style={{ ...fs.sep, opacity: isVisible(4) ? 1 : 0, transition: "opacity 0.5s 0.36s" }}
          >
            <div style={fs.sepLine} />
            <span style={fs.sepTxt}>
              <i className="fa-solid fa-shield-halved" style={{ marginLeft: 5, color: "#818cf8" }} />
              دخول آمن ومشفّر
            </span>
            <div style={fs.sepLine} />
          </div>

          <p style={{ ...fs.reg, opacity: isVisible(5) ? 1 : 0, transition: "opacity 0.5s 0.44s" }}>
            ليس لديك حساب؟{" "}
            <Link to="/register" style={fs.regLink}>
              إنشاء حساب جديد
            </Link>
          </p>

          <div
            style={{
              ...fs.badgeRow,
              opacity: isVisible(6) ? 1 : 0,
              transition: "opacity 0.5s 0.52s",
            }}
          >
            {badges.map((b, i) => (
              <span key={i} style={{ ...fs.badge, ...b.st }}>
                <i className={b.ic} style={{ fontSize: 11 }} />
                {b.tx}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, visible, delay, children }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s ${delay} cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      <label style={fs.lbl}>
        <i className={icon} style={{ fontSize: 11, color: "#818cf8" }} />
        {label}
      </label>
      {children}
    </div>
  );
}

function BtnSubmit({ loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...fs.btn,
        ...(hov && !loading ? fs.btnHov : {}),
        ...(loading ? { opacity: 0.72, cursor: "not-allowed", transform: "none" } : {}),
      }}
    >
      <span style={fs.shine} />
      {loading ? (
        <>
          <div style={fs.spinner} />
          جاري الدخول...
        </>
      ) : (
        <>
          <i className="fa-solid fa-right-to-bracket" style={{ fontSize: 16 }} />
          تسجيل الدخول
          <i
            className="fa-solid fa-arrow-left"
            style={{
              fontSize: 13,
              marginRight: "auto",
              marginLeft: 0,
              opacity: hov ? 1 : 0,
              transform: hov ? "translateX(0)" : "translateX(8px)",
              transition: "all 0.25s",
            }}
          />
        </>
      )}
    </button>
  );
}

function FeatCard({ f, i }) {
  const [hov, setHov] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 500 + i * 130);
    return () => clearTimeout(t);
  }, [i]);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.15)"}`,
        borderRadius: 14,
        padding: "11px 13px",
        opacity: on ? 1 : 0,
        transform: on
          ? hov
            ? "translateY(-5px) scale(1.03)"
            : "translateY(0) scale(1)"
          : "translateY(14px)",
        transition: on
          ? "all 0.32s cubic-bezier(0.34,1.56,0.64,1)"
          : "opacity 0.5s, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
        cursor: "default",
        backdropFilter: "blur(10px)",
        boxShadow: hov ? "0 10px 28px rgba(0,0,0,0.18)" : "none",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: f.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i className={f.ic} style={{ fontSize: 17, color: f.cl }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 1 }}>{f.ti}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.58)" }}>{f.su}</div>
      </div>
    </div>
  );
}

/* ══ بيانات ══ */
const feats = [
  {
    ic: "fa-solid fa-building",
    ti: "متعدد الشركات",
    su: "إدارة شركات متعددة",
    bg: "rgba(99,102,241,0.28)",
    cl: "#a5b4fc",
  },
  {
    ic: "fa-solid fa-users",
    ti: "إدارة المناديب",
    su: "قائمة محفوظة للمناديب",
    bg: "rgba(20,184,166,0.28)",
    cl: "#5eead4",
  },
  {
    ic: "fa-solid fa-coins",
    ti: "عملتان",
    su: "ل.س · $",
    bg: "rgba(245,158,11,0.28)",
    cl: "#fcd34d",
  },
  {
    ic: "fa-solid fa-cloud-arrow-up",
    ti: "سحابي دائماً",
    su: "Firebase – لا تفقد بياناتك",
    bg: "rgba(59,130,246,0.28)",
    cl: "#93c5fd",
  },
];
const nums = [
  { v: "2", l: "عملتان" },
  { v: "∞", l: "مندوب" },
  { v: "100%", l: "أمان" },
];
const badges = [
  {
    ic: "fa-brands fa-google",
    tx: "Firebase",
    st: {
      background: "rgba(12, 49, 136, 0.85)",
      color: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.2)",
    },
  },
  {
    ic: "fa-solid fa-shield-halved",
    tx: "مشفّر",
    st: {
      background: "rgba(12, 49, 136, 0.85)",
      color: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.2)",
    },
  },
  {
    ic: "fa-solid fa-bolt",
    tx: "سريع",
    st: {
      background: "rgba(12, 49, 136, 0.85)",
      color: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.2)",
    },
  },
];
const pts = [
  {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "rgba(165,180,252,0.7)",
    top: "10%",
    right: "9%",
    animation: "ptFloat 5.5s 0s   ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgba(94,234,212,0.7)",
    top: "26%",
    right: "21%",
    animation: "ptFloat 7s   1s   ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: "50%",
    background: "rgba(252,211,77,0.55)",
    top: "52%",
    right: "7%",
    animation: "ptFloat 8s   2s   ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "rgba(165,180,252,0.6)",
    top: "68%",
    right: "25%",
    animation: "ptFloat 6s   0.5s ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.5)",
    top: "38%",
    right: "32%",
    animation: "ptFloat 9s   3s   ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(94,234,212,0.5)",
    top: "82%",
    right: "14%",
    animation: "ptFloat 6.5s 1.5s ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
];

/* ══ Form styles (JS objects — لا تتأثر بـ media queries لذا تبقى كـ objects) ══ */
const fs = {
  head: { textAlign: "center", marginBottom: 28 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
    border: "2px solid rgba(99,102,241,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
    boxShadow: "0 4px 20px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  title: {
    fontSize: 26,
    fontWeight: 900,
    color: "#1e293b",
    letterSpacing: "-0.5px",
    marginBottom: 6,
  },
  sub: { fontSize: 14, color: "#94a3b8", fontWeight: 400 },
  err: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    padding: "11px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 18,
    animation: "errIn 0.3s ease both",
  },
  form: { display: "flex", flexDirection: "column", gap: 22 },
  lbl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
    marginBottom: 9,
  },
  inputBox: {
    position: "relative",
    border: "1.5px solid #e2e8f0",
    borderRadius: 14,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
  },
  focus: {
    borderColor: "#6366f1",
    background: "#fff",
    boxShadow: "0 0 0 4px rgba(99,102,241,0.12), 0 2px 12px rgba(99,102,241,0.1)",
  },
  icoR: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    right: 14,
    fontSize: 15,
    pointerEvents: "none",
    transition: "color 0.2s",
  },
  inp: {
    width: "100%",
    padding: "14px 44px 14px 44px",
    border: "none",
    background: "transparent",
    fontSize: 15,
    color: "#1e293b",
    textAlign: "right",
    borderRadius: 14,
  },
  eyeBtn: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: 12,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
  },
  btn: {
    width: "100%",
    padding: "15px 20px",
    background: "linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#818cf8 100%)",
    backgroundSize: "200% 200%",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxShadow: "0 4px 20px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.2)",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
  },
  btnHov: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 32px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
    backgroundPosition: "100% 100%",
  },
  shine: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 55%)",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2.5px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
  sep: { display: "flex", alignItems: "center", gap: 10, margin: "24px 0 18px" },
  sepLine: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg,transparent,#e2e8f0,transparent)",
  },
  sepTxt: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 600,
    whiteSpace: "nowrap",
    letterSpacing: "0.3px",
  },
  reg: { textAlign: "center", fontSize: 14, color: "#94a3b8", marginBottom: 20 },
  regLink: { color: "#4f46e5", fontWeight: 700, textDecoration: "none" },
  badgeRow: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 13px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
  },
};
