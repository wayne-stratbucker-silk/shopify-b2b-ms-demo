import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { Header, type HeaderAccountInfo } from "@/components/header";
import { Footer } from "@/components/footer";
import { ToastProvider } from "@/components/ui/toast";
import { QuoteCartFab } from "@/components/quote-cart-fab";
import { getSession } from "@/lib/auth/session";
import "@/components/makeswift/register";

const HEADER_NAV_ID = "acme-b2b-header-nav";
const FOOTER_NAV_ID = "acme-b2b-footer-nav";

async function HeaderNavSlot() {
  const snapshot = await client.getComponentSnapshot(HEADER_NAV_ID, { siteVersion: getSiteVersion() });
  return <MakeswiftComponent snapshot={snapshot} label="Header Navigation" type="acme/header-nav" />;
}

async function FooterNavSlot() {
  const snapshot = await client.getComponentSnapshot(FOOTER_NAV_ID, { siteVersion: getSiteVersion() });
  return <MakeswiftComponent snapshot={snapshot} label="Footer Navigation" type="acme/footer-nav" />;
}

async function getHeaderAccountInfo(): Promise<HeaderAccountInfo | null> {
  const session = await getSession();
  if (!session) return null;
  if (!session.companyName) return null;
  return { company: session.companyName, accountNumber: "", repName: "" };
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [accountInfo, headerNavSlot, footerNavSlot] = await Promise.all([
    getHeaderAccountInfo(),
    HeaderNavSlot(),
    FooterNavSlot(),
  ]);

  return (
    <ToastProvider>
      <Header accountInfo={accountInfo} />
      {headerNavSlot}
      <main id="main-content">{children}</main>
      <Footer navSlot={footerNavSlot} />
      <QuoteCartFab />
    </ToastProvider>
  );
}
