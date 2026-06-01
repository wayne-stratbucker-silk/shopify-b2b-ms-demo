// Canonical Address shape used across the storefront.
//
// Covers the union of fields used by:
//   - BigCommerce v3 customer addresses (snake_case wire format)
//   - B2B Edition company addresses
//   - Quote shipping/billing forms
//   - Display cards on /account/addresses
//
// Wire-format adapters live here too — `fromBCAddress` for the v3 customer
// addresses endpoint, `fromB2BAddress` for the B2B Edition company endpoint.

export type AddressKind = "residential" | "commercial";

export interface Address {
  // Local identifier — BC v3 customer address id, or B2B company address id.
  id?: number;

  // Owner — one of these will be set depending on which BC API created the row.
  customerEntityId?: number;
  companyEntityId?: number;

  // Display
  type?: AddressKind;
  isDefault?: boolean;
  label?: string;       // human-readable label e.g. "Main warehouse" (B2B only)

  // Contact
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;

  // Postal
  address1: string;
  address2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  countryCode?: string;
}

// ─── BC v3 customer addresses (snake_case) ──────────────────────────────────
// Endpoint: GET /v3/customers/addresses?customer_id:in={id}
// https://developer.bigcommerce.com/docs/rest-management/customers/customer-addresses

export interface BCCustomerAddressV3 {
  id: number;
  customer_id?: number;
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state_or_province: string;
  postal_code: string;
  country_code?: string;
  country?: string;
  phone?: string;
  address_type?: string; // "residential" | "commercial"
}

export function fromBCAddress(raw: BCCustomerAddressV3): Address {
  return {
    id: raw.id,
    customerEntityId: raw.customer_id,
    type: raw.address_type === "residential" ? "residential" : "commercial",
    firstName: raw.first_name ?? "",
    lastName: raw.last_name ?? "",
    company: raw.company ?? "",
    phone: raw.phone ?? "",
    address1: raw.address1 ?? "",
    address2: raw.address2 ?? "",
    city: raw.city ?? "",
    stateOrProvince: raw.state_or_province ?? "",
    postalCode: raw.postal_code ?? "",
    countryCode: raw.country_code ?? "",
  };
}

// ─── B2B Edition company addresses (camelCase) ──────────────────────────────
// Endpoint: GET /api/v3/io/companies/{companyId}/addresses

export interface B2BCompanyAddress {
  id: number;
  companyId?: number;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  phoneNumber?: string;
  label?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export function fromB2BAddress(raw: B2BCompanyAddress): Address {
  return {
    id: raw.id,
    companyEntityId: raw.companyId,
    label: raw.label,
    isDefault: Boolean(raw.isDefaultShipping || raw.isDefaultBilling),
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    company: raw.company ?? "",
    phone: raw.phoneNumber ?? "",
    address1: raw.addressLine1 ?? "",
    address2: raw.addressLine2 ?? "",
    city: raw.city ?? "",
    stateOrProvince: raw.state ?? "",
    postalCode: raw.zipCode ?? "",
    countryCode: raw.country ?? "",
  };
}
