import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { Link } from "react-router-dom";

function useStagger(count, delay = 90) {
  const [visible, setVisible] = useState([]);
  useEffect(() => {
    const timers = [];
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setVisible((v) => [...v, i]), 250 + i * delay));
    }
    return () => timers.forEach(clearTimeout);
  }, []);
  return (i) => visible.includes(i);
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const canvasRef = useRef(null);
  const isVisible = useStagger(10);

  /* Canvas — نفس تأثير Login لكن بألوان مختلفة */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);
    const DOTS = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    const RINGS = [
      { x: 0.4, y: 0.35, r: 140, speed: 0.0007, phase: 0, color: "rgba(129,140,248," },
      { x: 0.75, y: 0.65, r: 100, speed: 0.001, phase: 1.5, color: "rgba(94,234,212," },
      { x: 0.25, y: 0.75, r: 85, speed: 0.0008, phase: 2.8, color: "rgba(165,180,252," },
      { x: 0.65, y: 0.25, r: 120, speed: 0.0006, phase: 1.0, color: "rgba(252,211,77," },
    ];
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 1;
      RINGS.forEach((ring) => {
        const cx = ring.x * W,
          cy = ring.y * H;
        const alpha = 0.1 + 0.07 * Math.sin(t * ring.speed * 1000 + ring.phase);
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r + 16 * Math.sin(t * ring.speed * 800 + ring.phase), 0, Math.PI * 2);
        ctx.strokeStyle = ring.color + alpha + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          ring.r * 0.55 + 8 * Math.cos(t * ring.speed * 600 + ring.phase),
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = ring.color + alpha * 0.55 + ")";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });
      for (let i = 0; i < DOTS.length; i++) {
        for (let j = i + 1; j < DOTS.length; j++) {
          const dx = DOTS[i].x - DOTS[j].x,
            dy = DOTS[i].y - DOTS[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 95) {
            ctx.beginPath();
            ctx.moveTo(DOTS[i].x, DOTS[i].y);
            ctx.lineTo(DOTS[j].x, DOTS[j].y);
            ctx.strokeStyle = `rgba(129,140,248,${0.18 * (1 - dist / 95)})`;
            ctx.lineWidth = 0.5;
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
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "هذا البريد الإلكتروني مستخدم مسبقاً"
          : "حدث خطأ أثناء إنشاء الحساب",
      );
      setLoading(false);
    }
  };

  /* مؤشر قوة كلمة المرور */
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["", "ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية جداً"][strength];
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"][strength];

  return (
    <>
      <style>{CSS}</style>
      <div className="rg-root">
        {/* ══ يسار — تعريفي ══ */}
        <div className="rg-left">
          <div className="rg-left-bg" />
          <div className="rg-blob rg-blob1" />
          <div className="rg-blob rg-blob2" />
          <div className="rg-blob rg-blob3" />
          {pts.map((p, i) => (
            <div key={i} style={p} />
          ))}

          <div className="rg-left-content">
            <div className="rg-logo-row">
              <div className="rg-logo-box">
                <i className="fa-solid fa-cash-register" style={{ fontSize: 24, color: "#fff" }} />
              </div>
              <span className="rg-logo-label">مساعد الصندوق</span>
            </div>

            <div className="rg-hero">
              <h1 className="rg-h1">
                انضم إلى
                <span className="rg-grad"> منصتنا </span>
                اليوم
              </h1>
              <p className="rg-p">
                أنشئ حسابك وابدأ بإدارة صندوقك بشكل احترافي — مجاناً وبدون تعقيد
              </p>
            </div>

            {/* خطوات التسجيل */}
            <div className="rg-steps">
              {steps.map((st, i) => (
                <StepCard key={i} st={st} i={i} />
              ))}
            </div>

            {/* ميزة أمان */}
            <div className="rg-security">
              <i className="fa-solid fa-shield-halved" style={{ fontSize: 16, color: "#6ee7b7" }} />
              <div>
                <div className="rg-sec-title">بياناتك آمنة 100%</div>
                <div className="rg-sec-sub">مشفّرة بالكامل عبر Firebase Authentication</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ يمين — فورم ══ */}
        <div className="rg-right">
          <canvas ref={canvasRef} className="rg-canvas" />
          <div className="rg-right-bg" />

          <div className="rg-form-wrap">
            {/* رأس */}
            <div
              style={{
                ...fs.head,
                opacity: isVisible(0) ? 1 : 0,
                transform: isVisible(0) ? "translateY(0)" : "translateY(22px)",
                transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div style={fs.avatar}>
                <i className="fa-solid fa-user-plus" style={{ fontSize: 22, color: "#4f46e5" }} />
              </div>
              <h2 style={fs.title}>إنشاء حساب جديد</h2>
              <p style={fs.sub}>أدخل بياناتك لبدء رحلتك</p>
            </div>

            {/* خطأ */}
            {error && (
              <div style={fs.err}>
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </div>
            )}

            {/* فورم */}
            <form onSubmit={handleRegister} style={fs.form} noValidate>
              {/* البريد */}
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

              {/* كلمة المرور */}
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
                {/* مؤشر القوة */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background: n <= strength ? strengthColor : "#e2e8f0",
                            transition: "background 0.3s",
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>
                      قوة كلمة المرور: {strengthLabel}
                    </span>
                  </div>
                )}
              </Field>

              {/* تأكيد كلمة المرور */}
              <Field
                label="تأكيد كلمة المرور"
                icon="fa-solid fa-lock-open"
                visible={isVisible(3)}
                delay="0.24s"
              >
                <div
                  style={{
                    ...fs.inputBox,
                    ...(focused === "conf" ? fs.focus : {}),
                    ...(confirm && password !== confirm
                      ? { borderColor: "#ef4444", boxShadow: "0 0 0 4px rgba(239,68,68,0.1)" }
                      : {}),
                    ...(confirm && password === confirm
                      ? { borderColor: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,0.1)" }
                      : {}),
                  }}
                >
                  <i
                    className="fa-solid fa-lock-open"
                    style={{ ...fs.icoR, color: focused === "conf" ? "#6366f1" : "#94a3b8" }}
                  />
                  <input
                    style={fs.inp}
                    type={showConf ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onFocus={() => setFocused("conf")}
                    onBlur={() => setFocused(null)}
                    required
                  />
                  <button type="button" style={fs.eyeBtn} onClick={() => setShowConf((p) => !p)}>
                    <i
                      className={`fa-regular ${showConf ? "fa-eye-slash" : "fa-eye"}`}
                      style={{ fontSize: 15, color: "#94a3b8" }}
                    />
                  </button>
                  {confirm && (
                    <div
                      style={{
                        position: "absolute",
                        left: 40,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      {password === confirm ? (
                        <i
                          className="fa-solid fa-circle-check"
                          style={{ color: "#22c55e", fontSize: 15 }}
                        />
                      ) : (
                        <i
                          className="fa-solid fa-circle-xmark"
                          style={{ color: "#ef4444", fontSize: 15 }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Field>

              {/* زر الإنشاء */}
              <div
                style={{
                  opacity: isVisible(4) ? 1 : 0,
                  transform: isVisible(4) ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.6s 0.32s cubic-bezier(0.22,1,0.36,1)",
                  marginTop: 4,
                }}
              >
                <BtnRegister loading={loading} />
              </div>
            </form>

            {/* فاصل */}
            <div
              style={{ ...fs.sep, opacity: isVisible(5) ? 1 : 0, transition: "opacity 0.5s 0.44s" }}
            >
              <div style={fs.sepLine} />
              <span style={fs.sepTxt}>
                <i
                  className="fa-solid fa-shield-halved"
                  style={{ marginLeft: 5, color: "#4f46e5" }}
                />
                تسجيل آمن ومشفّر
              </span>
              <div style={fs.sepLine} />
            </div>

            {/* رابط الدخول */}
            <p
              style={{ ...fs.reg, opacity: isVisible(6) ? 1 : 0, transition: "opacity 0.5s 0.52s" }}
            >
              لديك حساب بالفعل؟{" "}
              <Link to="/login" style={fs.regLink}>
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── مكون حقل ── */
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

/* ── زر التسجيل ── */
function BtnRegister({ loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...fs.btn,
        background: "linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#818cf8 100%)",
        boxShadow:
          hov && !loading
            ? "0 10px 32px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.2)"
            : "0 4px 20px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.2)",
        transform: hov && !loading ? "translateY(-2px)" : "none",
        ...(loading ? { opacity: 0.72, cursor: "not-allowed", transform: "none" } : {}),
      }}
    >
      <span style={fs.shine} />
      {loading ? (
        <>
          <div style={fs.spinner} />
          جاري الإنشاء...
        </>
      ) : (
        <>
          <i className="fa-solid fa-user-plus" style={{ fontSize: 16 }} />
          إنشاء الحساب
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

/* ── بطاقة خطوة ── */
function StepCard({ st, i }) {
  const [on, setOn] = useState(false);
  const [hov, setHov] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 500 + i * 140);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
        padding: "13px 15px",
        opacity: on ? 1 : 0,
        transform: on
          ? hov
            ? "translateY(-4px) scale(1.02)"
            : "translateY(0) scale(1)"
          : "translateY(14px)",
        transition: on
          ? "all 0.32s cubic-bezier(0.34,1.56,0.64,1)"
          : "opacity 0.5s, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
        cursor: "default",
        backdropFilter: "blur(10px)",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          flexShrink: 0,
          background: st.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i className={st.ic} style={{ fontSize: 17, color: st.cl }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{st.ti}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{st.su}</div>
      </div>
    </div>
  );
}

/* ══ بيانات ══ */
const steps = [
  {
    ic: "fa-solid fa-envelope",
    ti: "أدخل بريدك",
    su: "بريد إلكتروني صحيح",
    bg: "rgba(16,185,129,0.28)",
    cl: "#6ee7b7",
  },
  {
    ic: "fa-solid fa-lock",
    ti: "اختر كلمة مرور",
    su: "6 أحرف على الأقل",
    bg: "rgba(99,102,241,0.28)",
    cl: "#a5b4fc",
  },
  {
    ic: "fa-solid fa-building",
    ti: "أضف شركاتك",
    su: "بعد التسجيل مباشرة",
    bg: "rgba(245,158,11,0.28)",
    cl: "#fcd34d",
  },
  {
    ic: "fa-solid fa-chart-line",
    ti: "ابدأ التتبع",
    su: "سجّل الإيرادات فوراً",
    bg: "rgba(59,130,246,0.28)",
    cl: "#93c5fd",
  },
];
const pts = [
  {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "rgba(165,180,252,0.7)",
    top: "12%",
    right: "8%",
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
    top: "30%",
    right: "22%",
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
    top: "55%",
    right: "6%",
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
    top: "40%",
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

const CSS = `
  @keyframes gradShiftG {
    0%,100% { background-position:0% 50%; }
    50%      { background-position:100% 50%; }
  }
  @keyframes morphA {
    0%,100% { border-radius:60% 40% 55% 45%/50% 60% 40% 50%; transform:translate(0,0) scale(1); }
    33%      { border-radius:40% 60% 40% 60%/60% 40% 60% 40%; transform:translate(-18px,22px) scale(1.06); }
    66%      { border-radius:55% 45% 65% 35%/40% 55% 45% 60%; transform:translate(14px,-10px) scale(0.96); }
  }
  @keyframes morphB {
    0%,100% { border-radius:45% 55% 40% 60%/60% 45% 55% 40%; transform:translate(0,0) scale(1); }
    50%      { border-radius:60% 40% 55% 45%/40% 60% 40% 60%; transform:translate(16px,-20px) scale(1.08); }
  }
  @keyframes morphC {
    0%,100% { border-radius:55% 45% 60% 40%/45% 60% 40% 55%; transform:translate(0,0) scale(1); }
    50%      { border-radius:40% 60% 45% 55%/60% 40% 55% 45%; transform:translate(-12px,16px) scale(1.04); }
  }
  @keyframes ptFloat {
    0%,100% { transform:translateY(0) scale(1);      opacity:.55; }
    50%      { transform:translateY(-24px) scale(1.15); opacity:.9; }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes errIn {
    from { opacity:0; transform:translateY(-8px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  .rg-root {
    display:flex; flex-direction:row; min-height:100vh;
    font-family:'Tajawal',sans-serif;
  }
  .rg-left {
    flex:1 1 50%; position:relative; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    padding:48px 44px; min-height:100vh; order:2;
  }
  .rg-left-bg {
    position:absolute; inset:0; z-index:0;
    background:linear-gradient(145deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1,#006064);
    background-size:400% 400%;
    animation:gradShiftG 14s ease infinite;
  }
  .rg-blob { position:absolute; z-index:1; pointer-events:none; }
  .rg-blob1 {
    width:420px; height:420px;
    background:radial-gradient(circle at 40% 40%,rgba(99,102,241,0.38),transparent 65%);
    top:-90px; right:-90px; animation:morphA 16s ease-in-out infinite;
  }
  .rg-blob2 {
    width:360px; height:360px;
    background:radial-gradient(circle at 60% 60%,rgba(20,184,166,0.3),transparent 65%);
    bottom:-70px; left:-70px; animation:morphB 20s ease-in-out infinite;
  }
  .rg-blob3 {
    width:280px; height:280px;
    background:radial-gradient(circle at 50% 50%,rgba(245,158,11,0.2),transparent 65%);
    top:40%; left:20%; animation:morphC 22s ease-in-out infinite;
  }
  .rg-left-content {
    position:relative; z-index:3;
    display:flex; flex-direction:column; gap:24px;
    max-width:460px; width:100%;
  }
  .rg-logo-row {
    display:flex; align-items:center; gap:12px;
    animation:fadeUp 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both;
  }
  .rg-logo-box {
    width:50px; height:50px; border-radius:13px;
    background:rgba(255,255,255,0.14);
    border:1px solid rgba(255,255,255,0.25);
    backdrop-filter:blur(12px);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 4px 16px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.3);
  }
  .rg-logo-label { font-size:19px; font-weight:800; color:#fff; letter-spacing:-0.3px; text-shadow:0 1px 8px rgba(0,0,0,0.3); }
  .rg-hero { animation:fadeUp 0.7s 0.18s cubic-bezier(0.22,1,0.36,1) both; }
  .rg-h1 { font-size:38px; font-weight:900; color:#fff; line-height:1.22; letter-spacing:-1px; margin-bottom:12px; text-shadow:0 2px 24px rgba(0,0,0,0.25); }
  .rg-grad { background:linear-gradient(90deg,#6ee7b7,#5eead4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .rg-p { font-size:15px; color:rgba(255,255,255,0.7); line-height:1.78; font-weight:400; max-width:370px; }
  .rg-steps { display:flex; flex-direction:column; gap:10px; animation:fadeUp 0.7s 0.28s cubic-bezier(0.22,1,0.36,1) both; }
  .rg-security {
    display:flex; align-items:center; gap:14px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);
    border-radius:14px; padding:14px 16px;
    animation:fadeUp 0.7s 0.4s cubic-bezier(0.22,1,0.36,1) both;
    backdrop-filter:blur(10px);
  }
  .rg-sec-title { font-size:13px; font-weight:700; color:#fff; margin-bottom:2px; }
  .rg-sec-sub   { font-size:11px; color:rgba(255,255,255,0.55); }

  .rg-right {
    flex:1 1 50%; position:relative; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    padding:40px 52px; background:#f1f5f9; min-height:100vh; order:1;
  }
  .rg-canvas { position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; }
  .rg-right-bg {
    position:absolute; inset:0; z-index:1; pointer-events:none;
    background:
      radial-gradient(ellipse at 70% 30%,rgba(99,102,241,0.07) 0%,transparent 65%),
      radial-gradient(ellipse at 30% 80%,rgba(20,184,166,0.05) 0%,transparent 55%);
  }
  .rg-form-wrap {
    position:relative; z-index:2;
    width:100%; max-width:420px;
    animation:fadeUp 0.7s 0.15s cubic-bezier(0.22,1,0.36,1) both;
  }

  @media (max-width:820px) {
    .rg-root  { flex-direction:column !important; }
    .rg-left  { order:1 !important; flex:none !important; min-height:unset !important; padding:32px 24px 28px !important; }
    .rg-right { order:2 !important; flex:1 !important; min-height:unset !important; padding:32px 24px 44px !important; }
    .rg-h1    { font-size:26px !important; }
    .rg-steps { gap:8px !important; }
    .rg-form-wrap { max-width:100% !important; }
    .rg-blob1 { width:260px !important; height:260px !important; top:-50px !important; right:-50px !important; }
    .rg-blob2 { width:220px !important; height:220px !important; }
  }
  @media (max-width:480px) {
    .rg-left  { padding:24px 16px 20px !important; }
    .rg-right { padding:24px 16px 36px !important; }
    .rg-h1    { font-size:22px !important; }
    .rg-logo-label { font-size:16px !important; }
    .rg-p     { font-size:13px !important; }
  }
`;

const fs = {
  head: { textAlign: "center", marginBottom: 24 },
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
    fontSize: 24,
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
    marginBottom: 16,
    animation: "errIn 0.3s ease both",
  },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  lbl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.7px",
    marginBottom: 8,
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
    padding: "13px 44px 13px 44px",
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
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
    backgroundSize: "200% 200%",
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
  sep: { display: "flex", alignItems: "center", gap: 10, margin: "20px 0 16px" },
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
  reg: { textAlign: "center", fontSize: 14, color: "#94a3b8", marginBottom: 0 },
  regLink: { color: "#4f46e5", fontWeight: 700, textDecoration: "none" },
};
