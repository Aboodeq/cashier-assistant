import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Dashboard() {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Tajawal, sans-serif",
        gap: "20px",
      }}
    >
      <h1 style={{ fontSize: "28px", color: "#1a56db" }}>مرحباً بك في مساعد الصندوق ✅</h1>
      <p style={{ color: "#6b7280" }}>تم تسجيل الدخول بنجاح</p>
      <button
        onClick={handleLogout}
        style={{
          padding: "10px 24px",
          backgroundColor: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "15px",
          cursor: "pointer",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
