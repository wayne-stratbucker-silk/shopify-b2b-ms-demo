import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { Header, type HeaderAccountInfo } from "@/components/header";
import { Footer } from "@/components/footer";
import { AccountNav } from "@/components/account-nav";
import { ToastProvider } from "@/components/ui/toast";
import { getSession, encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS, type Session } from "@/lib/auth/session";
import { getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import "@/components/makeswift/header-nav";
import "@/components/makeswift/footer-nav";

const HEADER_NAV_ID = "acme-b2b-header-nav";
const FOOTER_NAV_ID = "acme-b2b-footer-nav";

/**
 * If the session is missing company data or name looks like an email
 * (fallback from a failed OAuth callback Admin API lookup), re-fetch from
 * Shopify Admin API and update the session cookie in-place. The user never
 * needs to log out — the next page render will have full session data.
 */
async function refreshSessionIfNeeded(session: Session): Promise<Session> {
  const needsRefresh = !session.companyId || !session.companyName || session.name.includes("@");
  if (!needsRefresh) return session;

  try {
    const customer = await getCustomerWithCompany(session.customerId);
    if (!customer) return session;

    const fresh = buildSession(customer);
    // Preserve the existing session's customerId/email as source of truth
    // in case buildSession produces slightly different values, but always
    // take the Admin API's name and company fields.
    const merged: Session = {
      ...session,
      name: fresh.name || session.name,
      companyId: fresh.companyId ?? session.companyId,
      companyName: fresh.companyName ?? session.companyName,
      companyExternalId: fresh.companyExternalId ?? session.companyExternalId,
      companyLocationId: fresh.companyLocationId ?? session.companyLocationId,
      role: fresh.role,
      permissions: fresh.permissions,
    };

    const jar = await cookies();
    jar.set(SESSION_COOKIE, encodeSession(merged), SESSION_COOKIE_OPTS);
    console.info("[account/layout] session refreshed — company:", merged.companyName, "name:", merged.name);
    return merged;
  } catch (e) {
    console.warn("[account/layout] session refresh failed:", String(e));
    return session;
  }
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const rawSession = await getSession();
  if (!rawSession) redirect("/login?returnTo=/account");

  const session = await refreshSessionIfNeeded(rawSession);

  const [headerSnap, footerSnap] = await Promise.all([
    client.getComponentSnapshot(HEADER_NAV_ID, { siteVersion: getSiteVersion() }).catch(() => null),
    client.getComponentSnapshot(FOOTER_NAV_ID, { siteVersion: getSiteVersion() }).catch(() => null),
  ]);

  const accountInfo: HeaderAccountInfo = {
    company: session.companyName ?? "",
    accountNumber: session.companyExternalId ?? "",
    repName: "",
  };

  return (
    <ToastProvider>
      <Header accountInfo={accountInfo} />
      {headerSnap && <MakeswiftComponent snapshot={headerSnap} label="Header Navigation" type="acme/header-nav" />}
      <div className="container">
        <div className="account-shell">
          <AccountNav />
          <main id="main-content">{children}</main>
        </div>
      </div>
      <Footer navSlot={footerSnap && <MakeswiftComponent snapshot={footerSnap} label="Footer Navigation" type="acme/footer-nav" />} />
    </ToastProvider>
  );
}
