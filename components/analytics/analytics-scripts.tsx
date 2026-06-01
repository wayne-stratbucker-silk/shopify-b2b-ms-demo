import Script from "next/script";

/**
 * Env-gated GTM / GA4 loader.
 *
 *   NEXT_PUBLIC_GTM_ID          (e.g. "GTM-XXXXXXX")   → inject GTM container
 *   NEXT_PUBLIC_GA4_MEASUREMENT_ID (e.g. "G-XXXXXXXXXX") → inject gtag.js
 *
 * Precedence: if a GTM id is set we inject GTM only (a marketer wires GA4 +
 * pixels inside the container — the recommended setup). If only a GA4 id is
 * set we inject gtag.js directly. If NEITHER is set this renders `null`, so
 * default / local builds carry no analytics and never error.
 *
 * The GTM <noscript> iframe must live immediately after <body>; the parent
 * layout renders <GtmNoScript /> there. The head loader is <AnalyticsScripts />.
 */

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export function AnalyticsScripts() {
  if (GTM_ID) {
    return (
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
    );
  }

  if (GA4_ID) {
    return (
      <>
        {/* `lazyOnload` defers gtag.js until the browser is idle (after load),
            keeping ~158KB of third-party JS (and its main-thread parse) off the
            critical path so FCP/LCP aren't charged for analytics. Early
            ecommerce events aren't lost: lib/analytics/data-layer.ts buffers
            into window.dataLayer via a gtag stub, and GA4 drains that queue when
            gtag.js finishes loading. */}
        <Script
          id="ga4-src"
          strategy="lazyOnload"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        />
        <Script id="ga4-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
        </Script>
      </>
    );
  }

  return null;
}

/**
 * GTM <noscript> fallback iframe. Render immediately after <body>. Only emits
 * when a GTM id is set (GA4-only / no-analytics builds render nothing).
 */
export function GtmNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}
