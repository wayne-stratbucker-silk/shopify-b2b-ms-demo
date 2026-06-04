"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { QuoteCartLineItem } from "@/types/line-item";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Field({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", display: "block", marginBottom: 3 }}>
        {label}{required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function AddressForm({
  prefix,
  firstName, setFirstName,
  lastName, setLastName,
  company, setCompany,
  address, setAddress,
  apartment, setApartment,
  city, setCity,
  state, setState,
  zip, setZip,
  country, setCountry,
  phone, setPhone,
}: {
  prefix: string;
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  company: string; setCompany: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  apartment: string; setApartment: (v: string) => void;
  city: string; setCity: (v: string) => void;
  state: string; setState: (v: string) => void;
  zip: string; setZip: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}) {
  void prefix;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="form-grid-2" style={{ gap: 10 }}>
        <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Jane" />
        <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Smith" />
      </div>
      <Field label="Company (optional)" value={company} onChange={setCompany} placeholder="ACME Corp" />
      <Field label="Address line 1" value={address} onChange={setAddress} placeholder="123 Main St" />
      <Field label="Address line 2 (optional)" value={apartment} onChange={setApartment} placeholder="Suite 400" />
      <div className="form-grid-2" style={{ gap: 10 }}>
        <Field label="City" value={city} onChange={setCity} placeholder="San Francisco" />
        <Field label="State / Province" value={state} onChange={setState} placeholder="CA" />
      </div>
      <div className="form-grid-2" style={{ gap: 10 }}>
        <Field label="ZIP / Postal code" value={zip} onChange={setZip} placeholder="94105" />
        <Field label="Country" value={country} onChange={setCountry} placeholder="United States" />
      </div>
      <Field label="Phone (optional)" type="tel" value={phone} onChange={setPhone} placeholder="+1 (555) 000-0000" />
    </div>
  );
}

export function QuoteCartReview() {
  const router = useRouter();
  const [items, setItems] = useState<QuoteCartLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote info
  const [quoteTitle, setQuoteTitle] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Shipping address
  const [shipFirstName, setShipFirstName] = useState("");
  const [shipLastName, setShipLastName] = useState("");
  const [shipCompany, setShipCompany] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipApartment, setShipApartment] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [shipCountry, setShipCountry] = useState("");
  const [shipPhone, setShipPhone] = useState("");

  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Billing address
  const [billFirstName, setBillFirstName] = useState("");
  const [billLastName, setBillLastName] = useState("");
  const [billCompany, setBillCompany] = useState("");
  const [billAddress, setBillAddress] = useState("");
  const [billApartment, setBillApartment] = useState("");
  const [billCity, setBillCity] = useState("");
  const [billState, setBillState] = useState("");
  const [billZip, setBillZip] = useState("");
  const [billCountry, setBillCountry] = useState("");
  const [billPhone, setBillPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quotes/cart")
      .then((r) => r.json())
      .then((data: { items: QuoteCartLineItem[] }) => { setItems(data.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Persist an absolute quantity to the Shopify draft order so the change
  // survives submit and stays in sync with the floating quote-cart FAB.
  function persistQty(sku: string, quantity: number) {
    fetch("/api/quotes/cart/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity }),
    })
      .then(() => window.dispatchEvent(new Event("quoteCartUpdate")))
      .catch(() => {});
  }

  function setQty(sku: string, newQty: number) {
    if (newQty < 1) return;
    setItems((prev) => prev.map((item) => (item.sku === sku ? { ...item, quantity: newQty } : item)));
    persistQty(sku, newQty);
  }

  function handleQtyInput(sku: string, raw: string) {
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v > 0) setQty(sku, v);
  }

  async function removeItem(sku: string) {
    await fetch("/api/quotes/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    setItems((prev) => prev.filter((i) => i.sku !== sku));
    window.dispatchEvent(new Event("quoteCartUpdate"));
  }

  function buildAddress(
    firstName: string, lastName: string, company: string,
    address: string, apartment: string, city: string,
    state: string, zip: string, country: string, phone: string,
  ) {
    const a: Record<string, string> = {};
    if (firstName) a.firstName = firstName;
    if (lastName) a.lastName = lastName;
    if (company) a.companyName = company;
    if (address) a.address = address;
    if (apartment) a.apartment = apartment;
    if (city) a.city = city;
    if (state) a.state = state;
    if (zip) a.zipCode = zip;
    if (country) a.country = country;
    if (phone) a.phoneNumber = phone;
    return Object.keys(a).length > 0 ? a : undefined;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const shippingAddress = buildAddress(
      shipFirstName, shipLastName, shipCompany,
      shipAddress, shipApartment, shipCity, shipState, shipZip, shipCountry, shipPhone,
    );
    const billingAddress = sameAsBilling
      ? shippingAddress
      : buildAddress(
          billFirstName, billLastName, billCompany,
          billAddress, billApartment, billCity, billState, billZip, billCountry, billPhone,
        );

    try {
      const res = await fetch("/api/quotes/cart/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          quoteTitle: quoteTitle || undefined,
          notes: notes || undefined,
          referenceNumber: referenceNumber || undefined,
          phoneNumber: phoneNumber || undefined,
          shippingAddress,
          billingAddress,
        }),
      });
      const data = await res.json() as { quoteId?: string; error?: string };
      if (!res.ok || !data.quoteId) {
        setSubmitError(data.error ?? "Failed to submit quote");
        return;
      }
      window.dispatchEvent(new Event("quoteCartUpdate"));
      router.push(`/account/quotes/${encodeURIComponent(data.quoteId)}`);
    } catch {
      setSubmitError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
          Your quote cart is empty.
        </p>
        <Link href="/" className="btn btn-ghost">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 24 }}>

      {/* ── Products table ──
          `tbl-mobile-cards` plus per-cell col-* classes converts each row into
          a stacked card on mobile (≤768px). Column meanings:
            col-primary  — product name (top-left, full font weight)
            col-meta     — SKU below the name
            col-value    — unit price · qty stepper · line total (right side)
            col-action   — remove button (bottom row, spans full width)
            col-hide     — never shown on mobile (unit price duplicates total) */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit price</th>
              <th>Qty</th>
              <th className="num">Total</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sku}>
                <td className="col-primary" style={{ fontWeight: 500 }}>{item.name}</td>
                <td className="col-meta mono" style={{ fontSize: 12, color: "var(--muted)" }}>{item.sku}</td>
                <td className="col-hide">{fmt(item.unitPrice)}</td>
                <td className="col-value">
                  <div className="qty" style={{ display: "inline-flex" }}>
                    <button onClick={() => setQty(item.sku, item.quantity - 1)} aria-label="Decrease quantity" disabled={item.quantity <= 1}>
                      <Icon name="minus" size={13} />
                    </button>
                    <input
                      className="qty-input"
                      type="number" min={1} value={item.quantity}
                      onChange={(e) => handleQtyInput(item.sku, e.target.value)}
                      onFocus={(e) => { e.target.value = ""; }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (isNaN(v) || v < 1) { setQty(item.sku, 1); e.target.value = "1"; }
                      }}
                      aria-label="Quantity" style={{ width: 48 }}
                    />
                    <button onClick={() => setQty(item.sku, item.quantity + 1)} aria-label="Increase quantity">
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                </td>
                <td className="num col-hide">{fmt(item.unitPrice * item.quantity)}</td>
                <td className="col-action">
                  <button className="btn btn-ghost btn-xs" onClick={() => removeItem(item.sku)} aria-label={`Remove ${item.name}`} style={{ color: "var(--danger)" }}>
                    <Icon name="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Form + Summary ── */}
      <div className="layout-with-side">

        {/* LEFT: stacked form cards */}
        <div className="col" style={{ gap: 16 }}>

          {/* Quote details */}
          <div className="card col" style={{ gap: 14, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Quote details</div>
            <Field label="Quote title (optional)" value={quoteTitle} onChange={setQuoteTitle} placeholder="e.g. Q2 supply order" />
            <Field label="PO / reference number (optional)" value={referenceNumber} onChange={setReferenceNumber} placeholder="PO-12345" />
            <Field label="Phone (optional)" type="tel" value={phoneNumber} onChange={setPhoneNumber} placeholder="+1 (555) 000-0000" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", display: "block", marginBottom: 3 }}>
                Notes (optional)
              </label>
              <textarea
                className="input" rows={3} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for your rep…"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* Shipping address */}
          <div className="card col" style={{ gap: 14, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              <Icon name="truck" size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--primary)" }} />
              Shipping address
            </div>
            <AddressForm
              prefix="ship"
              firstName={shipFirstName} setFirstName={setShipFirstName}
              lastName={shipLastName} setLastName={setShipLastName}
              company={shipCompany} setCompany={setShipCompany}
              address={shipAddress} setAddress={setShipAddress}
              apartment={shipApartment} setApartment={setShipApartment}
              city={shipCity} setCity={setShipCity}
              state={shipState} setState={setShipState}
              zip={shipZip} setZip={setShipZip}
              country={shipCountry} setCountry={setShipCountry}
              phone={shipPhone} setPhone={setShipPhone}
            />
          </div>

          {/* Billing address */}
          <div className="card col" style={{ gap: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                <Icon name="card" size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--primary)" }} />
                Billing address
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Same as shipping</span>
              </label>
            </div>

            {sameAsBilling ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                Billing address will match shipping address.
              </p>
            ) : (
              <AddressForm
                prefix="bill"
                firstName={billFirstName} setFirstName={setBillFirstName}
                lastName={billLastName} setLastName={setBillLastName}
                company={billCompany} setCompany={setBillCompany}
                address={billAddress} setAddress={setBillAddress}
                apartment={billApartment} setApartment={setBillApartment}
                city={billCity} setCity={setBillCity}
                state={billState} setState={setBillState}
                zip={billZip} setZip={setBillZip}
                country={billCountry} setCountry={setBillCountry}
                phone={billPhone} setPhone={setBillPhone}
              />
            )}
          </div>
        </div>

        {/* RIGHT: order summary + submit */}
        <div className="card col" style={{ gap: 16, padding: 24, position: "sticky", top: 80 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Order summary</div>
          {/* Items are listed in the section above — the summary only shows the
              subtotal. */}
          <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--ink-2)" }}>
              Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "items"})
            </span>
            <span className="mono" style={{ fontWeight: 600, fontSize: 18 }}>{fmt(total)}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Final pricing subject to rep review.
          </p>

          {submitError && (
            <div style={{ fontSize: 12, color: "var(--danger)", padding: "8px 12px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)" }}>
              {submitError}
            </div>
          )}

          <button className="btn btn-lg btn-block" onClick={handleSubmit} disabled={submitting}>
            <Icon name="quote" size={16} />
            {submitting ? "Submitting…" : "Submit quote request"}
          </button>
          <Link href="/" style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", textDecoration: "none" }}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
