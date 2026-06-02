// Central Makeswift component registry.
//
// Importing this module runs every component's `runtime.registerComponent`
// side effect, so the Makeswift `<Page>` / `<MakeswiftComponent>` renderers can
// resolve any component a builder-authored page references.
//
// This barrel is imported from the storefront layout and the catch-all page
// route — the places where arbitrary Makeswift Pages render — rather than from
// the root layout. Keeping it out of `app/layout.tsx` means non-storefront
// route groups (auth, account) don't bundle the full component graph; those
// routes register only the specific components they render (e.g. the auth
// marketing panel, header/footer nav).
import "@/components/makeswift/hero-banner";
import "@/components/makeswift/product-carousel";
import "@/components/makeswift/promo-banner";
import "@/components/makeswift/category-grid";
import "@/components/makeswift/value-strip";
import "@/components/makeswift/brand-strip";
import "@/components/makeswift/quick-order-strip";
import "@/components/makeswift/vertical-spacer";
import "@/components/makeswift/search-phrases";
import "@/components/makeswift/shoppable-diagram";
import "@/components/makeswift/side-by-side";
import "@/components/makeswift/content-widget";
import "@/components/makeswift/header-nav";
import "@/components/makeswift/footer-nav";
import "@/components/makeswift/nav-ad";
import "@/components/makeswift/full-banner";
import "@/components/makeswift/countdown-banner";
import "@/components/makeswift/testimonial-widget";
import "@/components/makeswift/rich-document";
import "@/components/makeswift/plp-interstitial";
import "@/components/makeswift/not-found-page";
