/** Small inline spinner. Relies on the `sdSpin` keyframe defined by whichever page CSS uses it. */
export function Spin({ red, sm }) {
  return (
    <div
      style={{
        display: "inline-block",
        width: sm ? 12 : 15,
        height: sm ? 12 : 15,
        border: `2px solid ${red ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.3)"}`,
        borderTopColor: red ? "#ef4444" : "#fff",
        borderRadius: "50%",
        animation: "sdSpin 0.7s linear infinite",
      }}
    />
  );
}

export function Empty({ icon, title, sub, color }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <i className={icon} style={{ fontSize: 30, color }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}
