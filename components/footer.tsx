// The footer is now a single comprehensive Makeswift component
// (acme/footer-nav, see components/makeswift/footer-nav.tsx). It renders the
// whole <footer> shell — editable marketing text, brand copy, nav columns and
// legal links — while keeping the logo, copyright, dynamic contact and the
// subscribe form behaviour non-editable. The component is mounted via the
// global snapshot passed in as navSlot from each layout's FooterNavSlot.
export function Footer({ navSlot }: { navSlot?: React.ReactNode }) {
  return <>{navSlot}</>;
}
