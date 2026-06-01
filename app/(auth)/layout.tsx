export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-alt)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
        {children}
      </div>
    </div>
  );
}
