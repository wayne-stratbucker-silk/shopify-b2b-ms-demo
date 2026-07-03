import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { Header, type HeaderAccountInfo } from "@/components/header";
import { Footer } from "@/components/footer";
import { ToastProvider } from "@/components/ui/toast";
import { QuoteCartFab } from "@/components/quote-cart-fab";
import { CompareProvider } from "@/components/compare/compare-provider";
import { CompareBar } from "@/components/compare/compare-bar";
import { StaffMasqueradeBanner } from "@/components/staff/masquerade-banner";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
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
  const [accountInfo, headerNavSlot, footerNavSlot, jar] = await Promise.all([
    getHeaderAccountInfo(),
    HeaderNavSlot(),
    FooterNavSlot(),
    cookies(),
  ]);
  const cookieLocale = jar.get(LOCALE_COOKIE)?.value;
  const initialLocale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ToastProvider>
        <CompareProvider>
          <StaffMasqueradeBanner />
          <Header accountInfo={accountInfo} />
          {headerNavSlot}
          <main id="main-content">{children}</main>
          <Footer navSlot={footerNavSlot} />
          <QuoteCartFab />
          <CompareBar />
        </CompareProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
