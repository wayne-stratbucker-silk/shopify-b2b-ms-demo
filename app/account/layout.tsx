import { redirect } from "next/navigation";
import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { Header, type HeaderAccountInfo } from "@/components/header";
import { Footer } from "@/components/footer";
import { AccountNav } from "@/components/account-nav";
import { ToastProvider } from "@/components/ui/toast";
import { QuoteCartFab } from "@/components/quote-cart-fab";
import { getSession } from "@/lib/auth/session";
import { SessionRefresher } from "./session-refresher";
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
    accountNumber: session.companyExternalId ?? "",
    repName: "",
  };

  // Trigger a silent session refresh if company/name data is missing.
  // SessionRefresher calls POST /api/auth/refresh-session on mount (client-side),
  // sets the updated cookie via that Route Handler, then calls router.refresh()
  // so all Server Components re-render with the corrected session.
  const needsRefresh = !session.companyId || !session.companyName || session.name.includes("@");

  return (
    <ToastProvider>
      <SessionRefresher needsRefresh={needsRefresh} />
      <Header accountInfo={accountInfo} />
      {headerSnap && <MakeswiftComponent snapshot={headerSnap} label="Header Navigation" type="acme/header-nav" />}
      <div className="container">
        <div className="account-shell">
          <AccountNav />
          <main id="main-content">{children}</main>
        </div>
      </div>
      <Footer navSlot={footerSnap && <MakeswiftComponent snapshot={footerSnap} label="Footer Navigation" type="acme/footer-nav" />} />
      <QuoteCartFab />
    </ToastProvider>
  );
}
