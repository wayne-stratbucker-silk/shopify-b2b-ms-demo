import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="auth-layout">
      {children}
    </main>
  );
}
