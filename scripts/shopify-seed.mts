/**
 * Shopify B2B Store Seeding Script
 *
 * Seeds headless-b2b-demo.myshopify.com with:
 * - 25 electrical/lighting products with variants and metafields
 * - 6 collections (categories)
 * - 3 B2B companies with contacts and locations
 * - 3 price lists (one per company)
 * - 3 catalogs assigned to companies
 *
 * Run: npx tsx scripts/shopify-seed.mts
 */

import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "headless-b2b-demo.myshopify.com";
const ADMIN_TOKEN = await getAdminToken();
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

if (!ADMIN_TOKEN) {
  console.error("❌ SHOPIFY_ADMIN_API_TOKEN is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Step 1: Create Collections ─────────────────────────────────────────────
const COLLECTIONS = [
  { title: "Wire & Cable", description: "Commercial electrical wire and cable", handle: "wire-cable" },
  { title: "Breakers & Panels", description: "Circuit breakers and electrical panels", handle: "breakers-panels" },
  { title: "Conduit & Fittings", description: "Electrical conduit, fittings, and accessories", handle: "conduit-fittings" },
  { title: "Lighting Fixtures", description: "Commercial and industrial lighting fixtures", handle: "lighting-fixtures" },
  { title: "Switches & Receptacles", description: "Commercial wiring devices", handle: "switches-receptacles" },
  { title: "Tools & Safety", description: "Electrical tools and safety equipment", handle: "tools-safety" },
];

async function createCollections(): Promise<Record<string, string>> {
  console.log("\n📂 Creating collections...");
  const handles: Record<string, string> = {};

  for (const col of COLLECTIONS) {
    const data = await graphql<{ collectionCreate: { collection: { id: string; handle: string } | null; userErrors: Array<{ message: string }> } }>(
      `mutation CollectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection { id handle }
          userErrors { message }
        }
      }`,
      { input: { title: col.title, descriptionHtml: col.description } }
    );
    if (data.collectionCreate.collection) {
      handles[col.handle] = data.collectionCreate.collection.id;
      console.log(`  ✓ Collection: ${col.title}`);
    } else {
      console.warn(`  ⚠ ${col.title}: ${data.collectionCreate.userErrors.map(e => e.message).join(", ")}`);
    }
    await sleep(500);
  }
  return handles;
}

// ─── Step 2: Create Products ─────────────────────────────────────────────────
const PRODUCTS = [
  // Wire & Cable
  { title: "THHN 12 AWG Solid Wire", vendor: "Southwire", collection: "wire-cable", sku: "THHN-12SOL", price: "0.89", uom: "FT", variants: [
    { title: "250 ft", sku: "THHN-12SOL-250", price: "189.00", compareAtPrice: "215.00" },
    { title: "500 ft", sku: "THHN-12SOL-500", price: "359.00", compareAtPrice: "410.00" },
    { title: "1000 ft", sku: "THHN-12SOL-1000", price: "679.00", compareAtPrice: "775.00" },
  ]},
  { title: "THHN 14 AWG Solid Wire", vendor: "Southwire", collection: "wire-cable", sku: "THHN-14SOL", price: "0.62", uom: "FT", variants: [
    { title: "250 ft", sku: "THHN-14SOL-250", price: "135.00" },
    { title: "500 ft", sku: "THHN-14SOL-500", price: "255.00" },
  ]},
  { title: "THHN 10 AWG Stranded Wire", vendor: "Southwire", collection: "wire-cable", sku: "THHN-10STR", price: "1.45", uom: "FT", variants: [
    { title: "250 ft", sku: "THHN-10STR-250", price: "299.00" },
    { title: "500 ft", sku: "THHN-10STR-500", price: "575.00" },
  ]},
  { title: "12/2 NM-B Romex Cable", vendor: "Southwire", collection: "wire-cable", sku: "NMB-12-2", price: "1.20", uom: "FT", variants: [
    { title: "250 ft", sku: "NMB-12-2-250", price: "265.00", compareAtPrice: "310.00" },
    { title: "1000 ft", sku: "NMB-12-2-1000", price: "995.00" },
  ]},
  { title: "14/2 NM-B Romex Cable", vendor: "Southwire", collection: "wire-cable", sku: "NMB-14-2", price: "0.85", uom: "FT", variants: [
    { title: "250 ft", sku: "NMB-14-2-250", price: "185.00" },
    { title: "1000 ft", sku: "NMB-14-2-1000", price: "699.00" },
  ]},

  // Breakers & Panels
  { title: "20A Single Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "BRKR-1P-20A", price: "12.50", uom: "EA", variants: [
    { title: "Standard", sku: "BRKR-1P-20A-STD", price: "12.50" },
    { title: "AFCI", sku: "BRKR-1P-20A-AFCI", price: "34.00" },
    { title: "GFCI", sku: "BRKR-1P-20A-GFCI", price: "42.00" },
  ]},
  { title: "30A Double Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "BRKR-2P-30A", price: "19.75", uom: "EA", variants: [
    { title: "Standard", sku: "BRKR-2P-30A-STD", price: "19.75" },
  ]},
  { title: "200A Main Breaker Load Center 40-Circuit", vendor: "Square D", collection: "breakers-panels", sku: "PANEL-200A-40C", price: "425.00", uom: "EA", variants: [
    { title: "Main Breaker", sku: "PANEL-200A-40C-MB", price: "425.00", compareAtPrice: "495.00" },
    { title: "Main Lug Only", sku: "PANEL-200A-40C-MLO", price: "385.00" },
  ]},
  { title: "100A Main Breaker Load Center 24-Circuit", vendor: "Eaton", collection: "breakers-panels", sku: "PANEL-100A-24C", price: "225.00", uom: "EA", variants: [
    { title: "Standard", sku: "PANEL-100A-24C-STD", price: "225.00" },
  ]},

  // Conduit & Fittings
  { title: "1/2 inch EMT Conduit 10ft", vendor: "Allied Tube", collection: "conduit-fittings", sku: "EMT-50-10FT", price: "4.25", uom: "EA", variants: [
    { title: "10 ft stick", sku: "EMT-50-10FT-EA", price: "4.25" },
    { title: "Box of 50", sku: "EMT-50-10FT-50PK", price: "195.00", compareAtPrice: "212.50" },
  ]},
  { title: "3/4 inch EMT Conduit 10ft", vendor: "Allied Tube", collection: "conduit-fittings", sku: "EMT-75-10FT", price: "6.80", uom: "EA", variants: [
    { title: "10 ft stick", sku: "EMT-75-10FT-EA", price: "6.80" },
    { title: "Box of 25", sku: "EMT-75-10FT-25PK", price: "162.00" },
  ]},
  { title: "1/2 inch EMT Set Screw Connector", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "EMT-CON-50-SS", price: "0.65", uom: "EA", variants: [
    { title: "Each", sku: "EMT-CON-50-SS-EA", price: "0.65" },
    { title: "Bag of 25", sku: "EMT-CON-50-SS-25PK", price: "13.50" },
    { title: "Box of 100", sku: "EMT-CON-50-SS-100PK", price: "49.00" },
  ]},

  // Lighting Fixtures
  { title: "4ft LED Shop Light 5000K 4400lm", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "SHOP-LED-4FT-44", price: "49.00", uom: "EA", variants: [
    { title: "Single", sku: "SHOP-LED-4FT-44-EA", price: "49.00", compareAtPrice: "62.00" },
    { title: "6-Pack", sku: "SHOP-LED-4FT-44-6PK", price: "279.00" },
  ]},
  { title: "8ft LED High Bay Light 200W", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "HB-LED-200W", price: "189.00", uom: "EA", variants: [
    { title: "200W / 5000K", sku: "HB-LED-200W-50K", price: "189.00" },
    { title: "150W / 5000K", sku: "HB-LED-150W-50K", price: "159.00" },
    { title: "100W / 5000K", sku: "HB-LED-100W-50K", price: "129.00" },
  ]},
  { title: "2x4 LED Troffer 40W Recessed", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "TROF-LED-2X4-40", price: "65.00", uom: "EA", variants: [
    { title: "4000K", sku: "TROF-LED-2X4-40-4K", price: "65.00" },
    { title: "5000K", sku: "TROF-LED-2X4-40-5K", price: "65.00" },
    { title: "3500K", sku: "TROF-LED-2X4-40-35K", price: "65.00" },
  ]},
  { title: "Outdoor LED Area Light 150W", vendor: "Acuity Brands", collection: "lighting-fixtures", sku: "AREA-LED-150W", price: "245.00", uom: "EA", variants: [
    { title: "150W Bronze", sku: "AREA-LED-150W-BRZ", price: "245.00" },
    { title: "150W Black", sku: "AREA-LED-150W-BLK", price: "245.00" },
  ]},

  // Switches & Receptacles
  { title: "20A Commercial Receptacle (10-Pack)", vendor: "Leviton", collection: "switches-receptacles", sku: "RCPT-20A-10PK", price: "24.50", uom: "PK", variants: [
    { title: "White 10-Pack", sku: "RCPT-20A-10PK-WH", price: "24.50" },
    { title: "Gray 10-Pack", sku: "RCPT-20A-10PK-GR", price: "24.50" },
    { title: "Ivory 10-Pack", sku: "RCPT-20A-10PK-IV", price: "24.50" },
  ]},
  { title: "20A GFCI Receptacle with LED", vendor: "Leviton", collection: "switches-receptacles", sku: "GFCI-20A-LED", price: "18.75", uom: "EA", variants: [
    { title: "White", sku: "GFCI-20A-LED-WH", price: "18.75" },
    { title: "Gray", sku: "GFCI-20A-LED-GR", price: "18.75" },
  ]},
  { title: "Single Pole 15A Switch (10-Pack)", vendor: "Leviton", collection: "switches-receptacles", sku: "SW-1P-15A-10PK", price: "19.00", uom: "PK", variants: [
    { title: "White 10-Pack", sku: "SW-1P-15A-10PK-WH", price: "19.00" },
  ]},
  { title: "Decora 3-Way Switch Commercial Grade", vendor: "Leviton", collection: "switches-receptacles", sku: "SW-3WAY-DEC", price: "12.25", uom: "EA", variants: [
    { title: "White", sku: "SW-3WAY-DEC-WH", price: "12.25" },
    { title: "Gray", sku: "SW-3WAY-DEC-GR", price: "12.25" },
  ]},

  // Tools & Safety
  { title: "Ideal 1000V Insulated Screwdriver Set 6-Piece", vendor: "Ideal Industries", collection: "tools-safety", sku: "TOOL-SCREW-1000V-6", price: "89.00", uom: "SET", variants: [
    { title: "6-Piece Set", sku: "TOOL-SCREW-1000V-6-EA", price: "89.00", compareAtPrice: "109.00" },
  ]},
  { title: "ANSI Class 2 Safety Vest", vendor: "PIP", collection: "tools-safety", sku: "SAFE-VEST-CL2", price: "8.50", uom: "EA", variants: [
    { title: "M/L", sku: "SAFE-VEST-CL2-ML", price: "8.50" },
    { title: "XL/2XL", sku: "SAFE-VEST-CL2-XL", price: "8.50" },
    { title: "3XL+", sku: "SAFE-VEST-CL2-3XL", price: "9.50" },
  ]},
  { title: "Electrician Hard Hat ANSI E", vendor: "MSA Safety", collection: "tools-safety", sku: "SAFE-HHAT-ANSI-E", price: "24.00", uom: "EA", variants: [
    { title: "White", sku: "SAFE-HHAT-ANSI-E-WH", price: "24.00" },
    { title: "Yellow", sku: "SAFE-HHAT-ANSI-E-YL", price: "24.00" },
    { title: "Orange", sku: "SAFE-HHAT-ANSI-E-OR", price: "24.00" },
  ]},
  { title: "Non-Contact Voltage Tester", vendor: "Klein Tools", collection: "tools-safety", sku: "TOOL-NCV-TESTER", price: "19.99", uom: "EA", variants: [
    { title: "Standard", sku: "TOOL-NCV-TESTER-STD", price: "19.99" },
    { title: "Premium with LCD", sku: "TOOL-NCV-TESTER-LCD", price: "34.99" },
  ]},
];

async function getDefaultLocationId(): Promise<string> {
  const data = await graphql<{ locations: { edges: Array<{ node: { id: string } }> } }>(
    `query { locations(first: 1) { edges { node { id } } } }`
  );
  const id = data.locations.edges[0]?.node.id ?? "";
  if (id) console.log(`  Location: ${id}`);
  return id;
}

async function createProducts(collectionIds: Record<string, string>): Promise<string[]> {
  console.log("\n📦 Creating products...");
  const productIds: string[] = [];
  const locationId = await getDefaultLocationId();

  for (const product of PRODUCTS) {
    const firstVariant = product.variants[0];

    // Step 1: Create product — variants NOT in ProductInput in 2026-07
    const data = await graphql<{
      productCreate: {
        product: {
          id: string;
          handle: string;
          variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> };
        } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(
      `mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id handle
            variants(first: 1) { edges { node { id inventoryItem { id } } } }
          }
          userErrors { field message }
        }
      }`,
      {
        input: {
          title: product.title,
          vendor: product.vendor,
          productType: COLLECTIONS.find(c => c.handle === product.collection)?.title ?? "",
          tags: [product.collection, "b2b-demo"],
          status: "ACTIVE",
          metafields: [
            { namespace: "custom", key: "uom", value: product.uom, type: "single_line_text_field" },
          ],
        },
      }
    );

    if (!data.productCreate.product) {
      console.warn(`  ⚠ ${product.title}: ${data.productCreate.userErrors.map(e => e.message).join(", ")}`);
      await sleep(500);
      continue;
    }

    const productId = data.productCreate.product.id;
    const defaultVariant = data.productCreate.product.variants.edges[0]?.node;
    productIds.push(productId);

    // Step 2: Update the auto-created default variant with first SKU/price
    if (defaultVariant && firstVariant) {
      await graphql(
        `mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id }
            userErrors { message }
          }
        }`,
        {
          productId,
          variants: [{
            id: defaultVariant.id,
            sku: firstVariant.sku,
            price: firstVariant.price,
            compareAtPrice: (firstVariant as { compareAtPrice?: string }).compareAtPrice ?? null,
            inventoryItem: { tracked: true },
          }],
        }
      ).catch(e => console.warn(`  ⚠ Variant update ${product.title}: ${e.message}`));

      // Step 3: Set inventory quantity via inventoryAdjustQuantities
      if (locationId && defaultVariant.inventoryItem?.id) {
        await graphql(
          `mutation AdjustInventory($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              userErrors { message }
            }
          }`,
          {
            input: {
              reason: "correction",
              name: "available",
              changes: [{
                delta: 150,
                inventoryItemId: defaultVariant.inventoryItem.id,
                locationId,
              }],
            },
          }
        ).catch(() => {/* inventory optional for demo */});
      }
    }

    // Step 4: Add to collection
    const colId = collectionIds[product.collection];
    if (colId) {
      await graphql(
        `mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            userErrors { message }
          }
        }`,
        { id: colId, productIds: [productId] }
      ).catch(e => console.warn(`  ⚠ Collection assign: ${e.message}`));
    }

    console.log(`  ✓ ${product.title} (SKU: ${firstVariant?.sku ?? product.sku})`);
    await sleep(300);
  }

  return productIds;
}

// ─── Step 3: Create B2B Companies ────────────────────────────────────────────
const COMPANIES = [
  {
    name: "Acme Electric Supply",
    externalId: "acme-001",
    contacts: [
      { firstName: "Alice", lastName: "Admin", email: "admin@acme-electric.com", phone: "+13125550100", isAdmin: true },
      { firstName: "Bob", lastName: "Buyer", email: "buyer@acme-electric.com", phone: "+13125550101", isAdmin: false },
    ],
    locations: [
      {
        name: "Headquarters — Chicago",
        address: { address1: "100 Industrial Blvd", city: "Chicago", zoneCode: "IL", countryCode: "US", zip: "60601" },
      },
      {
        name: "Branch — Milwaukee",
        address: { address1: "500 Commerce St", city: "Milwaukee", zoneCode: "WI", countryCode: "US", zip: "53202" },
      },
    ],
    discount: 20,
  },
  {
    name: "Metro Contractors LLC",
    externalId: "metro-001",
    contacts: [
      { firstName: "Carlos", lastName: "Manager", email: "admin@metro-contractors.com", phone: "+12145550200", isAdmin: true },
    ],
    locations: [
      {
        name: "Main Office — Dallas",
        address: { address1: "2200 Commerce Pkwy", city: "Dallas", zoneCode: "TX", countryCode: "US", zip: "75201" },
      },
      {
        name: "Branch — Fort Worth",
        address: { address1: "800 Industrial Dr", city: "Fort Worth", zoneCode: "TX", countryCode: "US", zip: "76102" },
      },
    ],
    discount: 15,
  },
  {
    name: "Pacific Installations Inc",
    externalId: "pacific-001",
    contacts: [
      { firstName: "Dana", lastName: "Director", email: "admin@pacific-install.com", phone: "+12065550300", isAdmin: true },
      { firstName: "Eve", lastName: "Purchaser", email: "buyer@pacific-install.com", phone: "+12065550301", isAdmin: false },
    ],
    locations: [
      {
        name: "HQ — Seattle",
        address: { address1: "1400 Harbor Ave", city: "Seattle", zoneCode: "WA", countryCode: "US", zip: "98101" },
      },
    ],
    discount: 10,
  },
];

async function createCompanies(): Promise<Array<{ companyId: string; locationIds: string[]; name: string; discount: number }>> {
  console.log("\n🏢 Creating B2B companies...");
  const results = [];

  for (const company of COMPANIES) {
    const firstContact = company.contacts[0]!;
    const firstLocation = company.locations[0]!;

    const data = await graphql<{
      companyCreate: {
        company: { id: string; locations: { edges: Array<{ node: { id: string } }> } } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CompanyCreate($input: CompanyCreateInput!) {
        companyCreate(input: $input) {
          company {
            id
            locations(first: 1) { edges { node { id } } }
          }
          userErrors { field message }
        }
      }`,
      {
        input: {
          company: {
            name: company.name,
            externalId: company.externalId,
            note: "Seeded by shopify-seed.mts",
          },
          companyLocation: {
            name: firstLocation.name,
            shippingAddress: firstLocation.address,
            billingSameAsShipping: true,
          },
          companyContact: {
            firstName: firstContact.firstName,
            lastName: firstContact.lastName,
            email: firstContact.email,
            phone: firstContact.phone,
          },
        },
      }
    );

    if (!data.companyCreate.company) {
      console.warn(`  ⚠ ${company.name}: ${data.companyCreate.userErrors.map(e => e.message).join(", ")}`);
      await sleep(500);
      continue;
    }

    const companyId = data.companyCreate.company.id;
    const locationIds = [data.companyCreate.company.locations.edges[0]?.node.id ?? ""];

    console.log(`  ✓ Company: ${company.name}`);

    // Add additional locations
    for (let i = 1; i < company.locations.length; i++) {
      const loc = company.locations[i]!;
      const locData = await graphql<{
        companyLocationCreate: {
          companyLocation: { id: string } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation CompanyLocationCreate($companyId: ID!, $input: CompanyLocationInput!) {
          companyLocationCreate(companyId: $companyId, input: $input) {
            companyLocation { id }
            userErrors { message }
          }
        }`,
        {
          companyId,
          input: {
            name: loc.name,
            shippingAddress: loc.address,
            billingSameAsShipping: true,
          },
        }
      );
      if (locData.companyLocationCreate.companyLocation) {
        locationIds.push(locData.companyLocationCreate.companyLocation.id);
        console.log(`    + Location: ${loc.name}`);
      }
      await sleep(300);
    }

    // Add additional contacts
    for (let i = 1; i < company.contacts.length; i++) {
      const contact = company.contacts[i]!;
      await graphql(
        `mutation CompanyContactCreate($companyId: ID!, $input: CompanyContactInput!) {
          companyContactCreate(companyId: $companyId, input: $input) {
            companyContact { id }
            userErrors { message }
          }
        }`,
        {
          companyId,
          input: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
          },
        }
      ).catch(e => console.warn(`    ⚠ Contact ${contact.email}: ${e.message}`));
      console.log(`    + Contact: ${contact.firstName} ${contact.lastName} (${contact.isAdmin ? "admin" : "buyer"})`);
      await sleep(300);
    }

    results.push({ companyId, locationIds, name: company.name, discount: company.discount });
    await sleep(500);
  }

  return results;
}

// ─── Step 4: Create Price Lists & Catalogs ───────────────────────────────────
async function createPriceListsAndCatalogs(
  companies: Array<{ companyId: string; locationIds: string[]; name: string; discount: number }>
): Promise<void> {
  console.log("\n💰 Creating price lists and catalogs...");

  for (const company of companies) {
    // Create price list
    const plData = await graphql<{
      priceListCreate: {
        priceList: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation PriceListCreate($input: PriceListCreateInput!) {
        priceListCreate(input: $input) {
          priceList { id }
          userErrors { message }
        }
      }`,
      {
        input: {
          name: `${company.name} Pricing`,
          currency: "USD",
          parent: {
            adjustment: {
              type: "PERCENTAGE_DECREASE",
              value: company.discount,
            },
          },
        },
      }
    );

    let priceListId = plData.priceListCreate.priceList?.id;

    if (!priceListId) {
      // Price list already exists — fetch all and match by name
      const existing = await graphql<{ priceLists: { edges: Array<{ node: { id: string; name: string } }> } }>(
        `query { priceLists(first: 20) { edges { node { id name } } } }`
      ).catch(() => ({ priceLists: { edges: [] } }));
      const targetName = `${company.name} Pricing`;
      priceListId = existing.priceLists.edges.find(e => e.node.name === targetName)?.node.id;
      if (!priceListId) {
        console.warn(`  ⚠ Could not find price list "${targetName}", skipping catalog`);
        await sleep(500);
        continue;
      }
      console.log(`  ↩ Reusing existing price list: ${targetName}`);
    }
    console.log(`  ✓ Price list: ${company.name} Pricing (${company.discount}% discount)`);

    // Create catalog
    const catData = await graphql<{
      catalogCreate: {
        catalog: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CatalogCreate($input: CatalogCreateInput!) {
        catalogCreate(input: $input) {
          catalog { id }
          userErrors { message }
        }
      }`,
      {
        input: {
          title: `${company.name} Catalog`,
          status: "ACTIVE",
          priceListId,
          context: {
            companyLocationIds: company.locationIds,
          },
        },
      }
    );

    if (catData.catalogCreate.catalog) {
      console.log(`  ✓ Catalog assigned to ${company.locationIds.length} location(s)`);
    } else {
      console.warn(`  ⚠ Catalog for ${company.name}: ${catData.catalogCreate.userErrors.map(e => e.message).join(", ")}`);
    }

    await sleep(500);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Shopify B2B Store Seeding");
  console.log(`   Store: ${STORE_DOMAIN}`);
  console.log(`   API:   ${API_VERSION}\n`);

  const skipTo = process.argv[2]; // "companies" or "pricing" to skip earlier steps

  try {
    let collectionIds: Record<string, string> = {};
    if (!skipTo) {
      collectionIds = await createCollections();
      await createProducts(collectionIds);
    } else {
      console.log("⏭  Skipping collections & products");
    }

    let companies: Array<{ companyId: string; locationIds: string[]; name: string; discount: number }> = [];
    if (skipTo === "pricing") {
      // Fetch existing companies from Shopify
      console.log("\n🔍 Fetching existing companies...");
      const data = await graphql<{ companies: { edges: Array<{ node: { id: string; name: string; locations: { edges: Array<{ node: { id: string } }> } } }> } }>(
        `query { companies(first: 10) { edges { node { id name locations(first: 5) { edges { node { id } } } } } } }`
      );
      const discountMap: Record<string, number> = {
        "Acme Electric Supply": 20,
        "Metro Contractors LLC": 15,
        "Pacific Installations Inc": 10,
      };
      companies = data.companies.edges.map(({ node }) => ({
        companyId: node.id,
        name: node.name,
        locationIds: node.locations.edges.map(e => e.node.id),
        discount: discountMap[node.name] ?? 10,
      }));
      console.log(`  Found ${companies.length} companies`);
    } else {
      companies = await createCompanies();
    }

    await createPriceListsAndCatalogs(companies);

    console.log("\n✅ Seeding complete!");
    console.log("\nNext steps:");
    console.log("  1. In Shopify Admin, verify products are published to the Online Store channel");
    console.log("  2. Send account invite emails to B2B contacts via Shopify Admin");
    console.log("  3. Run: npm run algolia-sync to index products in Algolia");
    console.log("  4. Set up webhooks: npm run register-webhooks");
  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
    process.exit(1);
  }
}

main();
