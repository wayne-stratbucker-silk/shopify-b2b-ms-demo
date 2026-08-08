"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icons";

// ─── Static reference data (no BC endpoint) ───────────────────────────────────

const COUNTRIES: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "MX", label: "Mexico" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "JP", label: "Japan" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
];

const CA_PROVINCES = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
];

const POSTAL_PATTERNS: Record<string, { pattern: RegExp; hint: string }> = {
  US: { pattern: /^\d{5}(-\d{4})?$/, hint: "5 digits (e.g. 90210)" },
  CA: { pattern: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, hint: "A1A 1A1 format" },
  GB: { pattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, hint: "e.g. SW1A 1AA" },
  AU: { pattern: /^\d{4}$/, hint: "4 digits" },
};

// Countries where postal code is required.
const POSTAL_REQUIRED = new Set(["US", "CA", "GB", "AU"]);

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// ─── Form model ───────────────────────────────────────────────────────────────

const BLANK_FORM = () => ({
  attn: "",
  first_name: "",
  last_name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state_or_province: "",
  postal_code: "",
  country_code: "US",
  phone: "",
  address_type: "commercial" as "residential" | "commercial",
});

type FormState = ReturnType<typeof BLANK_FORM>;
type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FormErrors {
  const e: FormErrors = {};
  if (!form.first_name.trim()) e.first_name = "Required";
  if (!form.last_name.trim()) e.last_name = "Required";
  if (!form.address1.trim()) e.address1 = "Required";
  if (!form.city.trim()) e.city = "Required";
  if (!form.country_code) e.country_code = "Required";

  const needsState = ["US", "CA", "AU"].includes(form.country_code);
  if (needsState && !form.state_or_province.trim()) {
    e.state_or_province = "Required for this country";
  }

  const postalTrimmed = form.postal_code.trim();
  if (POSTAL_REQUIRED.has(form.country_code) && !postalTrimmed) {
    e.postal_code = "Required";
  } else if (postalTrimmed) {
    const rule = POSTAL_PATTERNS[form.country_code];
    if (rule && !rule.pattern.test(postalTrimmed)) {
      e.postal_code = `Format: ${rule.hint}`;
    }
  }

  if (form.phone.length > 0 && form.phone.length < 10) {
    e.phone = "Phone must be at least 10 digits";
  }

  return e;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </span>
      {children}
      {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
    </label>
  );
}

// ─── Address form modal ───────────────────────────────────────────────────────

interface AddressFormModalProps {
  title: string;
  submitLabel: string;
  initialForm: FormState;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<string | null>; // returns error string or null
}

function AddressFormModal({
  title,
  submitLabel,
  initialForm,
  onClose,
  onSubmit,
}: AddressFormModalProps) {
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [form, setForm] = useState<FormState>(initialForm);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "country_code") next.state_or_province = "";
      if (touched[key]) setFieldErrors(validate(next));
      return next;
    });
  }

  function touch(key: keyof FormState) {
    setTouched((t) => ({ ...t, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, ...validate(form) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      Object.keys(form).map((k) => [k, true]),
    ) as typeof touched;
    setTouched(allTouched);
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitError("");
    setPending(true);
    try {
      const err = await onSubmit({ ...form, phone: formatPhone(form.phone) });
      if (err) setSubmitError(err);
      else onClose();
    } finally {
      setPending(false);
    }
  }

  const needsState = ["US", "CA", "AU"].includes(form.country_code);
  const stateOptions =
    form.country_code === "US" ? US_STATES : form.country_code === "CA" ? CA_PROVINCES : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{ "--modal-w": "520px", maxHeight: "90vh", overflowY: "auto" } as React.CSSProperties}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--muted)" }}>
          Saved to your personal account.
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-grid-2">
            <Field label="First name" required error={fieldErrors.first_name}>
              <input
                autoFocus
                type="text"
                className="input"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                onBlur={() => touch("first_name")}
                disabled={pending}
              />
            </Field>
            <Field label="Last name" required error={fieldErrors.last_name}>
              <input
                type="text"
                className="input"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                onBlur={() => touch("last_name")}
                disabled={pending}
              />
            </Field>
          </div>

          <Field label="Company">
            <input
              type="text"
              className="input"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              disabled={pending}
            />
          </Field>

          <Field label="ATTN">
            <input
              type="text"
              className="input"
              value={form.attn}
              onChange={(e) => set("attn", e.target.value)}
              disabled={pending}
              placeholder="Attention / care of"
            />
          </Field>

          <Field label="Country" required error={fieldErrors.country_code}>
            <select
              className="select"
              value={form.country_code}
              onChange={(e) => set("country_code", e.target.value)}
              onBlur={() => touch("country_code")}
              disabled={pending}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Address line 1" required error={fieldErrors.address1}>
            <input
              type="text"
              className="input"
              value={form.address1}
              onChange={(e) => set("address1", e.target.value)}
              onBlur={() => touch("address1")}
              disabled={pending}
            />
          </Field>

          <Field label="Address line 2">
            <input
              type="text"
              className="input"
              value={form.address2}
              onChange={(e) => set("address2", e.target.value)}
              disabled={pending}
            />
          </Field>

          <div className="form-grid-2">
            <Field label="City" required error={fieldErrors.city}>
              <input
                type="text"
                className="input"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                onBlur={() => touch("city")}
                disabled={pending}
              />
            </Field>
            <Field
              label="State / Province"
              required={needsState}
              error={fieldErrors.state_or_province}
            >
              {stateOptions ? (
                <select
                  className="select"
                  value={form.state_or_province}
                  onChange={(e) => set("state_or_province", e.target.value)}
                  onBlur={() => touch("state_or_province")}
                  disabled={pending}
                >
                  <option value="">Select…</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input"
                  value={form.state_or_province}
                  onChange={(e) => set("state_or_province", e.target.value)}
                  onBlur={() => touch("state_or_province")}
                  disabled={pending}
                />
              )}
            </Field>
          </div>

          <div className="form-grid-2">
            <Field
              label="ZIP / Postal code"
              required={POSTAL_REQUIRED.has(form.country_code)}
              error={fieldErrors.postal_code}
            >
              <input
                type="text"
                className="input"
                value={form.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                onBlur={() => touch("postal_code")}
                placeholder={POSTAL_PATTERNS[form.country_code]?.hint}
                disabled={pending}
              />
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              <input
                type="tel"
                className="input"
                value={formatPhone(form.phone)}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => touch("phone")}
                placeholder="(555) 555-5555"
                disabled={pending}
              />
            </Field>
          </div>

          <Field label="Address type" error={fieldErrors.address_type}>
            <div style={{ display: "flex", gap: 12 }}>
              {(["commercial", "residential"] as const).map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 400,
                  }}
                >
                  <input
                    type="radio"
                    name="address_type"
                    value={type}
                    checked={form.address_type === type}
                    onChange={() => set("address_type", type)}
                    disabled={pending}
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </Field>

          {submitError && (
            <div className="alert alert-err" style={{ fontSize: 12 }}>
              {submitError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Existing-address card display + remove ───────────────────────────────────

interface CustomerAddress {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

export function AddressesClient() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  // Two-step delete: id awaiting confirmation, and id currently being removed.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string>("");

  function loadAddresses() {
    return fetch("/api/addresses")
      .then((r) => r.json() as Promise<CustomerAddress[]>)
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]));
  }

  useEffect(() => {
    loadAddresses().finally(() => setLoading(false));
  }, []);

  async function handleAdd(form: FormState): Promise<string | null> {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.first_name,
        lastName: form.last_name,
        company: form.company,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        province: form.state_or_province,
        zip: form.postal_code,
        country: form.country_code,
        phone: form.phone,
      }),
    });
    const data = (await res.json()) as { error?: string; ok?: boolean; id?: string };
    if (!res.ok) return data.error ?? "Failed to add address";
    await loadAddresses();
    return null;
  }

  async function handleRemove(addressId: string) {
    setRemovingId(addressId);
    setRowError("");
    try {
      const res = await fetch(`/api/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setRowError(d.error ?? "Failed to remove address");
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      setConfirmId(null);
    } catch {
      setRowError("Network error — please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div className="page-h">
        <div>
          <h1>My addresses</h1>
          <p className="sub">Personal addresses saved to your account.</p>
        </div>
        <button className="btn btn-sm" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={14} />
          Add address
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ fontSize: 13 }}>Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No saved addresses. Add one above to speed up checkout.
        </div>
      ) : (
        <div className="g3 addr-grid">
          {addresses.map((addr) => {
            const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
            const cityLine = [addr.city, addr.province, addr.zip].filter(Boolean).join(", ");
            const isConfirming = confirmId === addr.id;
            return (
              <div key={addr.id} className="card">
                <div className="card-h">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{name || "Address"}</span>
                </div>
                <div className="card-b">
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
                    {addr.company && <div>{addr.company}</div>}
                    {addr.address1 && <div>{addr.address1}</div>}
                    {addr.address2 && <div>{addr.address2}</div>}
                    {cityLine && <div>{cityLine}</div>}
                    {addr.country && <div>{addr.country}</div>}
                    {addr.phone && (
                      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{addr.phone}</div>
                    )}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {isConfirming ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          className="btn btn-xs"
                          style={{ background: "var(--danger)", color: "#fff", border: "none" }}
                          onClick={() => handleRemove(addr.id)}
                          disabled={removingId === addr.id}
                        >
                          {removingId === addr.id ? "Removing…" : "Confirm remove"}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => { setConfirmId(null); setRowError(""); }}
                          disabled={removingId === addr.id}
                        >
                          Cancel
                        </button>
                        {rowError && (
                          <span style={{ fontSize: 11, color: "var(--danger)" }}>{rowError}</span>
                        )}
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ color: "var(--danger)" }}
                        onClick={() => { setConfirmId(addr.id); setRowError(""); }}
                      >
                        <Icon name="trash" size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddressFormModal
          title="Add address"
          submitLabel="Save address"
          initialForm={BLANK_FORM()}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}
