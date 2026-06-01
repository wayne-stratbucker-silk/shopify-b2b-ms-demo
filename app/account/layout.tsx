import { redirect } from "next/navigation";
import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { Header, type HeaderAccountInfo } from "@/components/header";
import { Footer } from "@/components/footer";
import { AccountNav } from "@/components/account-nav";
import { ToastProvider } from "@/components/ui/toast";
import { getSession } from "@/lib/auth/session";
import "@/components/makeswift/header-nav";
import "@/components/makeswift/footer-nav";

const HEADER_NAV_ID = "acme-b2b-header-nav";
const FOOTER_NAV_ID = "acme-b2b-footer-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account");

  const [headerSnap, footerSnap] = await Promise.all([
    client.getComponentSnapshot(HEADER_NAV_ID, { siteVersion: getSiteVersion() }).catch(() => null),
    client.getComponentSnapshot(FOOTER_NAV_ID, { siteVersion: getSiteVersion() }).catch(() => null),
  ]);

  const accountInfo: HeaderAccountInfo = {
    company: session.companyName ?? "",
    accountNumber: "",
    repName: "",
  };

  return (
    <ToastProvider>
      <Header accountInfo={accountInfo} />
      {headerSnap && <MakeswiftComponent snapshot={headerSnap} label="Header Navigation" type="acme/header-nav" />}
      <div className="container section">
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start" }}>
          <AccountNav />
          <main id="main-content">{children}</main>
        </div>
      </div>
      <Footer navSlot={footerSnap && <MakeswiftComponent snapshot={footerSnap} label="Footer Navigation" type="acme/footer-nav" />} />
    </ToastProvider>
  );
}
