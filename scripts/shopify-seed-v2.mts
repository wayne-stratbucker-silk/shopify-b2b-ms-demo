/**
 * Shopify B2B Store Seeding Script v2
 *
 * Seeds makeswift-b2b-demo.myshopify.com with:
 * - 44 electrical supply products across 6 collections
 * - 6 B2B companies with contacts, locations, price lists, catalogs
 * - Historical orders via REST API
 * - Draft order quotes
 * - Shopping list metaobjects
 *
 * Run: npx tsx scripts/shopify-seed-v2.mts
 */

import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

// ─── SECTION A — Boilerplate ──────────────────────────────────────────────────

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "headless-b2b-demo.myshopify.com";
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Admin token via the client credentials grant (SHOPIFY_API_KEY + SHOPIFY_API_SECRET).
const ADMIN_TOKEN = await getAdminToken();

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

const REST_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/orders.json`;
async function restOrder(body: unknown) {
  const r = await fetch(REST_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN }, body: JSON.stringify(body) });
  if (!r.ok) { console.warn("  REST order failed:", (await r.text()).slice(0, 200)); return null; }
  return r.json();
}

// ─── SECTION B — PRODUCTS_V2 ──────────────────────────────────────────────────

const PRODUCTS_V2 = [
  // wire-cable (12)
  { title: "THHN 12AWG Solid Copper Wire 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-12S-250", price: "34.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12 AWG solid copper THHN/THWN-2 building wire, 250 ft spool. Rated 600V, suitable for conduit, raceways, and cable trays in dry or wet locations up to 90°C. UL listed and RoHS compliant.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "12awg", "solid", "copper"], pricingTiers: null, leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "12", "Conductor Type": "Solid", "Conductor Material": "Copper", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Temp Rating (Dry)": "90°C", "Temp Rating (Wet)": "75°C", "Length": "250 ft", "UL Listing": "UL 83 / RoHS" }, installGuideUrl: null, cadFileUrl: null, msrp: "48.99", inventoryQty: 240 },
  { title: "THHN 12AWG Stranded Copper Wire 500ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-12STR-500", price: "62.99", compareAtPrice: "74.99", uom: "FT", descriptionHtml: "<p>Southwire 12 AWG stranded copper THHN/THWN-2 wire, 500 ft spool. Flexible stranded construction eases pulling through conduit runs; dual-rated 600V, 90°C dry / 75°C wet, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "12awg", "stranded", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "12", "Conductor Type": "Stranded", "Conductor Material": "Copper", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Temp Rating (Dry)": "90°C", "Length": "500 ft", "UL Listing": "UL 83" }, installGuideUrl: null, cadFileUrl: null, msrp: "89.99", inventoryQty: 180 },
  { title: "THHN 10AWG Stranded Copper Wire 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-10STR-250", price: "44.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 10 AWG stranded THHN/THWN-2 copper wire, 250 ft spool — suitable for 30A HVAC, water heater, and sub-panel branch circuits in conduit.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "10awg", "stranded"], pricingTiers: null, leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "10", "Conductor Type": "Stranded", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Ampacity (In Conduit)": "40A @ 30°C", "Temp Rating (Dry)": "90°C", "Length": "250 ft", "UL Listing": "UL 83" }, installGuideUrl: null, cadFileUrl: null, msrp: "62.99", inventoryQty: 320 },
  { title: "THHN 8AWG Stranded Copper Wire 500ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-8STR-500", price: "139.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 8 AWG stranded THHN/THWN-2, 500 ft spool. Handles 40–50A circuits for ranges, dryer feeders, and sub-panel runs; ASTM B8 stranding, 600V, 90°C dry, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "8awg", "stranded", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 129.99 }, { minQty: 10, unitPrice: 119.99 }, { minQty: 20, unitPrice: 109.99 }], leadTime: "Ships in 2-3 Days", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "8", "Conductor Type": "Stranded", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Ampacity (In Conduit)": "55A @ 30°C", "Temp Rating (Dry)": "90°C", "Length": "500 ft", "UL Listing": "UL 83" }, installGuideUrl: null, cadFileUrl: null, msrp: "189.99", inventoryQty: 85 },
  { title: "THHN 14AWG Stranded Copper Wire 500ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-14STR-500", price: "29.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 14 AWG stranded THHN/THWN-2 copper wire, 500 ft spool — the standard choice for 15A lighting and general-purpose circuits, 600V, 90°C dry, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "14awg", "stranded", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 27.49 }, { minQty: 10, unitPrice: 25.99 }, { minQty: 20, unitPrice: 23.99 }], leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "14", "Conductor Type": "Stranded", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Ampacity (In Conduit)": "20A @ 30°C", "Temp Rating (Dry)": "90°C", "Length": "500 ft", "UL Listing": "UL 83" }, installGuideUrl: null, cadFileUrl: null, msrp: "41.99", inventoryQty: 420 },
  { title: "THHN 6AWG Stranded Copper Wire 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-6STR-250", price: "169.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 6 AWG stranded THHN/THWN-2 copper wire, 250 ft spool — rated 65A in conduit, used for sub-panel feeders, large HVAC, and EV charging circuits. 600V, 90°C dry, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "6awg", "stranded", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 159.99 }, { minQty: 6, unitPrice: 149.99 }], leadTime: "Ships in 2-3 Days", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "6", "Conductor Type": "Stranded", "Insulation": "THHN/THWN-2", "Voltage Rating": "600V", "Ampacity (In Conduit)": "65A @ 30°C", "Temp Rating (Dry)": "90°C", "Length": "250 ft", "UL Listing": "UL 83" }, installGuideUrl: null, cadFileUrl: null, msrp: "229.99", inventoryQty: 55 },
  { title: "12-2 NM-B Romex Non-Metallic Cable 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-NMB-122-250", price: "59.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12-2 NM-B (Romex) sheathed cable with ground, 250 ft coil — ideal for 20A residential and light commercial branch circuits in dry locations, per NEC Article 334. UL listed.</p>", tags: ["wire-cable", "b2b-demo", "nm-b", "romex", "12-2", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "Configuration": "12-2 with Ground", "Conductor Material": "Copper", "Insulation": "NM-B Thermoplastic", "Voltage Rating": "600V", "Temp Rating": "60°C", "Length": "250 ft", "NEC Article": "334", "UL Listing": "UL 719" }, installGuideUrl: null, cadFileUrl: null, msrp: "84.99", inventoryQty: 210 },
  { title: "14-2 NM-B Romex Non-Metallic Cable 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-NMB-142-250", price: "44.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 14-2 NM-B cable with ground, 250 ft coil — standard for 15A lighting and general-purpose circuits in dry locations, NEC Article 334, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "nm-b", "romex", "14-2", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 41.99 }, { minQty: 6, unitPrice: 38.99 }, { minQty: 12, unitPrice: 35.99 }], leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "Configuration": "14-2 with Ground", "Conductor Material": "Copper", "Insulation": "NM-B Thermoplastic", "Voltage Rating": "600V", "Temp Rating": "60°C", "Length": "250 ft", "NEC Article": "334", "UL Listing": "UL 719" }, installGuideUrl: null, cadFileUrl: null, msrp: "61.99", inventoryQty: 175 },
  { title: "12-3 NM-B Romex Non-Metallic Cable 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-NMB-123-250", price: "84.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12-3 NM-B cable with ground, 250 ft coil — four conductors (black, red, white, bare) for 20A multi-wire branch circuits and 240V appliance feeds in dry locations.</p>", tags: ["wire-cable", "b2b-demo", "nm-b", "romex", "12-3", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 79.99 }, { minQty: 6, unitPrice: 74.99 }, { minQty: 12, unitPrice: 69.99 }], leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "Configuration": "12-3 with Ground", "Conductors": "Black, Red, White, Bare", "Insulation": "NM-B Thermoplastic", "Voltage Rating": "600V", "Temp Rating": "60°C", "Length": "250 ft", "NEC Article": "334", "UL Listing": "UL 719" }, installGuideUrl: null, cadFileUrl: null, msrp: "114.99", inventoryQty: 95 },
  { title: "10-2 MC Metal-Clad Cable 250ft", vendor: "AFC Cable Systems", collection: "wire-cable", sku: "AFC-MC-102-250", price: "189.99", compareAtPrice: "219.99", uom: "FT", descriptionHtml: "<p>AFC Cable Systems 10-2 MC metal-clad cable, 250 ft reel. Aluminum interlocked armor over 10 AWG THHN copper conductors with bonding strip — rated for exposed commercial and industrial wiring per NEC Article 330, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "mc-cable", "10-2", "metal-clad", "sale", "bulk"], pricingTiers: [{ minQty: 2, unitPrice: 179.99 }, { minQty: 5, unitPrice: 164.99 }, { minQty: 10, unitPrice: 149.99 }], leadTime: "Ships in 2-3 Days", warranty: "AFC Cable Systems 1-year limited warranty.", specs: { "Configuration": "10-2 THHN with Ground", "Conductor AWG": "10", "Armor": "Aluminum Interlocked (RWA)", "Voltage Rating": "600V", "Temp Rating (Dry)": "90°C", "Length": "250 ft", "NEC Article": "330", "UL Listing": "UL 1569" }, installGuideUrl: null, cadFileUrl: null, msrp: "269.99", inventoryQty: 42 },
  { title: "SER 4-3 Aluminum Service Entrance Cable 100ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-SER-43AL-100", price: "124.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 4-3 SER aluminum service entrance cable, 100 ft reel — two 4 AWG phase conductors, 4 AWG neutral, and 6 AWG bare copper ground for service drops and sub-panel feeders. 600V, 75°C, UL 854.</p>", tags: ["wire-cable", "b2b-demo", "ser", "aluminum", "service-entrance", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Southwire 1-year limited warranty.", specs: { "Configuration": "4-3 with Ground", "Conductor Material": "Aluminum", "Phase Conductors": "2 × 4 AWG", "Neutral": "4 AWG", "Ground": "6 AWG bare copper", "Voltage Rating": "600V", "Temp Rating": "75°C", "Length": "100 ft", "UL Listing": "UL 854" }, installGuideUrl: null, cadFileUrl: null, msrp: "169.99", inventoryQty: 18 },
  { title: "2/0 Aluminum URD Direct Burial Cable 100ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-URD-2O-100", price: "84.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 2/0 AWG aluminum URD 3-conductor direct burial cable, 100 ft reel — for underground residential distribution (URD) service lateral and secondary distribution, rated 600V at 75°C wet, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "urd", "underground", "aluminum", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Southwire 1-year limited warranty.", specs: { "AWG": "2/0", "Conductors": "3 (phase, neutral, ground)", "Conductor Material": "Aluminum", "Insulation": "XHHW-2", "Jacket": "LDPE Direct Burial", "Voltage Rating": "600V", "Temp Rating (Wet)": "75°C", "Length": "100 ft", "UL Listing": "UL 854" }, installGuideUrl: null, cadFileUrl: null, msrp: "114.99", inventoryQty: 22 },

  // breakers-panels (12)
  { title: "Square D QO120 20A 1-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO120-20A-1P", price: "8.49", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO120 20A single-pole plug-on breaker with Visi-Trip indicator and Qwik-Open mechanism; 120V AC, 10 kAIC, UL listed for QO load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "1-pole", "square-d", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 7.49 }, { minQty: 25, unitPrice: 6.99 }, { minQty: 50, unitPrice: 6.49 }], leadTime: "In Stock", warranty: "Square D lifetime limited warranty.", specs: { "Amperage": "20A", "Poles": "1P", "Voltage": "120V AC", "Interrupt Rating": "10 kAIC", "Series": "QO", "Trip Type": "Thermal-Magnetic", "Frame": "Plug-On", "Compatible Panels": "Square D QO" }, installGuideUrl: "/docs/install/sqd-qo120-20a-1p.pdf", cadFileUrl: null, msrp: "11.49", inventoryQty: 580 },
  { title: "Square D QO230 30A 2-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO230-30A-2P", price: "16.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO230 30A two-pole breaker for dryers, HVAC, and water heaters; 240V AC, 10 kAIC, common trip, UL listed for QO load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "30a", "2-pole", "square-d", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 15.49 }, { minQty: 15, unitPrice: 14.29 }, { minQty: 30, unitPrice: 13.49 }], leadTime: "In Stock", warranty: "Square D lifetime limited warranty.", specs: { "Amperage": "30A", "Poles": "2P", "Voltage": "240V AC", "Interrupt Rating": "10 kAIC", "Series": "QO", "Common Trip": "Yes", "Frame": "Plug-On", "Compatible Panels": "Square D QO" }, installGuideUrl: "/docs/install/sqd-qo230-30a-2p.pdf", cadFileUrl: null, msrp: "22.99", inventoryQty: 340 },
  { title: "Square D QO220 20A 2-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO220-20A-2P", price: "14.49", compareAtPrice: "17.99", uom: "EA", descriptionHtml: "<p>Square D QO220 20A two-pole breaker for 240V small appliances and HVAC; 10 kAIC interrupt, trip-free design, UL listed for QO panels.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "2-pole", "square-d", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Square D lifetime limited warranty.", specs: { "Amperage": "20A", "Poles": "2P", "Voltage": "240V AC", "Interrupt Rating": "10 kAIC", "Series": "QO", "Common Trip": "Yes", "Frame": "Plug-On", "Compatible Panels": "Square D QO" }, installGuideUrl: "/docs/install/sqd-qo220-20a-2p.pdf", cadFileUrl: null, msrp: "22.99", inventoryQty: 195 },
  { title: "Square D QO230GFI 30A 2-Pole GFCI Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO230GFI-30A", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO230GFI 30A two-pole GFCI breaker — Class A 5 mA protection for outdoor, spa, and hot tub circuits; pigtail neutral included, 240V AC, 10 kAIC, UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "gfci", "30a", "2-pole", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Square D lifetime limited warranty.", specs: { "Amperage": "30A", "Poles": "2P", "Voltage": "240V AC", "Interrupt Rating": "10 kAIC", "GFCI Class": "Class A (5 mA)", "Trip Type": "Thermal-Magnetic + GFCI", "Neutral": "Pigtail included", "Compatible Panels": "Square D QO" }, installGuideUrl: "/docs/install/sqd-qo230gfi-30a.pdf", cadFileUrl: null, msrp: "74.99", inventoryQty: 48 },
  { title: "Eaton BR120 20A 1-Pole Circuit Breaker", vendor: "Eaton", collection: "breakers-panels", sku: "ETN-BR120-20A-1P", price: "7.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Eaton BR120 20A single-pole plug-on breaker for BR/CH load centers; thermal-magnetic trip, 120V AC, 10 kAIC, UL listed, ANSI C37.29.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "1-pole", "eaton", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 6.99 }, { minQty: 25, unitPrice: 6.49 }, { minQty: 50, unitPrice: 5.99 }], leadTime: "In Stock", warranty: "Eaton 1-year limited warranty.", specs: { "Amperage": "20A", "Poles": "1P", "Voltage": "120V AC", "Interrupt Rating": "10 kAIC", "Series": "BR", "Trip Type": "Thermal-Magnetic", "Frame": "Plug-On", "Compatible Panels": "Eaton BR, CH" }, installGuideUrl: "/docs/install/etn-br120-20a-1p.pdf", cadFileUrl: null, msrp: "10.99", inventoryQty: 460 },
  { title: "Siemens Q2100 100A 2-Pole Circuit Breaker", vendor: "Siemens", collection: "breakers-panels", sku: "SIE-Q2100-100A-2P", price: "38.99", compareAtPrice: "44.99", uom: "EA", descriptionHtml: "<p>Siemens Q2100 100A two-pole bolt-on main/feeder breaker; thermal-magnetic common trip, 240V AC, 22 kAIC, UL listed for QP load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "100a", "2-pole", "siemens", "sale"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Siemens 1-year limited warranty.", specs: { "Amperage": "100A", "Poles": "2P", "Voltage": "240V AC", "Interrupt Rating": "22 kAIC", "Series": "QP", "Common Trip": "Yes", "Frame": "Bolt-On", "Compatible Panels": "Siemens QP" }, installGuideUrl: "/docs/install/sie-q2100-100a-2p.pdf", cadFileUrl: null, msrp: "59.99", inventoryQty: 72 },
  { title: "Square D 200A 30-Space QO Load Center", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO130L200PG-200A", price: "189.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO130L200PG 200A 30-space 60-circuit indoor load center; factory-installed 200A QOM2 main, copper bus, hinged-door NEMA 1 enclosure, UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "panel", "load-center", "200a", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Square D lifetime limited warranty on enclosure; 1-year on components.", specs: { "Main Breaker": "200A (QOM2)", "Spaces": "30", "Max Circuits": "60", "Voltage": "120/240V 1Ø", "Bus": "Copper 200A", "Enclosure": "NEMA 1 Indoor", "Dimensions": "20.5\" H × 14.5\" W", "UL Listing": "UL 67" }, installGuideUrl: "/docs/install/sqd-qo130l200pg.pdf", cadFileUrl: "/cad/sqd-qo130l200pg.dxf", msrp: "249.99", inventoryQty: 15 },
  { title: "Eaton 200A 20-Circuit Load Center", vendor: "Eaton", collection: "breakers-panels", sku: "ETN-BR2020B200-200A", price: "164.99", compareAtPrice: "194.99", uom: "EA", descriptionHtml: "<p>Eaton BR2020B200 200A 20-space 20-circuit indoor main breaker load center; aluminum bus, convertible to main lug, NEMA 1 enclosure with flush trim, UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "panel", "load-center", "200a", "eaton", "sale"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Eaton 1-year limited warranty.", specs: { "Main Breaker": "200A", "Spaces": "20", "Max Circuits": "20", "Voltage": "120/240V 1Ø", "Bus": "Aluminum 200A", "Enclosure": "NEMA 1 Indoor", "Flush Trim": "Included", "UL Listing": "UL 67" }, installGuideUrl: "/docs/install/etn-br2020b200.pdf", cadFileUrl: "/cad/etn-br2020b200.dxf", msrp: "249.99", inventoryQty: 12 },
  { title: "Square D 15A AFCI 1-Pole QO Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO115PDFC-15A", price: "34.99", compareAtPrice: "42.99", uom: "EA", descriptionHtml: "<p>Square D QO115PDFC 15A dual-function AFCI/GFCI plug-on breaker — required by NEC for bedroom and kitchen circuits; Visi-Trip indicator, 120V AC, 10 kAIC, UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "afci", "gfci", "15a", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Square D lifetime limited warranty.", specs: { "Amperage": "15A", "Poles": "1P", "Voltage": "120V AC", "Interrupt Rating": "10 kAIC", "Protection": "Dual AFCI + GFCI", "Series": "QO", "Frame": "Plug-On", "Compatible Panels": "Square D QO" }, installGuideUrl: "/docs/install/sqd-qo115pdfc.pdf", cadFileUrl: null, msrp: "59.99", inventoryQty: 65 },
  { title: "Eaton CHSPT2ULTRA Whole-House Surge Protector", vendor: "Eaton", collection: "breakers-panels", sku: "ETN-CHSPT2ULTRA", price: "149.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Eaton CHSPT2ULTRA Type 2 whole-house surge protector; installs in load center, 108,000A surge capacity, LED status indicator, compatible with CH and BR panels.</p>", tags: ["breakers-panels", "b2b-demo", "surge-protector", "whole-house", "eaton", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Eaton lifetime connected equipment warranty.", specs: { "Type": "Type 2 (Service Entrance)", "Surge Capacity": "108,000A", "Voltage Rating": "120/240V", "Modes Protected": "L-N, L-L, L-G, N-G", "Status Indicator": "LED (Green = protected)", "Compatible Panels": "Eaton CH, BR", "UL Listing": "UL 1449 4th Ed." }, installGuideUrl: "/docs/install/etn-chspt2ultra.pdf", cadFileUrl: null, msrp: "199.99", inventoryQty: 28 },
  { title: "Square D 60A 2-Pole Non-Fusible Disconnect", vendor: "Square D", collection: "breakers-panels", sku: "SQD-DU221RB-60A", price: "64.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D DU221RB 60A 2-pole non-fusible safety switch; rainproof NEMA 3R enclosure for outdoor HVAC and appliance disconnects, 240V, UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "disconnect", "60a", "square-d", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 59.99 }, { minQty: 6, unitPrice: 54.99 }], leadTime: "Ships in 2-3 Days", warranty: "Square D 1-year limited warranty.", specs: { "Amperage": "60A", "Poles": "2P", "Voltage": "240V AC", "Fusing": "Non-Fusible", "Enclosure": "NEMA 3R Rainproof", "Application": "HVAC/Appliance Disconnect", "Wire Range": "6–1/0 AWG", "UL Listing": "UL 98" }, installGuideUrl: "/docs/install/sqd-du221rb.pdf", cadFileUrl: null, msrp: "89.99", inventoryQty: 45 },
  { title: "Square D 100A 6-Space QO Sub-Panel", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO16L100PG-100A", price: "94.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO16L100PG 100A 6-space 12-circuit QO main lug sub-panel; copper bus, NEMA 1 indoor enclosure — ideal for garages, workshops, and additions.</p>", tags: ["breakers-panels", "b2b-demo", "panel", "sub-panel", "100a", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Square D lifetime limited warranty on enclosure.", specs: { "Rating": "100A Main Lug", "Spaces": "6", "Max Circuits": "12", "Voltage": "120/240V 1Ø", "Bus": "Copper 100A", "Enclosure": "NEMA 1 Indoor", "Series": "QO", "UL Listing": "UL 67" }, installGuideUrl: "/docs/install/sqd-qo16l100pg.pdf", cadFileUrl: null, msrp: "129.99", inventoryQty: 32 },

  // conduit-fittings (10)
  { title: "EMT 1/2in Conduit 10ft (Box of 10)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-12-10FT-BX10", price: "54.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 1/2 in. EMT (Electrical Metallic Tubing) in a box of 10 sticks, each 10 ft long. Hot-dip galvanized inside and out for superior corrosion resistance in indoor and outdoor applications per NEC Article 358. UL listed and meets ANSI C80.3 dimensional standards.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "1/2in", "conduit", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 49.99 }, { minQty: 6, unitPrice: 46.99 }, { minQty: 12, unitPrice: 43.99 }], leadTime: "In Stock", warranty: "Allied Tube & Conduit product satisfaction guarantee.", specs: { "Trade Size": "1/2\"", "Material": "Galvanized Steel", "Finish": "Hot-Dip Galvanized (inside & out)", "Length per Stick": "10 ft", "Qty per Box": "10 sticks (100 linear ft)", "Wall Thickness": "0.042\"", "Outside Diameter": "0.706\"", "Standard": "ANSI C80.3", "UL Listing": "UL 797" }, installGuideUrl: "/docs/install/atc-emt-12.pdf", cadFileUrl: null, msrp: "74.99", inventoryQty: 95 },
  { title: "EMT 3/4in Conduit 10ft (Box of 10)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-34-10FT-BX10", price: "79.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 3/4 in. EMT conduit, box of 10 sticks at 10 ft each (100 linear feet). Galvanized steel construction resists corrosion in damp locations; standard trade size accommodates up to 7 THHN 12 AWG conductors. UL listed per UL 797 and ANSI C80.3.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "3/4in", "conduit", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 72.99 }, { minQty: 6, unitPrice: 67.99 }, { minQty: 12, unitPrice: 62.99 }], leadTime: "In Stock", warranty: "Allied Tube & Conduit product satisfaction guarantee.", specs: { "Trade Size": "3/4\"", "Material": "Galvanized Steel", "Finish": "Hot-Dip Galvanized", "Length per Stick": "10 ft", "Qty per Box": "10 sticks (100 linear ft)", "Wall Thickness": "0.049\"", "Outside Diameter": "0.922\"", "Standard": "ANSI C80.3", "UL Listing": "UL 797" }, installGuideUrl: "/docs/install/atc-emt-34.pdf", cadFileUrl: null, msrp: "109.99", inventoryQty: 62 },
  { title: "EMT 1in Conduit 10ft (Box of 5)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-1-10FT-BX5", price: "59.99", compareAtPrice: "69.99", uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 1 in. EMT conduit, box of 5 sticks at 10 ft each (50 linear feet). Ideal for feeder runs and larger wire fills in commercial construction; hot-dip galvanized finish for corrosion protection in wet and dry locations. UL listed per UL 797.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "1in", "conduit", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Allied Tube & Conduit product satisfaction guarantee.", specs: { "Trade Size": "1\"", "Material": "Galvanized Steel", "Finish": "Hot-Dip Galvanized", "Length per Stick": "10 ft", "Qty per Box": "5 sticks (50 linear ft)", "Wall Thickness": "0.057\"", "Outside Diameter": "1.163\"", "Standard": "ANSI C80.3", "UL Listing": "UL 797" }, installGuideUrl: "/docs/install/atc-emt-1.pdf", cadFileUrl: null, msrp: "89.99", inventoryQty: 44 },
  { title: "1/2in Rigid Steel Conduit 10ft Each", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-RGD-12-10FT-EA", price: "8.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Allied Tube & Conduit 1/2 in. rigid galvanized steel conduit (RGS), single 10 ft stick with one coupling included. Provides maximum mechanical protection for conductors in exposed, hazardous, or high-impact locations per NEC Article 344. Hot-dip galvanized inside and out; UL listed and ANSI C80.1 compliant.</p>", tags: ["conduit-fittings", "b2b-demo", "rigid", "1/2in", "conduit"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Allied Tube & Conduit product satisfaction guarantee.", specs: { "Trade Size": "1/2\"", "Type": "Rigid Galvanized Steel (RGS)", "Finish": "Hot-Dip Galvanized (inside & out)", "Length": "10 ft (coupling included)", "Wall Thickness": "0.109\"", "Outside Diameter": "0.840\"", "Standard": "ANSI C80.1", "NEC Article": "344", "UL Listing": "UL 6" }, installGuideUrl: null, cadFileUrl: null, msrp: "12.49", inventoryQty: 210 },
  { title: "1/2in EMT Compression Coupling (Bag of 50)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-CC-12-BG50", price: "39.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>Thomas & Betts 1/2 in. EMT compression couplings, bag of 50. Die-cast zinc construction with serrated compression ring provides a watertight connection rated for outdoor and wet locations. Meets NEMA FB-1 and UL 514B standards; listed for use with 1/2 in. EMT conduit.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "compression", "coupling", "1/2in", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 35.99 }, { minQty: 6, unitPrice: 32.99 }, { minQty: 12, unitPrice: 29.99 }], leadTime: "In Stock", warranty: "Thomas & Betts product warranty.", specs: { "Trade Size": "1/2\"", "Type": "Compression Coupling", "Material": "Zinc Die-Cast", "Connection": "Serrated compression ring", "Rating": "Watertight (Raintight)", "Qty per Bag": "50", "Standard": "NEMA FB-1", "UL Listing": "UL 514B" }, installGuideUrl: null, cadFileUrl: null, msrp: "54.99", inventoryQty: 130 },
  { title: "3/4in EMT Set Screw Connector (Bag of 25)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-SSC-34-BG25", price: "18.99", compareAtPrice: "22.99", uom: "PK", descriptionHtml: "<p>Thomas & Betts 3/4 in. EMT set screw connectors, bag of 25, for dry indoor conduit terminations to enclosures and junction boxes. Zinc die-cast body with steel set screw; insulated throat protects conductors from sharp edges. UL listed per UL 514B; meets NEMA FB-1.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "set-screw", "connector", "3/4in", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Thomas & Betts product warranty.", specs: { "Trade Size": "3/4\"", "Type": "Set Screw Connector", "Material": "Zinc Die-Cast", "Throat": "Insulated (protects conductors)", "Rating": "Indoor Dry", "Qty per Bag": "25", "Standard": "NEMA FB-1", "UL Listing": "UL 514B" }, installGuideUrl: null, cadFileUrl: null, msrp: "29.99", inventoryQty: 185 },
  { title: "1/2in Schedule 40 PVC Conduit 10ft Each", vendor: "Carlon", collection: "conduit-fittings", sku: "CAR-PVC40-12-10FT", price: "2.49", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Carlon 1/2 in. Schedule 40 PVC conduit, 10 ft stick — sunlight-resistant grey, for direct burial and concrete encasement per NEC Article 352, UL 651.</p>", tags: ["conduit-fittings", "b2b-demo", "pvc", "schedule-40", "conduit", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 2.19 }, { minQty: 25, unitPrice: 1.99 }, { minQty: 50, unitPrice: 1.79 }], leadTime: "In Stock", warranty: "Carlon product warranty.", specs: { "Trade Size": "1/2\"", "Material": "PVC Schedule 40", "Color": "Grey", "Length": "10 ft", "Direct Burial": "Yes", "NEC Article": "352", "UL Listing": "UL 651" }, installGuideUrl: null, cadFileUrl: null, msrp: "3.99", inventoryQty: 480 },
  { title: "3/4in Liquid-Tight Flexible Conduit 25ft", vendor: "Anamet", collection: "conduit-fittings", sku: "ANM-LTFLEX-34-25FT", price: "29.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Anamet 3/4 in. liquid-tight flexible non-metallic conduit (LFNC-B), 25 ft coil — oil/sunlight-resistant PVC jacket for motor connections in wet locations, UL 360.</p>", tags: ["conduit-fittings", "b2b-demo", "liquid-tight", "flexible", "conduit"], pricingTiers: null, leadTime: "In Stock", warranty: "Anamet product warranty.", specs: { "Trade Size": "3/4\"", "Type": "Liquid-Tight Flexible (LFNC-B)", "Jacket": "PVC oil & sunlight resistant", "Length": "25 ft", "Temp Range": "-10°C to 60°C", "NEC Article": "356", "UL Listing": "UL 360" }, installGuideUrl: null, cadFileUrl: null, msrp: "41.99", inventoryQty: 75 },
  { title: "1in EMT Compression Connector (Bag of 25)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-CC-1-BG25", price: "34.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>T&B 1 in. EMT compression connectors, bag of 25 — zinc die-cast, insulated throat, watertight for wet locations, NEMA FB-1, UL 514B.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "compression", "connector", "1in", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 31.99 }, { minQty: 6, unitPrice: 28.99 }], leadTime: "In Stock", warranty: "Thomas & Betts product warranty.", specs: { "Trade Size": "1\"", "Type": "Compression Connector", "Material": "Zinc Die-Cast", "Throat": "Insulated", "Rating": "Watertight", "Qty/Bag": "25", "UL Listing": "UL 514B" }, installGuideUrl: null, cadFileUrl: null, msrp: "47.99", inventoryQty: 88 },
  { title: "1/2in EMT Set Screw Coupling (Bag of 25)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-SSC-12-BG25", price: "12.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>T&B 1/2 in. EMT set screw couplings, bag of 25 — zinc die-cast for dry indoor conduit-to-conduit joints, NEMA FB-1, UL 514B.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "set-screw", "coupling", "1/2in", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 11.49 }, { minQty: 10, unitPrice: 9.99 }], leadTime: "In Stock", warranty: "Thomas & Betts product warranty.", specs: { "Trade Size": "1/2\"", "Type": "Set Screw Coupling", "Material": "Zinc Die-Cast", "Rating": "Indoor Dry", "Qty/Bag": "25", "UL Listing": "UL 514B" }, installGuideUrl: null, cadFileUrl: null, msrp: "17.99", inventoryQty: 240 },

  // lighting-fixtures (12)
  { title: "Lithonia 4ft LED Shop Light 40W 2-Pack", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-SHOPLT-4FT-40W-2PK", price: "54.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>Lithonia 4 ft 40W LED shop lights, 2-pack — 4,400 lm per fixture at 5000K, linkable to 4 units, dry/damp rated, 50,000-hr life, DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "shop-light", "4ft", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 49.99 }, { minQty: 10, unitPrice: 44.99 }, { minQty: 20, unitPrice: 39.99 }], leadTime: "In Stock", warranty: "Lithonia Lighting 5-year limited warranty.", specs: { "Wattage": "40W/fixture", "Lumens": "4,400 lm/fixture", "Color Temp": "5000K", "CRI": "80+", "Voltage": "120V", "Dimming": "No", "Rated Life": "50,000 hrs", "Linkable": "Yes (4 max)", "DLC Listed": "Yes" }, installGuideUrl: "/docs/install/lit-shoplt-4ft-40w-2pk.pdf", cadFileUrl: "/cad/lit-shoplt-4ft-40w-2pk.dxf", msrp: "79.99", inventoryQty: 145 },
  { title: "Lithonia UFO LED High Bay 100W", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-HBUFO-100W-5K", price: "89.99", compareAtPrice: "109.99", uom: "EA", descriptionHtml: "<p>Lithonia Lighting 100W UFO round LED high bay fixture producing 13,000 lumens at 5000K, replacing 250W metal halide. Die-cast aluminum housing with polycarbonate lens; IP65 rated for wet/dusty environments. 0–10V dimming ready, 120–277V universal voltage, DLC Premium listed, 5-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "high-bay", "ufo", "100w", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Lithonia Lighting 5-year limited warranty.", specs: { "Wattage": "100W", "Lumens": "13,000 lm", "Efficacy": "130 lm/W", "Color Temp": "5000K", "CRI": "80+", "Input Voltage": "120–277V Universal", "Dimming": "0–10V", "IP Rating": "IP65", "Rated Life": "100,000 hours", "Replaces": "250W Metal Halide", "DLC Listed": "Premium" }, installGuideUrl: "/docs/install/lit-hbufo-100w-5k.pdf", cadFileUrl: "/cad/lit-hbufo-100w-5k.dxf", msrp: "139.99", inventoryQty: 62 },
  { title: "Lithonia UFO LED High Bay 150W", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-HBUFO-150W-5K", price: "119.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 150W UFO LED high bay producing 19,500 lumens at 5000K for warehouses and manufacturing floors with 20–40 ft mounting heights. IP65-rated aluminum housing, 0–10V dimming, 120–277V universal input, DLC Premium listed. Replaces 400W metal halide with 62% energy savings.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "high-bay", "ufo", "150w", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 109.99 }, { minQty: 10, unitPrice: 99.99 }, { minQty: 20, unitPrice: 89.99 }], leadTime: "Ships in 2-3 Days", warranty: "Lithonia Lighting 5-year limited warranty.", specs: { "Wattage": "150W", "Lumens": "19,500 lm", "Efficacy": "130 lm/W", "Color Temp": "5000K", "CRI": "80+", "Input Voltage": "120–277V Universal", "Dimming": "0–10V", "IP Rating": "IP65", "Rated Life": "100,000 hours", "Replaces": "400W Metal Halide", "DLC Listed": "Premium" }, installGuideUrl: "/docs/install/lit-hbufo-150w-5k.pdf", cadFileUrl: "/cad/lit-hbufo-150w-5k.dxf", msrp: "174.99", inventoryQty: 38 },
  { title: "Lithonia 2x4 LED Troffer 50W 5000K", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-TROF-2X4-50W-5K", price: "74.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 2 ft. x 4 ft. 50W LED lay-in troffer producing 5,500 lumens at 5000K for office and commercial ceiling grid applications. 0–10V dimming compatible; fits standard 15/16 in. T-bar grid. DLC listed, Title 24 compliant, 50,000-hour rated life, 5-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "troffer", "2x4", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Lithonia Lighting 5-year limited warranty.", specs: { "Wattage": "50W", "Lumens": "5,500 lm", "Color Temp": "5000K", "CRI": "80+", "Size": "2 ft × 4 ft", "Input Voltage": "120–277V", "Dimming": "0–10V", "Grid Compatibility": "15/16\" T-bar", "Rated Life": "50,000 hours", "DLC / Title 24": "Yes" }, installGuideUrl: "/docs/install/lit-trof-2x4-50w-5k.pdf", cadFileUrl: "/cad/lit-trof-2x4-50w-5k.dxf", msrp: "109.99", inventoryQty: 85 },
  { title: "Hubbell 8ft LED Strip Light 60W", vendor: "Hubbell Lighting", collection: "lighting-fixtures", sku: "HUB-STRIP-8FT-60W-4K", price: "94.99", compareAtPrice: "114.99", uom: "EA", descriptionHtml: "<p>Hubbell Lighting 8 ft. 60W LED industrial strip light delivering 7,800 lumens at 4000K neutral white for warehouses, parking garages, and utility spaces. Surface or pendant mount; V-shaped reflector for optimized distribution. 120–277V, IP44 rated, 70,000-hour L70 life; DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "strip-light", "8ft", "sale"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Hubbell Lighting 5-year limited warranty.", specs: { "Wattage": "60W", "Lumens": "7,800 lm", "Color Temp": "4000K (Neutral White)", "CRI": "80+", "Length": "8 ft", "Input Voltage": "120–277V", "IP Rating": "IP44", "Mount": "Surface or Pendant", "Rated Life": "70,000 hours (L70)", "DLC Listed": "Yes" }, installGuideUrl: "/docs/install/hub-strip-8ft-60w-4k.pdf", cadFileUrl: "/cad/hub-strip-8ft-60w-4k.dxf", msrp: "149.99", inventoryQty: 28 },
  { title: "RAB Area Light 150W Bronze LED", vendor: "RAB Lighting", collection: "lighting-fixtures", sku: "RAB-AREA-150W-BRZ-5K", price: "249.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>RAB Lighting AREA4T150 150W LED area light in bronze finish producing 18,000 lumens at 5000K for parking lots, roadways, and large outdoor areas. Die-cast aluminum housing, Type IV distribution, IK08 impact rated, IP65 sealed, 0–10V dimming. DLC Premium listed; 10-year limited warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "area-light", "outdoor", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "RAB Lighting 10-year limited warranty.", specs: { "Wattage": "150W", "Lumens": "18,000 lm", "Color Temp": "5000K", "CRI": "70+", "Finish": "Bronze (BRZ)", "Distribution": "Type IV", "Input Voltage": "120–277V", "Dimming": "0–10V", "IP Rating": "IP65", "Impact Rating": "IK08", "Rated Life": "100,000 hours", "DLC Listed": "Premium" }, installGuideUrl: "/docs/install/rab-area-150w-brz-5k.pdf", cadFileUrl: "/cad/rab-area-150w-brz-5k.dxf", msrp: "349.99", inventoryQty: 14 },
  { title: "Lithonia LED Wall Pack 26W Bronze", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-WALLPK-26W-BRZ-4K", price: "64.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 26W LED full-cutoff wall pack in bronze finish, producing 2,800 lumens at 4000K for building perimeters, stairwells, and loading docks. Die-cast aluminum housing with photocell (dusk-to-dawn) included; IP65 rated for wet locations. 120–277V universal, DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "wall-pack", "outdoor"], pricingTiers: null, leadTime: "In Stock", warranty: "Lithonia Lighting 5-year limited warranty.", specs: { "Wattage": "26W", "Lumens": "2,800 lm", "Color Temp": "4000K", "CRI": "80+", "Finish": "Bronze", "Cutoff": "Full Cutoff", "Photocell": "Included (dusk-to-dawn)", "Input Voltage": "120–277V", "IP Rating": "IP65", "Rated Life": "50,000 hours", "DLC Listed": "Yes" }, installGuideUrl: "/docs/install/lit-wallpk-26w-brz-4k.pdf", cadFileUrl: "/cad/lit-wallpk-26w-brz-4k.dxf", msrp: "89.99", inventoryQty: 65 },
  { title: "Philips LED PL-C 13W Lamp (Carton of 10)", vendor: "Philips", collection: "lighting-fixtures", sku: "PHI-LEDPLC-13W-4P-CTN10", price: "79.99", compareAtPrice: "94.99", uom: "CTN", descriptionHtml: "<p>Philips 13W LED PL-C 4-pin retrofit lamp (carton of 10) replacing 26W CFL PL-C lamps in 4-pin ballast bypass fixtures. 1,200-lumen output at 4000K with 80+ CRI; compatible with electronic ballasts or direct-wire configuration. Energy Star certified, 25,000-hour rated life, 3-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "pl-c", "lamp", "retrofit", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Philips 3-year limited warranty.", specs: { "Wattage": "13W (per lamp)", "Lumens": "1,200 lm (per lamp)", "Color Temp": "4000K", "CRI": "80+", "Base": "GX24q-1 (4-Pin)", "Replaces": "26W CFL PL-C", "Input": "Electronic ballast or direct-wire", "Rated Life": "25,000 hours", "Qty per Carton": "10", "Certification": "Energy Star" }, installGuideUrl: null, cadFileUrl: null, msrp: "119.99", inventoryQty: 120 },

  // switches-receptacles (8)
  { title: "Leviton 20A Duplex Receptacle White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5352-W-BX10", price: "39.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5352 20-amp 125V duplex receptacle in white finish, commercial-grade, box of 10. Side-wire and back-wire terminals accept 10–12 AWG copper conductors; T-slot design accepts 20A and 15A plugs. Listed for residential and commercial use; UL listed, meets NEMA WD-6 specifications.</p>", tags: ["switches-receptacles", "b2b-demo", "receptacle", "20a", "duplex", "leviton", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 35.99 }, { minQty: 10, unitPrice: 31.99 }, { minQty: 20, unitPrice: 27.99 }], leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Configuration": "NEMA 5-20R (T-slot)", "Color": "White", "Grade": "Commercial", "Terminal": "Side-wire and Back-wire", "Conductor Range": "10–12 AWG", "Qty per Box": "10", "UL Listing": "Yes / NEMA WD-6" }, installGuideUrl: "/docs/install/lev-5352-w-bx10.pdf", cadFileUrl: null, msrp: "54.99", inventoryQty: 280 },
  { title: "Leviton 20A GFCI Receptacle White (Box of 5)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-GFNT2-W-BX5", price: "54.99", compareAtPrice: "64.99", uom: "BX", descriptionHtml: "<p>Leviton GFNT2 20-amp GFCI duplex receptacle in white, box of 5, with self-test SmartLock Pro technology that locks out power if GFCI protection is lost. Monochromatic design; accepts 20A and 15A plugs. Required for kitchens, bathrooms, garages, and outdoor locations per NEC; UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "gfci", "receptacle", "20a", "leviton", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Configuration": "NEMA 5-20R (T-slot)", "GFCI Class": "Class A (5 mA)", "Self-Test": "SmartLock Pro", "Color": "White", "Grade": "Commercial", "Qty per Box": "5", "UL Listing": "Yes / NEC Compliant" }, installGuideUrl: "/docs/install/lev-gfnt2-w-bx5.pdf", cadFileUrl: null, msrp: "84.99", inventoryQty: 95 },
  { title: "Hubbell 20A Hospital Grade Receptacle (Box of 10)", vendor: "Hubbell", collection: "switches-receptacles", sku: "HUB-HBL5362W-BX10", price: "149.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Hubbell HBL5362 20-amp 125V hospital grade duplex receptacle in white, box of 10. Green dot marking certifies hospital grade construction with extra-heavy-duty contacts and housing. Side-wire binding screw and back-wire push-in terminals; UL listed for health care facilities per NFPA 99.</p>", tags: ["switches-receptacles", "b2b-demo", "hospital-grade", "receptacle", "20a", "hubbell", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Hubbell 3-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Configuration": "NEMA 5-20R", "Grade": "Hospital Grade (Green Dot)", "Color": "White", "Terminal": "Side-wire and Back-wire push-in", "Conductor Range": "14–10 AWG", "Qty per Box": "10", "Standard": "NFPA 99", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/hub-hbl5362w-bx10.pdf", cadFileUrl: null, msrp: "194.99", inventoryQty: 42 },
  { title: "Leviton 20A Single-Pole Switch White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5621-W-BX10", price: "34.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5621 20-amp 120/277V commercial-grade single-pole toggle switch in white, box of 10. AC-rated for fluorescent, incandescent, and motor loads; back-wire and side-wire terminals accept 10–12 AWG copper. Listed in NEMA WD-1 configuration; UL listed for residential and commercial applications.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "single-pole", "20a", "leviton", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 29.99 }, { minQty: 10, unitPrice: 26.99 }, { minQty: 20, unitPrice: 23.99 }], leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "120/277V AC", "Configuration": "Single-Pole", "Color": "White", "Grade": "Commercial", "Rating": "AC Only", "Terminal": "Side-wire and Back-wire", "Conductor Range": "10–12 AWG", "Qty per Box": "10", "UL Listing": "Yes / NEMA WD-1" }, installGuideUrl: "/docs/install/lev-5621-w-bx10.pdf", cadFileUrl: null, msrp: "47.99", inventoryQty: 310 },
  { title: "Leviton 20A 3-Way Switch White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5603-W-BX10", price: "54.99", compareAtPrice: "64.99", uom: "BX", descriptionHtml: "<p>Leviton 5603 20-amp 120/277V commercial-grade 3-way toggle switch in white, box of 10. Clearly marked common terminal screw; suitable for two-point control of lighting loads in hallways, stairwells, and large rooms. AC-rated for fluorescent and incandescent loads; UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "3-way", "20a", "leviton", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "120/277V AC", "Configuration": "3-Way", "Color": "White", "Grade": "Commercial", "Common Terminal": "Clearly marked", "Qty per Box": "10", "UL Listing": "Yes / NEMA WD-1" }, installGuideUrl: "/docs/install/lev-5603-w-bx10.pdf", cadFileUrl: null, msrp: "84.99", inventoryQty: 120 },
  { title: "Leviton 20A 4-Way Switch White (Box of 5)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5604-W-BX5", price: "44.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5604 20-amp 120/277V commercial-grade 4-way toggle switch in white, box of 5, for multi-point lighting control with 3-way switches. Four screw terminals for traveler wires; AC-rated for fluorescent, incandescent, and tungsten-halogen loads. UL listed for residential and commercial use.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "4-way", "20a", "leviton"], pricingTiers: null, leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "120/277V AC", "Configuration": "4-Way", "Color": "White", "Grade": "Commercial", "Terminals": "4 traveler screw terminals", "Qty per Box": "5", "UL Listing": "Yes" }, installGuideUrl: "/docs/install/lev-5604-w-bx5.pdf", cadFileUrl: null, msrp: "61.99", inventoryQty: 85 },
  { title: "Leviton 20A Isolated Ground Receptacle Orange (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5362-IG-BX10", price: "84.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5362-IG 20-amp isolated ground duplex receptacle in orange finish, box of 10, for sensitive electronics and data equipment requiring a clean, noise-free ground reference. Isolated grounding pin prevents electromagnetic interference from propagating through conduit. UL listed; identified by orange color per NEC 406.3(D)(3).</p>", tags: ["switches-receptacles", "b2b-demo", "isolated-ground", "receptacle", "20a", "leviton", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Configuration": "NEMA 5-20R (T-slot)", "Ground": "Isolated (noise-free)", "Color": "Orange (per NEC 406.3)", "Grade": "Commercial", "Terminal": "Side-wire and Back-wire", "Qty per Box": "10", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/lev-5362-ig-bx10.pdf", cadFileUrl: null, msrp: "114.99", inventoryQty: 38 },
  { title: "Hubbell 20A L5-20 Twist-Lock Receptacle", vendor: "Hubbell", collection: "switches-receptacles", sku: "HUB-HBL2310-L520R", price: "24.99", compareAtPrice: "29.99", uom: "EA", descriptionHtml: "<p>Hubbell HBL2310 20-amp 125V NEMA L5-20R locking receptacle for generators, UPS systems, and portable power equipment requiring a secure, vibration-resistant connection. 2-pole 3-wire grounding configuration; screw terminals accept 10–12 AWG conductors. UL listed, NEMA WD-6 compliant.</p>", tags: ["switches-receptacles", "b2b-demo", "twist-lock", "receptacle", "20a", "hubbell", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Hubbell 3-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Configuration": "NEMA L5-20R (Locking)", "Poles / Wires": "2P/3W Grounding", "Terminal": "Screw", "Conductor Range": "10–12 AWG", "Color": "Black/White", "UL Listing": "Yes / NEMA WD-6" }, installGuideUrl: "/docs/install/hub-hbl2310-l520r.pdf", cadFileUrl: null, msrp: "39.99", inventoryQty: 75 },

  // tools-safety (6)
  { title: "Klein 11-in-1 Multi-Bit Screwdriver", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-32500-11N1", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Klein Tools 32500 11-in-1 screwdriver and nut driver with interchangeable bits including 6 screwdriver bits (Phillips #1, #2, #3; slotted 3/16, 1/4, 5/16) and 5 nut driver sizes (3/8, 5/16, 1/4, 3/16, 11/32 in.). Cushion-grip handle with wire bender/loop hole; bits store in handle. Meets ASME B107.17 standards.</p>", tags: ["tools-safety", "b2b-demo", "screwdriver", "multi-bit", "klein", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 21.99 }, { minQty: 10, unitPrice: 19.99 }, { minQty: 25, unitPrice: 17.99 }], leadTime: "In Stock", warranty: "Klein Tools lifetime warranty.", specs: { "Bits Included": "11 total", "Screwdriver Bits": "Phillips #1/#2/#3; Slotted 3/16, 1/4, 5/16\"", "Nut Driver Sizes": "3/8, 5/16, 1/4, 3/16, 11/32\"", "Handle": "Cushion-grip with wire bender/loop", "Bit Storage": "In handle", "Material": "Heat-treated steel bits", "Standard": "ASME B107.17" }, installGuideUrl: null, cadFileUrl: null, msrp: "34.99", inventoryQty: 165 },
  { title: "Klein Electrician Scissors 3-Pack", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-2100-7-3PK", price: "39.99", compareAtPrice: "46.99", uom: "PK", descriptionHtml: "<p>Klein Tools 2100-7 electrician scissors, 3-pack, with hardened steel blades for cutting wire, cable, and insulation cleanly and precisely. Serrated edge grips wire during cutting; notched blade strips 12 and 14 AWG solid wire. Plastic dip handles for grip; hot-riveted pivot for longevity.</p>", tags: ["tools-safety", "b2b-demo", "scissors", "electrician", "klein", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Klein Tools lifetime warranty on defects in materials and workmanship.", specs: { "Blade Material": "High-Carbon Steel (hardened)", "Edge": "Serrated + wire stripping notch", "Wire Strip": "12 and 14 AWG solid", "Length": "7 in.", "Handle": "Plastic dip grip", "Pivot": "Hot-riveted", "Qty": "3 per pack" }, installGuideUrl: null, cadFileUrl: null, msrp: "59.99", inventoryQty: 52 },
  { title: "Fluke T6-1000 PRO Electrical Tester", vendor: "Fluke", collection: "tools-safety", sku: "FLK-T6-1000PRO", price: "189.99", compareAtPrice: "219.99", uom: "EA", descriptionHtml: "<p>Fluke T6-1000 PRO non-contact electrical tester measures voltage (1–1000V AC), current (0.5–200A), and frequency without test leads, using FieldSense technology through the wire's insulation. CAT IV 600V / CAT III 1000V safety rated; VoltAlert for non-contact voltage detection. IP40 rated; includes holster.</p>", tags: ["tools-safety", "b2b-demo", "tester", "voltage", "fluke", "sale", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Fluke 1-year limited warranty.", specs: { "Voltage Measurement": "1–1,000V AC (FieldSense)", "Current Measurement": "0.5–200A AC (FieldSense)", "Frequency": "50/60 Hz", "CAT Rating": "CAT IV 600V / CAT III 1000V", "Non-Contact Voltage": "VoltAlert (NCV)", "IP Rating": "IP40", "Display": "Backlit LCD", "Included": "Holster, test leads" }, installGuideUrl: null, cadFileUrl: null, msrp: "249.99", inventoryQty: 18 },
  { title: "3M Safety Vest Class 2 (Carton of 6)", vendor: "3M", collection: "tools-safety", sku: "3M-VEST-C2-OR-CTN6", price: "89.99", compareAtPrice: null, uom: "CTN", descriptionHtml: "<p>3M high-visibility Class 2 safety vest in fluorescent orange with 2 in. silver retroreflective tape, carton of 6 (sizes M–XL available). Meets ANSI/ISEA 107-2020 Class 2 requirements for workers on or near roadways and job sites. Zipper front closure, two chest pockets, mic tab; machine washable polyester mesh.</p>", tags: ["tools-safety", "b2b-demo", "safety-vest", "class-2", "hi-vis", "bulk"], pricingTiers: [{ minQty: 2, unitPrice: 79.99 }, { minQty: 4, unitPrice: 72.99 }, { minQty: 8, unitPrice: 66.99 }], leadTime: "In Stock", warranty: "3M product satisfaction guarantee.", specs: { "ANSI Class": "Class 2", "Color": "Fluorescent Orange", "Reflective Tape": "2\" Silver Retroreflective", "Material": "Polyester Mesh", "Closure": "Zipper Front", "Pockets": "2 chest pockets + mic tab", "Available Sizes": "M–XL", "Qty per Carton": "6", "Standard": "ANSI/ISEA 107-2020" }, installGuideUrl: null, cadFileUrl: null, msrp: "119.99", inventoryQty: 42 },
  { title: "Pyramex Hard Hat White (Carton of 6)", vendor: "Pyramex", collection: "tools-safety", sku: "PYR-HP14110-WHT-CTN6", price: "74.99", compareAtPrice: "89.99", uom: "CTN", descriptionHtml: "<p>Pyramex HP14110 full brim hard hat in white, carton of 6, with 6-point nylon suspension and ratchet adjustment (6.5–8 in. head size). ANSI/ISEA Z89.1-2014 Type I Class E rated for electrical hazards up to 20,000V. ABS shell withstands impact and penetration; slots accept compatible accessories.</p>", tags: ["tools-safety", "b2b-demo", "hard-hat", "ppe", "pyramex", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Pyramex 1-year limited warranty.", specs: { "Type": "Full Brim", "Color": "White", "Shell Material": "ABS Plastic", "Suspension": "6-point nylon ratchet", "Head Size": "6.5–8\"", "Electrical Class": "Class E (up to 20,000V)", "Standard": "ANSI/ISEA Z89.1-2014 Type I", "Accessory Slots": "Yes", "Qty per Carton": "6" }, installGuideUrl: null, cadFileUrl: null, msrp: "109.99", inventoryQty: 35 },
  { title: "Ideal T-100 Wire Stripper/Cutter Kit", vendor: "Ideal Industries", collection: "tools-safety", sku: "IDL-T100-KIT-SET", price: "54.99", compareAtPrice: null, uom: "SET", descriptionHtml: "<p>Ideal Industries T-100 wire stripper and cutter kit including the T-100 stripper (strips 10–18 AWG solid, 12–20 AWG stranded), a matching wire cutter, and a screw-terminal crimper tool in a carrying pouch. Spring-loaded handles reduce hand fatigue; precision-ground blades for clean, nick-free stripping. Meets ANSI/ASME B107 tool standards.</p>", tags: ["tools-safety", "b2b-demo", "wire-stripper", "kit", "ideal", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Ideal Industries 1-year limited warranty.", specs: { "Includes": "T-100 stripper, wire cutter, crimper, carrying pouch", "Strip Range (Solid)": "10–18 AWG", "Strip Range (Stranded)": "12–20 AWG", "Crimper Type": "Screw-terminal crimp", "Handle": "Spring-loaded (reduces fatigue)", "Blade": "Precision-ground", "Standard": "ANSI/ASME B107" }, installGuideUrl: null, cadFileUrl: null, msrp: "74.99", inventoryQty: 28 },

  // lighting-fixtures additions (4 new)
  { title: "LED Exit Sign Green Letters 120/277V", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-EX1G-120277", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia EX1G LED exit sign, green letters, 120/277V, surface/ceiling/wall mount, battery backup, UL 924 listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "exit-sign", "led", "emergency", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 22.49 }, { minQty: 10, unitPrice: 19.99 }], leadTime: "In Stock", warranty: "Lithonia 3-year limited warranty.", specs: { "Letters": "Green", "Voltage": "120/277V Dual", "Battery": "90-min backup (included)", "Mount": "Surface/Ceiling/Wall", "Rated Life": "25+ years LED", "UL Listing": "UL 924" }, installGuideUrl: "/docs/install/lit-ex1g.pdf", cadFileUrl: null, msrp: "34.99", inventoryQty: 180 },
  { title: "Emergency Lighting Unit 2-Head 120/277V", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-ELM2-120277", price: "39.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia ELM2 LED emergency lighting unit, two 3.6W adjustable heads, 120/277V, 90-min battery backup, die-cast housing, UL 924 listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "emergency-lighting", "led", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 35.99 }, { minQty: 10, unitPrice: 31.99 }], leadTime: "In Stock", warranty: "Lithonia 3-year limited warranty.", specs: { "Heads": "2 adjustable", "Wattage/Head": "3.6W LED", "Voltage": "120/277V", "Battery": "6V 4.5Ah (90-min)", "Housing": "Die-cast aluminum", "UL Listing": "UL 924" }, installGuideUrl: "/docs/install/lit-elm2.pdf", cadFileUrl: null, msrp: "54.99", inventoryQty: 120 },
  { title: "Philips LED Corn Bulb 100W E39 Mogul 5000K", vendor: "Philips", collection: "lighting-fixtures", sku: "PHI-CORN-100W-E39-5K", price: "34.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Philips 100W LED corn bulb, E39 mogul base — 13,000 lm at 5000K, 360° beam, replaces 250W MH/HPS, 50,000-hr life, direct retrofit for post-top and high-bay fixtures.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "corn-bulb", "100w", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 31.99 }, { minQty: 10, unitPrice: 28.99 }, { minQty: 20, unitPrice: 25.99 }], leadTime: "In Stock", warranty: "Philips 3-year limited warranty.", specs: { "Wattage": "100W", "Lumens": "13,000 lm", "Color Temp": "5000K", "Base": "E39 Mogul", "Beam Angle": "360°", "Replaces": "250W MH/HPS", "Rated Life": "50,000 hrs", "Input Voltage": "100–277V" }, installGuideUrl: null, cadFileUrl: null, msrp: "49.99", inventoryQty: 215 },
  { title: "Lithonia 2x2 LED Troffer 30W 4000K", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-TROF-2X2-30W-4K", price: "64.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia 2 ft × 2 ft 30W LED lay-in troffer — 3,000 lm at 4000K, 0–10V dimming, 15/16 in. T-bar, DLC listed, 50,000-hr life.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "troffer", "2x2", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Lithonia 5-year limited warranty.", specs: { "Wattage": "30W", "Lumens": "3,000 lm", "Color Temp": "4000K", "CRI": "80+", "Size": "2 ft × 2 ft", "Voltage": "120–277V", "Dimming": "0–10V", "Grid": "15/16\" T-bar", "DLC Listed": "Yes" }, installGuideUrl: "/docs/install/lit-trof-2x2-30w-4k.pdf", cadFileUrl: "/cad/lit-trof-2x2-30w-4k.dxf", msrp: "94.99", inventoryQty: 72 },

  // switches-receptacles additions (4 new)
  { title: "Leviton 15A USB-A+C Duplex Outlet White", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-T5633-W", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Leviton T5633 15A duplex outlet with USB-A (2.4A) and USB-C (3.0A) fast-charge ports — white, no power block needed, UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "usb", "receptacle", "15a", "leviton", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "15A", "Voltage": "125V", "USB-A": "2.4A fast-charge", "USB-C": "3.0A fast-charge", "Config": "NEMA 5-15R", "Color": "White", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/lev-t5633.pdf", cadFileUrl: null, msrp: "34.99", inventoryQty: 145 },
  { title: "Leviton 30A 250V Range Outlet NEMA 14-30R", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-279-S", price: "18.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Leviton 279 30A 250V 4-wire range/dryer outlet, NEMA 14-30R, flush mount — for electric ranges, dryers, and EV chargers. UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "receptacle", "30a", "range", "leviton", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 16.99 }, { minQty: 10, unitPrice: 14.99 }], leadTime: "In Stock", warranty: "Leviton 2-year limited warranty.", specs: { "Amperage": "30A", "Voltage": "250V", "Config": "NEMA 14-30R (4-Wire)", "Application": "Range/Dryer/EV Charger", "Color": "Brown", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "26.99", inventoryQty: 220 },
  { title: "Hubbell 20A GFCI Decorator Receptacle White", vendor: "Hubbell", collection: "switches-receptacles", sku: "HUB-GFRST20W", price: "19.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hubbell GFRST20W 20A GFCI decorator-style receptacle, white — Class A 5 mA, self-test, slim profile for decorator wallplates. UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "gfci", "decorator", "20a", "hubbell", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Hubbell 3-year limited warranty.", specs: { "Amperage": "20A", "Voltage": "125V", "Config": "NEMA 5-20R", "Style": "Decorator", "GFCI Class": "Class A (5 mA)", "Self-Test": "Yes", "Color": "White", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/hub-gfrst20w.pdf", cadFileUrl: null, msrp: "27.99", inventoryQty: 165 },
  { title: "Leviton Decora Smart Wi-Fi Dimmer 600W", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-DW6HD-1BZ", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Leviton DW6HD 600W Wi-Fi dimmer — Alexa/Google/HomeKit, no hub, schedules, dimmable LED/CFL/incandescent. UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "smart-switch", "dimmer", "wi-fi", "leviton", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Leviton 5-year limited warranty.", specs: { "Load": "600W dimmable", "Voltage": "120V", "Connectivity": "Wi-Fi 2.4 GHz", "Voice": "Alexa, Google, HomeKit", "Style": "Decora", "Multi-Location": "Yes (add remote)", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/lev-dw6hd.pdf", cadFileUrl: null, msrp: "62.99", inventoryQty: 88 },

  // tools-safety additions (4 new)
  { title: "Klein 1/2in EMT Conduit Bender", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-51605-12EMT", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Klein 51605 1/2 in. EMT conduit bender — cast-iron head, 46 in. steel handle, dual-marked for EMT/IMC, back/stub/offset/saddle guides. ASME B107.17.</p>", tags: ["tools-safety", "b2b-demo", "conduit-bender", "emt", "klein", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 41.99 }, { minQty: 6, unitPrice: 38.99 }], leadTime: "In Stock", warranty: "Klein Tools lifetime warranty.", specs: { "Trade Size": "1/2\"", "Conduit Type": "EMT / IMC", "Head": "Cast Iron", "Handle": "46 in. steel", "Markings": "Back, stub, offset, saddle", "Standard": "ASME B107.17" }, installGuideUrl: null, cadFileUrl: null, msrp: "61.99", inventoryQty: 95 },
  { title: "Southwire 240ft Steel Fish Tape with Reel", vendor: "Southwire", collection: "tools-safety", sku: "SWR-FT240-STEEL", price: "59.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Southwire 240 ft steel fish tape — 1/4 in. blade, swivel hook, ratcheting rewind high-impact plastic reel for fast retraction in conduit.</p>", tags: ["tools-safety", "b2b-demo", "fish-tape", "southwire", "bulk"], pricingTiers: null, leadTime: "In Stock", warranty: "Southwire 1-year limited warranty.", specs: { "Length": "240 ft", "Blade Width": "1/4\"", "Blade Material": "Steel", "Hook": "Swivel", "Reel": "High-impact plastic, ratchet rewind" }, installGuideUrl: null, cadFileUrl: null, msrp: "79.99", inventoryQty: 68 },
  { title: "Klein Cable Fish Sticks 6ft 3-Pc Set", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-56050-6FT", price: "29.99", compareAtPrice: null, uom: "SET", descriptionHtml: "<p>Klein 56050 fiberglass cable fish sticks, 3 × 2 ft = 6 ft — hook and bullet-nose tips, glow-in-the-dark sections for routing cable through walls and ceilings.</p>", tags: ["tools-safety", "b2b-demo", "fish-sticks", "klein", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Klein Tools 1-year limited warranty.", specs: { "Total Length": "6 ft (3 × 2 ft)", "Material": "Fiberglass", "Tips": "Hook + Bullet Nose", "Glow Sections": "Yes", "Connect": "Threaded coupling" }, installGuideUrl: null, cadFileUrl: null, msrp: "41.99", inventoryQty: 112 },
  { title: "Ideal Roto-Split Conduit Knockout Reamer", vendor: "Ideal Industries", collection: "tools-safety", sku: "IDL-35-054-REAMER", price: "19.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Ideal Roto-Split 35-054 conduit reamer — removes 1/2 in. and 3/4 in. knockouts and deburrs conduit ends with one tool, cushion-grip handle.</p>", tags: ["tools-safety", "b2b-demo", "reamer", "knockout", "ideal"], pricingTiers: null, leadTime: "In Stock", warranty: "Ideal Industries 1-year limited warranty.", specs: { "Function": "Knockout removal + deburr", "Fits": "1/2\" and 3/4\" knockouts", "Material": "Hardened steel cutter", "Handle": "Cushion grip" }, installGuideUrl: null, cadFileUrl: null, msrp: "27.99", inventoryQty: 145 },

  // low-voltage (8)
  { title: "Belden Cat6 UTP CMR 1000ft Spool Gray", vendor: "Belden", collection: "low-voltage", sku: "BDN-CAT6-UTP-CMR-1000GY", price: "189.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>Belden 1000ft Cat6 UTP CMR riser pull box — 23 AWG solid copper, 4-pair, TIA/EIA-568-C.2 Cat6 performance, UL listed.</p>", tags: ["low-voltage", "b2b-demo", "cat6", "ethernet", "utp", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 174.99 }, { minQty: 6, unitPrice: 159.99 }], leadTime: "In Stock", warranty: "Belden limited warranty.", specs: { "Category": "Cat6", "Pairs": "4-pair UTP", "Conductor": "23 AWG Solid Copper", "Rating": "CMR Riser", "Length": "1000 ft", "Impedance": "100 Ω", "Standard": "TIA/EIA-568-C.2", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "259.99", inventoryQty: 85 },
  { title: "Belden Cat6A F/UTP CMR 1000ft Blue", vendor: "Belden", collection: "low-voltage", sku: "BDN-CAT6A-FUTP-CMR-1000BL", price: "329.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>Belden 1000ft Cat6A F/UTP foil-shielded riser — supports 10GBase-T to 100m, 23 AWG solid copper, CMR, TIA/EIA-568-C.2 compliant.</p>", tags: ["low-voltage", "b2b-demo", "cat6a", "ethernet", "shielded", "10gbe"], pricingTiers: [{ minQty: 3, unitPrice: 299.99 }, { minQty: 6, unitPrice: 279.99 }], leadTime: "Ships in 2-3 Days", warranty: "Belden limited warranty.", specs: { "Category": "Cat6A", "Pairs": "4-pair F/UTP", "Conductor": "23 AWG Solid Copper", "Shield": "Overall foil", "Rating": "CMR Riser", "Length": "1000 ft", "Standard": "10GBase-T / TIA-568-C.2", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "449.99", inventoryQty: 38 },
  { title: "CommScope RG6 Quad Shield Coax 500ft", vendor: "CommScope", collection: "low-voltage", sku: "CMS-RG6QS-500BLK", price: "79.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>CommScope 500ft RG6 quad-shield coax — 18 AWG solid copper, quad-shield, CMP/CM rated, for satellite, CATV, and antenna runs.</p>", tags: ["low-voltage", "b2b-demo", "rg6", "coax", "catv", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 72.99 }, { minQty: 6, unitPrice: 64.99 }], leadTime: "In Stock", warranty: "CommScope limited warranty.", specs: { "Type": "RG6 Quad Shield", "Center": "18 AWG Solid Copper", "Impedance": "75 Ω", "Shield": "Quad (foil + braid × 2)", "Rating": "CMP/CM", "Length": "500 ft", "Application": "Satellite/CATV/Antenna" }, installGuideUrl: null, cadFileUrl: null, msrp: "109.99", inventoryQty: 65 },
  { title: "West Penn 18/2 Shielded Security Cable 500ft", vendor: "West Penn Wire", collection: "low-voltage", sku: "WPN-182SH-500BLK", price: "64.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>West Penn 18/2 AWG shielded security/alarm cable, 500ft — foil shield with drain wire, CM rated for alarms, access control, and intercom wiring.</p>", tags: ["low-voltage", "b2b-demo", "security-cable", "shielded", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 59.99 }, { minQty: 6, unitPrice: 54.99 }], leadTime: "In Stock", warranty: "West Penn Wire limited warranty.", specs: { "Conductors": "2", "AWG": "18", "Shield": "Foil + drain wire", "Rating": "CM", "Length": "500 ft", "Application": "Security/alarm/access control", "Jacket": "PVC Black" }, installGuideUrl: null, cadFileUrl: null, msrp: "89.99", inventoryQty: 72 },
  { title: "Honeywell FPL Fire Alarm Cable 18/2 1000ft Red", vendor: "Honeywell", collection: "low-voltage", sku: "HNY-FPL-182-1000RD", price: "129.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>Honeywell 18/2 AWG FPL plenum fire alarm cable, 1000ft, red jacket — NFPA 72 compliant for air-handling spaces, power-limited fire alarm circuits.</p>", tags: ["low-voltage", "b2b-demo", "fire-alarm", "fpl", "plenum", "new"], pricingTiers: [{ minQty: 3, unitPrice: 119.99 }, { minQty: 6, unitPrice: 109.99 }], leadTime: "In Stock", warranty: "Honeywell limited warranty.", specs: { "Conductors": "2", "AWG": "18", "Rating": "FPL Plenum", "Standard": "NFPA 72", "Length": "1000 ft", "Jacket": "PVC Red", "Application": "Fire alarm initiating/indicating" }, installGuideUrl: null, cadFileUrl: null, msrp: "179.99", inventoryQty: 48 },
  { title: "Belden Cat5e UTP CMR 1000ft Gray", vendor: "Belden", collection: "low-voltage", sku: "BDN-CAT5E-UTP-CMR-1000GY", price: "139.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>Belden 1000ft Cat5e UTP CMR riser — 24 AWG solid copper, 4-pair, 100BASE-T/1000BASE-T to 100m, TIA/EIA-568-C.2, UL listed.</p>", tags: ["low-voltage", "b2b-demo", "cat5e", "ethernet", "utp", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 124.99 }, { minQty: 6, unitPrice: 114.99 }], leadTime: "In Stock", warranty: "Belden limited warranty.", specs: { "Category": "Cat5e", "Pairs": "4-pair UTP", "Conductor": "24 AWG Solid Copper", "Rating": "CMR Riser", "Length": "1000 ft", "Impedance": "100 Ω", "Standard": "TIA/EIA-568-C.2", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "189.99", inventoryQty: 62 },
  { title: "West Penn 22/4 Shielded Instrumentation Cable 1000ft", vendor: "West Penn Wire", collection: "low-voltage", sku: "WPN-224INST-1000", price: "149.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>West Penn 22/4 AWG individually-shielded instrumentation cable, 1000ft — two foil-shielded pairs with drain wires for 4–20mA and sensor runs in industrial environments.</p>", tags: ["low-voltage", "b2b-demo", "instrumentation", "shielded", "industrial"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "West Penn Wire limited warranty.", specs: { "Conductors": "4 (2 pairs)", "AWG": "22", "Shield": "Individual foil per pair + drain", "Rating": "CM", "Length": "1000 ft", "Application": "4–20mA sensors/control" }, installGuideUrl: null, cadFileUrl: null, msrp: "209.99", inventoryQty: 28 },
  { title: "Belden 16/2 In-Wall Speaker Wire CL2 500ft", vendor: "Belden", collection: "low-voltage", sku: "BDN-162SPK-CL2-500", price: "49.99", compareAtPrice: null, uom: "SPOOL", descriptionHtml: "<p>Belden 500ft 16/2 AWG CL2-rated in-wall speaker wire — oxygen-free copper, color-coded for polarity, for residential in-wall audio installations.</p>", tags: ["low-voltage", "b2b-demo", "speaker-wire", "cl2", "audio", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 44.99 }, { minQty: 6, unitPrice: 39.99 }], leadTime: "In Stock", warranty: "Belden limited warranty.", specs: { "AWG": "16", "Conductors": "2", "Conductor": "OFC", "Rating": "CL2 In-Wall", "Length": "500 ft", "Jacket": "PVC color-coded", "Application": "In-wall speaker runs" }, installGuideUrl: null, cadFileUrl: null, msrp: "69.99", inventoryQty: 95 },

  // motors-controls (8)
  { title: "Square D TeSys 9A 3-Pole Contactor 120V Coil", vendor: "Square D", collection: "motors-controls", sku: "SQD-LC1D09G7-9A", price: "34.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D TeSys LC1D09G7 9A 3-pole contactor, 120V AC coil — 5 HP @ 230V, snap-on aux contacts, DIN rail mount, UL listed.</p>", tags: ["motors-controls", "b2b-demo", "contactor", "9a", "square-d"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Square D 1-year limited warranty.", specs: { "Amperage": "9A (AC3)", "Poles": "3P", "Coil Voltage": "120V AC", "HP @ 230V": "5 HP", "Mount": "DIN Rail", "Aux Contact": "1 NO add-on", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "49.99", inventoryQty: 45 },
  { title: "Square D NEMA Size 1 Magnetic Starter 18A", vendor: "Square D", collection: "motors-controls", sku: "SQD-8536SBG1V02-18A", price: "189.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D Class 8536 NEMA Size 1 magnetic starter, 18A — with melting alloy overload relay, 3-phase, 7.5–10 HP, NEMA 1 enclosure included.</p>", tags: ["motors-controls", "b2b-demo", "motor-starter", "nema-size-1", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Square D 1-year limited warranty.", specs: { "NEMA Size": "1", "Amperage": "18A", "HP @ 460V": "10 HP", "Overload": "Melting alloy", "Enclosure": "NEMA 1 (included)", "Voltage": "200–600V", "UL Listed": "Yes" }, installGuideUrl: "/docs/install/sqd-8536-size1.pdf", cadFileUrl: null, msrp: "259.99", inventoryQty: 12 },
  { title: "Eaton XTCE018 IEC Contactor 18A 24VDC Coil", vendor: "Eaton", collection: "motors-controls", sku: "ETN-XTCE018B10T-18A", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Eaton XTCE018 18A IEC contactor, 24V DC coil — 3-pole, 7.5 HP @ 460V, DIN rail mount, IEC 60947-4-1.</p>", tags: ["motors-controls", "b2b-demo", "contactor", "18a", "iec", "eaton"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Eaton 1-year limited warranty.", specs: { "Amperage": "18A (AC3)", "Poles": "3P", "Coil Voltage": "24V DC", "HP @ 460V": "7.5 HP", "Mount": "DIN Rail", "Standard": "IEC 60947-4-1" }, installGuideUrl: null, cadFileUrl: null, msrp: "62.99", inventoryQty: 38 },
  { title: "Allen-Bradley PowerFlex 525 VFD 2HP 240V", vendor: "Allen-Bradley", collection: "motors-controls", sku: "ABB-25B-D4P0N114-2HP", price: "324.99", compareAtPrice: "389.99", uom: "EA", descriptionHtml: "<p>Allen-Bradley PowerFlex 525 2HP 240V AC drive — EtherNet/IP, Safe Torque Off, single-phase input, IP20, sensorless vector control.</p>", tags: ["motors-controls", "b2b-demo", "vfd", "variable-speed", "allen-bradley", "sale"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Allen-Bradley 1-year limited warranty.", specs: { "HP": "2", "Input": "240V 1Ø", "Output": "0–240V 3Ø", "Output Current": "4.0A", "Control": "Sensorless Vector", "Network": "EtherNet/IP", "Safety": "STO (Safe Torque Off)", "IP Rating": "IP20" }, installGuideUrl: "/docs/install/abr-25b-vfd.pdf", cadFileUrl: null, msrp: "499.99", inventoryQty: 8 },
  { title: "Allen-Bradley 140MT Motor Protector 10-16A", vendor: "Allen-Bradley", collection: "motors-controls", sku: "ABB-140MT-D9E-C16-16A", price: "89.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Allen-Bradley 140MT manual motor protector, 10–16A — combines manual switch + overload + short-circuit protection, DIN rail mount.</p>", tags: ["motors-controls", "b2b-demo", "motor-protector", "allen-bradley"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Allen-Bradley 1-year limited warranty.", specs: { "Trip Range": "10–16A adjustable", "Functions": "Manual switch + overload + short-circuit", "Mount": "DIN Rail", "Breaking Capacity": "65 kA (fused)", "Voltage": "600V max", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "124.99", inventoryQty: 22 },
  { title: "Eaton DS7 Soft Starter 12A 200-480V 3-Phase", vendor: "Eaton", collection: "motors-controls", sku: "ETN-DS701342ND-12A", price: "249.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Eaton DS7 12A 200–480V 3-phase soft starter — reduces starting current, 1–30s adjustable ramp, integrated bypass, DIN rail, UL 508.</p>", tags: ["motors-controls", "b2b-demo", "soft-starter", "eaton", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Eaton 1-year limited warranty.", specs: { "Current": "12A", "Voltage": "200–480V AC 3Ø", "Ramp Time": "1–30s adjustable", "Bypass": "Integrated", "Standard": "UL 508", "IP Rating": "IP20" }, installGuideUrl: "/docs/install/etn-ds7.pdf", cadFileUrl: null, msrp: "349.99", inventoryQty: 6 },
  { title: "Square D TeSys Overload Relay 7-10A", vendor: "Square D", collection: "motors-controls", sku: "SQD-LRD14-TESYS-10A", price: "29.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D TeSys LRD14 7–10A bimetallic overload relay — mounts on LC1D contactors, auto/manual reset, 3-phase with phase loss protection.</p>", tags: ["motors-controls", "b2b-demo", "overload-relay", "square-d", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 26.99 }, { minQty: 10, unitPrice: 24.99 }], leadTime: "In Stock", warranty: "Square D 1-year limited warranty.", specs: { "Trip Range": "7–10A adjustable", "Type": "Bimetallic", "Reset": "Auto or Manual", "Mounts On": "LC1D09–LC1D32", "Protection": "3-phase + phase loss" }, installGuideUrl: null, cadFileUrl: null, msrp: "42.99", inventoryQty: 55 },
  { title: "Siemens SIRIUS 25A 3-Pole Contactor 120V Coil", vendor: "Siemens", collection: "motors-controls", sku: "SIE-3RT1026-1AN20-25A", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Siemens SIRIUS 3RT1026 25A 3-pole contactor, 120V coil — 10 HP @ 460V, 1 NO aux contact, DIN rail mount, IEC 60947-4-1.</p>", tags: ["motors-controls", "b2b-demo", "contactor", "25a", "siemens"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Siemens 1-year limited warranty.", specs: { "Amperage": "25A (AC3)", "Poles": "3P", "Coil Voltage": "120V AC", "HP @ 460V": "10 HP", "Aux Contact": "1 NO", "Mount": "DIN Rail", "Standard": "IEC 60947-4-1" }, installGuideUrl: null, cadFileUrl: null, msrp: "74.99", inventoryQty: 32 },

  // transformers (7)
  { title: "Acme 1kVA 480V-120/240V Step-Down Transformer", vendor: "Acme Electric", collection: "transformers", sku: "ACM-T181051-1KVA", price: "189.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Acme T-1-81051 1kVA single-phase dry-type transformer, 480V primary / 120/240V secondary — NEMA 1 enclosure, UL listed.</p>", tags: ["transformers", "b2b-demo", "transformer", "1kva", "acme", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Acme Electric 1-year limited warranty.", specs: { "kVA": "1", "Phase": "Single", "Primary": "480V", "Secondary": "120/240V", "Type": "Dry-Type Step-Down", "Insulation": "130°C (B)", "Enclosure": "NEMA 1", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: "/cad/acm-t181051.dxf", msrp: "259.99", inventoryQty: 18 },
  { title: "Hammond 500VA 120/240V-24V Control Transformer", vendor: "Hammond Manufacturing", collection: "transformers", sku: "HMD-HPS050AGB-500VA", price: "69.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hammond HPS050AGB 500VA single-phase machine tool control transformer, 120/240V primary / 24V secondary — foot mount, UL/CSA listed.</p>", tags: ["transformers", "b2b-demo", "control-transformer", "500va", "hammond", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 63.99 }, { minQty: 6, unitPrice: 57.99 }], leadTime: "In Stock", warranty: "Hammond 1-year limited warranty.", specs: { "VA": "500", "Phase": "Single", "Primary": "120/240V dual", "Secondary": "24V", "Type": "Machine Tool Control", "Mount": "Foot", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: null, msrp: "94.99", inventoryQty: 42 },
  { title: "Square D 3kVA 480-208Y/120V 3-Phase Transformer", vendor: "Square D", collection: "transformers", sku: "SQD-EX12S3H-3KVA", price: "449.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D EX12S3H 3kVA 3-phase 480Δ–208Y/120V dry-type distribution transformer, 150°C insulation, NEMA 1 ventilated enclosure, UL listed.</p>", tags: ["transformers", "b2b-demo", "transformer", "3kva", "3-phase", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Square D 1-year limited warranty.", specs: { "kVA": "3", "Phase": "3-Phase", "Primary": "480V Delta", "Secondary": "208Y/120V", "Insulation": "150°C", "Enclosure": "NEMA 1 Ventilated", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: "/cad/sqd-ex12s3h.dxf", msrp: "599.99", inventoryQty: 5 },
  { title: "Acme 2kVA 480V-120/240V General Purpose Transformer", vendor: "Acme Electric", collection: "transformers", sku: "ACM-T281050-2KVA", price: "279.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Acme T-2-81050 2kVA single-phase 480V–120/240V GPT — for lighting and receptacle circuits fed from 480V systems, NEMA 1 enclosure, UL listed.</p>", tags: ["transformers", "b2b-demo", "transformer", "2kva", "acme"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Acme Electric 1-year limited warranty.", specs: { "kVA": "2", "Phase": "Single", "Primary": "480V", "Secondary": "120/240V", "Type": "Dry-Type GPT", "Insulation": "130°C", "Enclosure": "NEMA 1", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "379.99", inventoryQty: 10 },
  { title: "Hammond 100VA 120/240V-24V Control Transformer", vendor: "Hammond Manufacturing", collection: "transformers", sku: "HMD-HPS010AGB-100VA", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hammond HPS010AGB 100VA control transformer, 120/240V–24V — compact foot mount for relay panels and solenoid circuits, UL/CSA listed.</p>", tags: ["transformers", "b2b-demo", "control-transformer", "100va", "hammond", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 40.99 }, { minQty: 10, unitPrice: 36.99 }], leadTime: "In Stock", warranty: "Hammond 1-year limited warranty.", specs: { "VA": "100", "Phase": "Single", "Primary": "120/240V dual", "Secondary": "24V", "Mount": "Foot", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: null, msrp: "62.99", inventoryQty: 68 },
  { title: "Acme 3kVA 240/480V-120/240V GPT Transformer", vendor: "Acme Electric", collection: "transformers", sku: "ACM-T381057-3KVA", price: "379.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Acme T-3-81057 3kVA single-phase 240/480V–120/240V general purpose dry-type transformer — multi-tap primary, NEMA 1 enclosure, UL listed.</p>", tags: ["transformers", "b2b-demo", "transformer", "3kva", "acme", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Acme Electric 1-year limited warranty.", specs: { "kVA": "3", "Phase": "Single", "Primary": "240/480V multi-tap", "Secondary": "120/240V", "Type": "Dry-Type GPT", "Insulation": "130°C", "Enclosure": "NEMA 1", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "499.99", inventoryQty: 8 },
  { title: "Square D 15kVA 3-Phase 480-208Y/120V Transformer", vendor: "Square D", collection: "transformers", sku: "SQD-EXN15T-15KVA", price: "1899.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D EXN15T 15kVA 3-phase 480Δ–208Y/120V dry-type distribution transformer — DOE 2016 efficiency, 220°C insulation, NEMA 1 ventilated enclosure, UL listed.</p>", tags: ["transformers", "b2b-demo", "transformer", "15kva", "3-phase", "square-d", "new"], pricingTiers: null, leadTime: "Ships in 1-2 Weeks", warranty: "Square D 1-year limited warranty.", specs: { "kVA": "15", "Phase": "3-Phase", "Primary": "480V Delta", "Secondary": "208Y/120V", "Insulation": "220°C", "Efficiency": "DOE 2016", "Enclosure": "NEMA 1 Ventilated", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: "/cad/sqd-exn15t.dxf", msrp: "2499.99", inventoryQty: 2 },

  // enclosures (8)
  { title: "Hoffman 12x12x6 NEMA 4 Carbon Steel Enclosure", vendor: "Hoffman/nVent", collection: "enclosures", sku: "HFM-A12126CH-NM4", price: "89.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hoffman A12126CH 12×12×6 NEMA 4/IP66 carbon steel enclosure — continuous hinge, quarter-turn latch, oil-resistant gasket, ANSI 61 gray.</p>", tags: ["enclosures", "b2b-demo", "nema-4", "steel", "enclosure", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 82.99 }, { minQty: 6, unitPrice: 75.99 }], leadTime: "In Stock", warranty: "Hoffman/nVent 1-year limited warranty.", specs: { "Dimensions": "12\" H × 12\" W × 6\" D", "NEMA Rating": "4 / IP66", "Material": "Carbon Steel", "Gasket": "Oil-resistant foam", "Latch": "Quarter-turn", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: "/cad/hfm-a12126ch.dxf", msrp: "124.99", inventoryQty: 35 },
  { title: "Hoffman 16x14x6 NEMA 1 Steel Enclosure", vendor: "Hoffman/nVent", collection: "enclosures", sku: "HFM-A1614CH-NM1", price: "64.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hoffman A1614CH 16×14×6 NEMA 1 steel enclosure for indoor dry locations — continuous hinge, door latch, ANSI 61 gray, knockouts included.</p>", tags: ["enclosures", "b2b-demo", "nema-1", "steel", "enclosure", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 58.99 }, { minQty: 6, unitPrice: 53.99 }], leadTime: "In Stock", warranty: "Hoffman/nVent 1-year limited warranty.", specs: { "Dimensions": "16\" H × 14\" W × 6\" D", "NEMA Rating": "1 Indoor Dry", "Material": "Carbon Steel", "Knockouts": "Multiple (top/side/bottom)", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: null, msrp: "89.99", inventoryQty: 42 },
  { title: "Hubbell-Raco 4in Square Steel Box 2-1/8in Deep", vendor: "Hubbell-Raco", collection: "enclosures", sku: "HUB-RACO270-4SQ", price: "3.49", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hubbell-Raco 270 4 in. square drawn steel outlet box, 2-1/8 in. deep, 30.3 cu in. — 1/2 in. and 3/4 in. knockouts, UL listed.</p>", tags: ["enclosures", "b2b-demo", "junction-box", "4-square", "steel", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 2.99 }, { minQty: 25, unitPrice: 2.69 }, { minQty: 50, unitPrice: 2.49 }], leadTime: "In Stock", warranty: "Hubbell-Raco product warranty.", specs: { "Size": "4\" Square", "Depth": "2-1/8\"", "Volume": "30.3 cu in.", "Material": "Steel drawn", "Knockouts": "1/2\" and 3/4\"", "NEC": "Art. 314", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "4.99", inventoryQty: 580 },
  { title: "Carlon 4in Square PVC Junction Box", vendor: "Carlon", collection: "enclosures", sku: "CAR-E989NHR-4SQ", price: "2.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Carlon E989NHR 4 in. square Schedule 40 PVC junction box, 2-1/8 in. deep — for PVC conduit systems in concrete or masonry, non-metallic, UL listed.</p>", tags: ["enclosures", "b2b-demo", "junction-box", "pvc", "non-metallic", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 2.49 }, { minQty: 25, unitPrice: 2.19 }, { minQty: 50, unitPrice: 1.99 }], leadTime: "In Stock", warranty: "Carlon product warranty.", specs: { "Size": "4\" Square", "Depth": "2-1/8\"", "Material": "Schedule 40 PVC", "Color": "Gray", "Knockouts": "1/2\" and 3/4\"", "NEC": "Art. 314", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "4.49", inventoryQty: 420 },
  { title: "Hoffman 20x16x8 NEMA 12 Steel Enclosure", vendor: "Hoffman/nVent", collection: "enclosures", sku: "HFM-A20168-NM12", price: "139.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hoffman A20168 20×16×8 NEMA 12/IP54 steel enclosure — protects against dust, dirt, and oil; quarter-turn latches, oil-resistant gasket.</p>", tags: ["enclosures", "b2b-demo", "nema-12", "steel", "enclosure", "industrial"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Hoffman/nVent 1-year limited warranty.", specs: { "Dimensions": "20\" H × 16\" W × 8\" D", "NEMA Rating": "12 / IP54", "Material": "Carbon Steel", "Protection": "Dust, dirt, oil splash", "Latch": "Quarter-turn (×2)", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: "/cad/hfm-a20168.dxf", msrp: "189.99", inventoryQty: 18 },
  { title: "Hubbell-Raco 4in Round Pancake Ceiling Box", vendor: "Hubbell-Raco", collection: "enclosures", sku: "HUB-RACO232-4RND", price: "2.49", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hubbell-Raco 232 4 in. round pancake box, 1/2 in. deep, 6.0 cu in. — for ceiling light fixtures on joists, 1/2 in. knockouts, UL listed.</p>", tags: ["enclosures", "b2b-demo", "ceiling-box", "round", "steel", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 2.19 }, { minQty: 25, unitPrice: 1.89 }, { minQty: 50, unitPrice: 1.69 }], leadTime: "In Stock", warranty: "Hubbell-Raco product warranty.", specs: { "Size": "4\" Round", "Depth": "1/2\"", "Volume": "6.0 cu in.", "Material": "Steel", "Application": "Ceiling light fixtures", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "3.99", inventoryQty: 640 },
  { title: "Hoffman 8x8x6 NEMA 4X Stainless Enclosure", vendor: "Hoffman/nVent", collection: "enclosures", sku: "HFM-A808CHNFSS-NM4X", price: "149.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Hoffman A808CHNFSS 8×8×6 NEMA 4X Type 316 stainless steel enclosure — for food processing, marine, and chemical environments; hinged, quarter-turn latch.</p>", tags: ["enclosures", "b2b-demo", "nema-4x", "stainless", "enclosure", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Hoffman/nVent 1-year limited warranty.", specs: { "Dimensions": "8\" H × 8\" W × 6\" D", "NEMA Rating": "4X / IP66", "Material": "316 Stainless Steel", "Applications": "Food, chemical, marine", "Gasket": "Neoprene", "UL/CSA": "Listed" }, installGuideUrl: null, cadFileUrl: null, msrp: "199.99", inventoryQty: 12 },
  { title: "Wiegmann 10x10x5 NEMA 1 Hinged Enclosure", vendor: "Wiegmann", collection: "enclosures", sku: "WGM-SC101005-NM1", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Wiegmann SC101005 10×10×5 NEMA 1 hinged steel enclosure — gray enamel, padlock hasp, removable back panel, UL listed.</p>", tags: ["enclosures", "b2b-demo", "nema-1", "steel", "enclosure", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 49.99 }, { minQty: 6, unitPrice: 44.99 }], leadTime: "In Stock", warranty: "Wiegmann product warranty.", specs: { "Dimensions": "10\" H × 10\" W × 5\" D", "NEMA Rating": "1 Indoor Dry", "Material": "Carbon Steel", "Back Panel": "Removable", "Padlock": "Hasp provided", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "74.99", inventoryQty: 28 },

  // cable-management (7)
  { title: "Wiremold V2010 Surface Raceway 10ft White", vendor: "Legrand/Wiremold", collection: "cable-management", sku: "LGR-V2010C2-10FT", price: "19.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Wiremold V2010 2-channel PVC surface raceway, 10 ft — hinged snap-on cover, white, for wall surface wiring in offices and classrooms, UL listed.</p>", tags: ["cable-management", "b2b-demo", "raceway", "wiremold", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 17.99 }, { minQty: 10, unitPrice: 15.99 }], leadTime: "In Stock", warranty: "Legrand/Wiremold limited warranty.", specs: { "Channels": "2", "Length": "10 ft", "Material": "PVC", "Color": "White (paintable)", "Cover": "Hinged snap-on", "Base Width": "1-5/8\"", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "27.99", inventoryQty: 120 },
  { title: "Cooper B-Line 4in Ladder Cable Tray 12ft", vendor: "Cooper B-Line/Eaton", collection: "cable-management", sku: "CBL-9B4A12FT-4LDR", price: "84.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Cooper B-Line 4 in. wide 9-Series aluminum ladder cable tray, 12 ft — 6 in. rung spacing, flanged rail, for power/data cable management. UL listed.</p>", tags: ["cable-management", "b2b-demo", "cable-tray", "ladder", "aluminum", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 76.99 }, { minQty: 6, unitPrice: 69.99 }], leadTime: "Ships in 2-3 Days", warranty: "Cooper B-Line product warranty.", specs: { "Width": "4\"", "Length": "12 ft", "Material": "Aluminum", "Type": "Ladder", "Rung Spacing": "6\"", "Rail": "Flanged", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "119.99", inventoryQty: 22 },
  { title: "Cooper B-Line P1000T Slotted Strut Channel 10ft", vendor: "Cooper B-Line/Eaton", collection: "cable-management", sku: "CBL-P1000T-10FT", price: "18.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Cooper B-Line P1000T 1-5/8 × 1-5/8 in. slotted Unistrut-compatible strut channel, 10 ft — 12-gauge galvanized steel for equipment mounting, conduit hangers, and cable support.</p>", tags: ["cable-management", "b2b-demo", "strut", "unistrut", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 16.99 }, { minQty: 10, unitPrice: 14.99 }, { minQty: 20, unitPrice: 12.99 }], leadTime: "In Stock", warranty: "Cooper B-Line product warranty.", specs: { "Size": "1-5/8\" × 1-5/8\"", "Length": "10 ft", "Material": "12-gauge steel", "Finish": "Hot-dip galvanized", "Slot": "9/16\" × 1-5/8\" standard" }, installGuideUrl: null, cadFileUrl: null, msrp: "25.99", inventoryQty: 185 },
  { title: "Wiremold V4000 Multi-Channel Raceway 6ft White", vendor: "Legrand/Wiremold", collection: "cable-management", sku: "LGR-V4000C2-6FT", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Wiremold V4000 4-channel PVC surface raceway, 6 ft, white — separates power from data/AV, snap-on cover for conference rooms and retail. UL listed.</p>", tags: ["cable-management", "b2b-demo", "raceway", "wiremold", "4-channel"], pricingTiers: null, leadTime: "In Stock", warranty: "Legrand/Wiremold limited warranty.", specs: { "Channels": "4", "Length": "6 ft", "Material": "PVC", "Color": "White", "Cover": "Snap-on", "Base Width": "4\"", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "34.99", inventoryQty: 85 },
  { title: "Thomas & Betts Ty-Rap Cable Ties 14.5in (100/bag)", vendor: "Thomas & Betts", collection: "cable-management", sku: "TNB-TY528MX-100", price: "12.99", compareAtPrice: null, uom: "BG", descriptionHtml: "<p>T&B Ty-Rap 14.5 in. × 0.19 in. nylon cable ties, bag of 100 — 50 lb loop tensile, natural nylon, for indoor/outdoor bundling. UL/CSA listed.</p>", tags: ["cable-management", "b2b-demo", "cable-ties", "ty-rap", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 10.99 }, { minQty: 10, unitPrice: 9.49 }, { minQty: 20, unitPrice: 7.99 }], leadTime: "In Stock", warranty: "Thomas & Betts product warranty.", specs: { "Length": "14.5\"", "Width": "0.19\"", "Material": "Nylon 6/6", "Tensile": "50 lb", "Bundle Diameter": "Up to 3.5\"", "Color": "Natural", "Qty/Bag": "100", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "17.99", inventoryQty: 380 },
  { title: "Cooper B-Line 6in Wire Basket Cable Tray 10ft", vendor: "Cooper B-Line/Eaton", collection: "cable-management", sku: "CBL-C4B30-6WBT", price: "109.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Cooper B-Line C4B30 6 in. wire basket cable tray, 10 ft — coated steel mesh for data center and telecom cable management, flexible routing. UL listed.</p>", tags: ["cable-management", "b2b-demo", "wire-basket", "cable-tray", "data-center"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Cooper B-Line product warranty.", specs: { "Width": "6\"", "Length": "10 ft", "Material": "Steel wire mesh", "Finish": "Zinc plated", "Type": "Wire basket open mesh", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "149.99", inventoryQty: 15 },
  { title: "Panduit 4in Wiring Duct with Cover 6ft", vendor: "Panduit", collection: "cable-management", sku: "PDT-F4X4LG6-4WD", price: "22.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Panduit 4 × 4 in. wiring duct with slotted cover, 6 ft — PVC gray, for cable routing inside control panels and enclosures. UL listed.</p>", tags: ["cable-management", "b2b-demo", "wiring-duct", "panduit", "panel", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 19.99 }, { minQty: 10, unitPrice: 17.99 }], leadTime: "In Stock", warranty: "Panduit limited warranty.", specs: { "Size": "4\" W × 4\" H", "Length": "6 ft", "Material": "PVC", "Color": "Gray", "Cover": "Slotted, removable", "Application": "Control panel routing", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "31.99", inventoryQty: 95 },

  // grounding-bonding (6)
  { title: "nVent Erico 5/8in × 8ft Copper-Bonded Ground Rod", vendor: "nVent/Erico", collection: "grounding-bonding", sku: "ERI-615800-5858GR", price: "14.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>nVent Erico 5/8 × 8 ft copper-bonded ground rod — 254 micron copper over steel, pointed tip, per NEC 250.52, UL listed.</p>", tags: ["grounding-bonding", "b2b-demo", "ground-rod", "copper-bonded", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 12.99 }, { minQty: 25, unitPrice: 10.99 }, { minQty: 50, unitPrice: 9.49 }], leadTime: "In Stock", warranty: "nVent/Erico limited warranty.", specs: { "Diameter": "5/8\"", "Length": "8 ft", "Core": "Steel", "Coating": "254 micron copper bonded", "Tip": "Pointed", "NEC": "250.52", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "21.99", inventoryQty: 240 },
  { title: "nVent Erico Ground Rod Acorn Clamp 5/8in (25/bag)", vendor: "nVent/Erico", collection: "grounding-bonding", sku: "ERI-698005-CLAMP25", price: "44.99", compareAtPrice: null, uom: "BG", descriptionHtml: "<p>nVent Erico 5/8 in. acorn ground rod clamp, bag of 25 — bronze alloy, accepts #6–2/0 AWG ground wire, UL listed.</p>", tags: ["grounding-bonding", "b2b-demo", "ground-rod-clamp", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 39.99 }, { minQty: 6, unitPrice: 34.99 }], leadTime: "In Stock", warranty: "nVent/Erico limited warranty.", specs: { "Fits Rod": "5/8\"", "Wire Range": "#6–2/0 AWG", "Material": "Bronze alloy", "Qty/Bag": "25", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "62.99", inventoryQty: 95 },
  { title: "Burndy K4C25 #4 AWG Water Pipe Ground Clamp", vendor: "Burndy", collection: "grounding-bonding", sku: "BNY-K4C25-GND", price: "12.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Burndy K4C25 #4 AWG copper water pipe grounding clamp — 3/4–1 in. pipe, bronze alloy, UL 467 listed.</p>", tags: ["grounding-bonding", "b2b-demo", "ground-clamp", "water-pipe", "burndy"], pricingTiers: null, leadTime: "In Stock", warranty: "Burndy product warranty.", specs: { "Wire Size": "#4 AWG", "Pipe Size": "3/4\"–1\"", "Material": "Bronze alloy", "Wire Type": "Solid or stranded", "UL Listing": "UL 467" }, installGuideUrl: null, cadFileUrl: null, msrp: "17.99", inventoryQty: 145 },
  { title: "Ilsco GBL-4/0 2-Hole Aluminum Grounding Lug", vendor: "Ilsco", collection: "grounding-bonding", sku: "ILC-GBL4O-2HOLE", price: "18.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Ilsco GBL-4/0 2-hole aluminum mechanical lug for bus bar grounding — accepts #6–350 kcmil Al/Cu, two 1/4 in. mounting holes, UL listed.</p>", tags: ["grounding-bonding", "b2b-demo", "grounding-lug", "ilsco", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 16.99 }, { minQty: 10, unitPrice: 14.99 }], leadTime: "In Stock", warranty: "Ilsco product warranty.", specs: { "Wire Range": "#6–350 kcmil", "Mounting": "2-hole (1/4\" bolts)", "Material": "Aluminum", "Conductor": "Al or Cu", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "26.99", inventoryQty: 88 },
  { title: "nVent Erico Braided Bonding Jumper 6AWG 24in", vendor: "nVent/Erico", collection: "grounding-bonding", sku: "ERI-BJ624-BOND", price: "9.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>nVent Erico 6 AWG braided copper bonding jumper, 24 in. with lugs — for equipment bonding in panels and enclosures, UL 467 listed.</p>", tags: ["grounding-bonding", "b2b-demo", "bonding-jumper", "erico", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 8.99 }, { minQty: 10, unitPrice: 7.99 }], leadTime: "In Stock", warranty: "nVent/Erico limited warranty.", specs: { "AWG": "6", "Length": "24 in.", "Type": "Braided copper with lugs", "Application": "Equipment bonding", "UL Listing": "UL 467" }, installGuideUrl: null, cadFileUrl: null, msrp: "13.99", inventoryQty: 220 },
  { title: "Burndy YR100A Mechanical Connector Lug (5/bag)", vendor: "Burndy", collection: "grounding-bonding", sku: "BNY-YR100A-5PK", price: "24.99", compareAtPrice: null, uom: "BG", descriptionHtml: "<p>Burndy YR100A single-barrel 2-set-screw mechanical lug, bag of 5 — #6–1/0 AWG Cu/Al, for service entrance, grounding, and main bonding, UL listed.</p>", tags: ["grounding-bonding", "b2b-demo", "mechanical-lug", "burndy", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 21.99 }, { minQty: 6, unitPrice: 18.99 }], leadTime: "In Stock", warranty: "Burndy product warranty.", specs: { "Wire Range": "#6–1/0 AWG", "Set Screws": "2", "Material": "Aluminum alloy", "Conductor": "Cu or Al", "Qty/Bag": "5", "UL Listed": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "34.99", inventoryQty: 75 },

  // test-measurement (7)
  { title: "Fluke 117 True-RMS Electrician's Multimeter", vendor: "Fluke", collection: "test-measurement", sku: "FLK-117-MULTIMETER", price: "179.99", compareAtPrice: "209.99", uom: "EA", descriptionHtml: "<p>Fluke 117 true-RMS multimeter — 600V AC/DC, 10A, resistance, capacitance, frequency, diode, NCV VoltAlert built in. CAT III 600V.</p>", tags: ["test-measurement", "b2b-demo", "multimeter", "fluke", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Fluke lifetime limited warranty.", specs: { "Voltage": "0.1 mV–600V AC/DC", "Current": "0.1 µA–10A AC/DC", "Resistance": "0.1 Ω–40 MΩ", "CAT Rating": "CAT III 600V / CAT IV 300V", "Display": "6000 count", "NCV": "VoltAlert built-in", "Warranty": "Limited lifetime" }, installGuideUrl: null, cadFileUrl: null, msrp: "249.99", inventoryQty: 32 },
  { title: "Fluke 376 FC Wireless Clamp Meter 1000A", vendor: "Fluke", collection: "test-measurement", sku: "FLK-376FC-CLAMP", price: "349.99", compareAtPrice: "399.99", uom: "EA", descriptionHtml: "<p>Fluke 376 FC true-RMS AC/DC clamp meter — 1000A AC/DC, 1500V, iFlex flexible current probe included, Bluetooth wireless to Fluke Connect.</p>", tags: ["test-measurement", "b2b-demo", "clamp-meter", "fluke", "wireless", "sale"], pricingTiers: null, leadTime: "In Stock", warranty: "Fluke lifetime limited warranty.", specs: { "AC/DC Current": "1000A", "Voltage": "1500V AC/DC", "CAT Rating": "CAT III 1500V / CAT IV 600V", "Jaw Size": "1.8\" (46 mm)", "iFlex Probe": "Included", "Wireless": "Bluetooth (Fluke Connect)", "Display": "6000 count" }, installGuideUrl: null, cadFileUrl: null, msrp: "449.99", inventoryQty: 18 },
  { title: "Klein MM700 True-RMS Auto-Ranging Multimeter", vendor: "Klein Tools", collection: "test-measurement", sku: "KLN-MM700-DMTR", price: "89.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Klein MM700 auto-ranging true-RMS multimeter — 1000V AC/DC, 10A, capacitance, temperature, frequency, NCV, CAT IV 600V.</p>", tags: ["test-measurement", "b2b-demo", "multimeter", "klein", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 81.99 }, { minQty: 6, unitPrice: 74.99 }], leadTime: "In Stock", warranty: "Klein lifetime limited warranty.", specs: { "Voltage": "0–1000V AC/DC", "Current": "0–10A AC/DC", "Resistance": "0–40 MΩ", "Temp Range": "-40°C to 1000°C", "CAT Rating": "CAT IV 600V", "Auto-Range": "Yes", "Display": "6000 count backlit" }, installGuideUrl: null, cadFileUrl: null, msrp: "124.99", inventoryQty: 55 },
  { title: "Ideal 61-763 AC/DC Clamp Meter 400A", vendor: "Ideal Industries", collection: "test-measurement", sku: "IDL-61-763-CLAMP", price: "139.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Ideal 61-763 true-RMS AC/DC clamp meter — 400A, 600V, auto-range, NCV, CAT III 600V / CAT IV 300V, includes case.</p>", tags: ["test-measurement", "b2b-demo", "clamp-meter", "ideal"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Ideal Industries 1-year limited warranty.", specs: { "AC/DC Current": "400A", "Voltage": "600V AC/DC", "NCV": "Built-in", "Auto-Range": "Yes", "CAT Rating": "CAT III 600V / CAT IV 300V", "Display": "4000 count", "Case": "Included" }, installGuideUrl: null, cadFileUrl: null, msrp: "189.99", inventoryQty: 28 },
  { title: "Megger MIT410-2 1kV Insulation Resistance Tester", vendor: "Megger", collection: "test-measurement", sku: "MGR-MIT4102-1KV", price: "499.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Megger MIT410-2 1kV insulation resistance tester — 5 test voltages (100–1000V), PI and DAR calculations, 99-record memory, CAT IV 600V.</p>", tags: ["test-measurement", "b2b-demo", "insulation-tester", "megger", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Megger 3-year limited warranty.", specs: { "Test Voltages": "100/250/500/1000V", "Range": "0.01 MΩ–100 GΩ", "Functions": "IR, PI, DAR, dielectric", "CAT Rating": "CAT IV 600V", "Memory": "99 records", "Battery": "AA × 6" }, installGuideUrl: null, cadFileUrl: null, msrp: "649.99", inventoryQty: 8 },
  { title: "Fluke 1AC-C1-II VoltAlert NCV Tester 3-Pack", vendor: "Fluke", collection: "test-measurement", sku: "FLK-1ACC1II-3PK", price: "49.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>Fluke 1AC-C1-II non-contact voltage tester, pack of 3 — detects 90–1000V AC, LED + beep alert, CAT IV 1000V, no batteries needed.</p>", tags: ["test-measurement", "b2b-demo", "voltage-tester", "ncv", "fluke", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 44.99 }, { minQty: 6, unitPrice: 39.99 }], leadTime: "In Stock", warranty: "Fluke limited warranty.", specs: { "Detection": "90–1000V AC", "Indication": "LED + audible beep", "CAT Rating": "CAT IV 1000V", "Power": "No batteries (capacitance)", "Qty/Pack": "3" }, installGuideUrl: null, cadFileUrl: null, msrp: "69.99", inventoryQty: 110 },
  { title: "Klein ET300 Digital Circuit Breaker Finder", vendor: "Klein Tools", collection: "test-measurement", sku: "KLN-ET300-BKRFIND", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Klein ET300 circuit breaker finder — identifies breakers without tripping, works on loaded circuits, 120V AC, digital display; includes transmitter and receiver.</p>", tags: ["test-measurement", "b2b-demo", "breaker-finder", "klein", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Klein limited warranty.", specs: { "Function": "Circuit breaker identification", "Voltage": "120V AC", "Display": "Digital", "Trips Breaker": "No", "Use On": "Loaded live circuits", "Includes": "Transmitter + receiver + case" }, installGuideUrl: null, cadFileUrl: null, msrp: "74.99", inventoryQty: 62 },

  // industrial-controls (7)
  { title: "Square D 9001K 2-Button Pushbutton Station", vendor: "Square D", collection: "industrial-controls", sku: "SQD-9001K2L25GH13-2BTN", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D 9001K 2-button pushbutton station — Start (green) and Stop (red), 22 mm flush, NEMA 1 enclosure, standard for motor start/stop.</p>", tags: ["industrial-controls", "b2b-demo", "pushbutton-station", "square-d", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 49.99 }, { minQty: 6, unitPrice: 44.99 }], leadTime: "Ships in 2-3 Days", warranty: "Square D 1-year limited warranty.", specs: { "Buttons": "2 (Start green / Stop red)", "Operator": "22 mm flush", "Enclosure": "NEMA 1", "Contacts": "1 NO / 1 NC (std)", "Application": "Motor start/stop" }, installGuideUrl: null, cadFileUrl: null, msrp: "74.99", inventoryQty: 28 },
  { title: "Allen-Bradley 800FM 2-Position Selector Switch", vendor: "Allen-Bradley", collection: "industrial-controls", sku: "ABB-800FM-AP62-2POS", price: "34.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Allen-Bradley 800FM 2-position maintained selector switch, 22 mm — metal handle, 1 NO + 1 NC included, IP66/NEMA 4X rated.</p>", tags: ["industrial-controls", "b2b-demo", "selector-switch", "allen-bradley"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Allen-Bradley 1-year limited warranty.", specs: { "Positions": "2 maintained", "Operator": "22 mm metal lever", "Contacts": "1 NO + 1 NC", "IP Rating": "IP66 / NEMA 4X", "Panel Mount": "Yes" }, installGuideUrl: null, cadFileUrl: null, msrp: "47.99", inventoryQty: 35 },
  { title: "Siemens 3SB3400 22mm Selector Switch 2-Position", vendor: "Siemens", collection: "industrial-controls", sku: "SIE-3SB3400-0A-2POS", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Siemens 3SB3400-0A 22 mm plastic 2-position maintained selector switch — 1 NO contact standard, IP65, IEC 60947-5-1.</p>", tags: ["industrial-controls", "b2b-demo", "selector-switch", "siemens", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 21.99 }, { minQty: 10, unitPrice: 18.99 }], leadTime: "Ships in 2-3 Days", warranty: "Siemens 1-year limited warranty.", specs: { "Positions": "2 maintained", "Operator": "22 mm plastic", "Contacts": "1 NO", "IP Rating": "IP65", "Standard": "IEC 60947-5-1" }, installGuideUrl: null, cadFileUrl: null, msrp: "34.99", inventoryQty: 52 },
  { title: "Omron H3CR-A8 Multi-Range Digital Timer Relay", vendor: "Omron", collection: "industrial-controls", sku: "OMR-H3CRA8-100240VAC", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Omron H3CR-A8 multi-range digital timer, 100–240V AC — 11 time ranges 0.05s–300h, 8-pin plug-in, 1 SPDT output.</p>", tags: ["industrial-controls", "b2b-demo", "timer-relay", "omron", "new"], pricingTiers: null, leadTime: "In Stock", warranty: "Omron 1-year limited warranty.", specs: { "Voltage": "100–240V AC", "Time Ranges": "11 (0.05s–300h)", "Output": "1 SPDT (10A/240V)", "Mount": "8-pin plug-in", "Mode": "On-delay", "Accuracy": "±1%" }, installGuideUrl: null, cadFileUrl: null, msrp: "62.99", inventoryQty: 42 },
  { title: "Idec RH1B-UAC240V Control Relay 14-Pin", vendor: "Idec", collection: "industrial-controls", sku: "IEC-RH1BUAC240-14PIN", price: "12.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Idec RH1B 14-pin plug-in relay, 240V AC coil — 4PDT 4A/250V AC contacts, LED indicator, for SH14B or equivalent relay socket.</p>", tags: ["industrial-controls", "b2b-demo", "control-relay", "idec", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 10.99 }, { minQty: 25, unitPrice: 9.49 }, { minQty: 50, unitPrice: 8.49 }], leadTime: "In Stock", warranty: "Idec 1-year limited warranty.", specs: { "Coil Voltage": "240V AC", "Pins": "14-pin plug-in", "Contacts": "4PDT (4A/250V AC)", "LED Indicator": "Yes", "Socket": "SH14B or equivalent", "Standard": "IEC 60255" }, installGuideUrl: null, cadFileUrl: null, msrp: "17.99", inventoryQty: 180 },
  { title: "Square D 9001KT 30mm Selector Switch Operator", vendor: "Square D", collection: "industrial-controls", sku: "SQD-9001KT35-30MM", price: "19.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D 9001KT 30 mm 2-position maintained selector switch operator (no contacts) — metal handle for 9001-series panels; order contact blocks separately.</p>", tags: ["industrial-controls", "b2b-demo", "selector-switch", "square-d", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 17.99 }, { minQty: 10, unitPrice: 15.99 }], leadTime: "Ships in 2-3 Days", warranty: "Square D 1-year limited warranty.", specs: { "Size": "30 mm", "Positions": "2 maintained", "Handle": "Metal lever", "Contacts": "Order separately", "Series": "9001KT" }, installGuideUrl: null, cadFileUrl: null, msrp: "27.99", inventoryQty: 65 },
  { title: "Allen-Bradley 800FM E-Stop Push Button 40mm", vendor: "Allen-Bradley", collection: "industrial-controls", sku: "ABB-800FM-F4-40ESTOP", price: "44.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Allen-Bradley 800FM 40 mm twist-to-release e-stop button — red mushroom head, 1 NC contact included, IP66/NEMA 4X, IEC 60947-5-5.</p>", tags: ["industrial-controls", "b2b-demo", "emergency-stop", "e-stop", "allen-bradley", "new"], pricingTiers: null, leadTime: "Ships in 2-3 Days", warranty: "Allen-Bradley 1-year limited warranty.", specs: { "Type": "Emergency Stop", "Size": "40 mm mushroom head", "Color": "Red", "Release": "Twist-to-release", "Contacts": "1 NC", "IP Rating": "IP66 / NEMA 4X", "Standard": "IEC 60947-5-5 / EN 418" }, installGuideUrl: null, cadFileUrl: null, msrp: "59.99", inventoryQty: 38 },
];

// ─── SECTION C — COMPANIES_V2 ─────────────────────────────────────────────────

const COMPANIES_V2 = [
  {
    name: "Acme Electric Supply Co.",
    externalId: "acme-electric-001",
    discountPercent: 20,
    hq: {
      name: "Acme Electric Supply Co. - Chicago HQ",
      address1: "1420 W Fulton Market",
      city: "Chicago",
      zoneCode: "IL",
      zip: "60607",
      countryCode: "US",
    },
    branch: {
      name: "Acme Electric Supply Co. - Milwaukee Branch",
      address1: "3200 W Canal St",
      city: "Milwaukee",
      zoneCode: "WI",
      zip: "53208",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Sandra",
        lastName: "Kowalski",
        email: "s.kowalski@acmeelectric.com",
        role: "admin",
        title: "Account Director",
      },
      {
        firstName: "Robert",
        lastName: "Tanner",
        email: "r.tanner@acmeelectric.com",
        role: "admin",
        title: "Purchasing Manager",
      },
      {
        firstName: "Derek",
        lastName: "Holt",
        email: "d.holt@acmeelectric.com",
        role: "buyer",
        title: "Field Buyer",
      },
      {
        firstName: "Melissa",
        lastName: "Yuen",
        email: "m.yuen@acmeelectric.com",
        role: "buyer",
        title: "Project Buyer",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "AES-W1225-250",
      "THHN-12-500": "AES-W1225-500",
      "THHN-10-250": "AES-W1025-250",
      "NMB-12-2-250": "AES-NMB122-250",
      "QO120": "AES-BKR-QO1P20",
      "QO230": "AES-BKR-QO2P30",
      "BR120": "AES-BKR-BR1P20",
      "EMT-50-BX10": "AES-EMT50-10PK",
      "EMT-75-BX10": "AES-EMT75-10PK",
      "RCPT-20A-BX10": "AES-RCP20-10PK",
      "GFCI-20A-BX5": "AES-GFI20-5PK",
      "SW-1P-BX10": "AES-SW1P-10PK",
    },
  },
  {
    name: "Metro Contractors LLC",
    externalId: "metro-contractors-002",
    discountPercent: 15,
    hq: {
      name: "Metro Contractors LLC - Dallas HQ",
      address1: "4801 Maple Ave",
      city: "Dallas",
      zoneCode: "TX",
      zip: "75219",
      countryCode: "US",
    },
    branch: {
      name: "Metro Contractors LLC - Fort Worth Branch",
      address1: "2650 E Rosedale St",
      city: "Fort Worth",
      zoneCode: "TX",
      zip: "76105",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Carlos",
        lastName: "Mendez",
        email: "c.mendez@metrocontractors.com",
        role: "admin",
        title: "Operations Manager",
      },
      {
        firstName: "Jennifer",
        lastName: "Okafor",
        email: "j.okafor@metrocontractors.com",
        role: "buyer",
        title: "Senior Buyer",
      },
      {
        firstName: "Travis",
        lastName: "Burrell",
        email: "t.burrell@metrocontractors.com",
        role: "buyer",
        title: "Site Procurement",
      },
      {
        firstName: "Aisha",
        lastName: "Whitfield",
        email: "a.whitfield@metrocontractors.com",
        role: "buyer",
        title: "Materials Coordinator",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "MCL-TH12-250FT",
      "THHN-10-250": "MCL-TH10-250FT",
      "NMB-12-2-250": "MCL-NM122-250",
      "QO120": "MCL-CB-Q120",
      "QO230": "MCL-CB-Q230",
      "EMT-50-BX10": "MCL-EMT05-CS10",
      "SHOP-LED-2PK": "MCL-LT-SHPD2",
      "UFO-HB-100W": "MCL-LT-UFO100",
      "RCPT-20A-BX10": "MCL-RCP-20CS",
      "VEST-CL2-CTN6": "MCL-PPE-VC2-6",
    },
  },
  {
    name: "Pacific Installations Inc",
    externalId: "pacific-installations-003",
    discountPercent: 10,
    hq: {
      name: "Pacific Installations Inc - Seattle HQ",
      address1: "1601 15th Ave W",
      city: "Seattle",
      zoneCode: "WA",
      zip: "98119",
      countryCode: "US",
    },
    branch: {
      name: "Pacific Installations Inc - Portland Branch",
      address1: "3750 N Williams Ave",
      city: "Portland",
      zoneCode: "OR",
      zip: "97227",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Heather",
        lastName: "Nakamura",
        email: "h.nakamura@pacificinstallations.com",
        role: "admin",
        title: "General Manager",
      },
      {
        firstName: "Brandon",
        lastName: "Estrada",
        email: "b.estrada@pacificinstallations.com",
        role: "buyer",
        title: "Lead Buyer",
      },
      {
        firstName: "Caitlin",
        lastName: "Bremer",
        email: "c.bremer@pacificinstallations.com",
        role: "buyer",
        title: "Procurement Specialist",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "PII-WR1225-A",
      "THHN-12-500": "PII-WR1225-B",
      "THHN-10-250": "PII-WR1025-A",
      "NMB-12-2-250": "PII-NMB122-A",
      "BR120": "PII-BKR-BR120",
      "EMT-75-BX10": "PII-COND75-BX",
      "TROF-2X4-50W": "PII-LT-TRF24",
      "GFCI-20A-BX5": "PII-GFI20-5PK",
      "TOOL-11IN1": "PII-TL-11N1",
    },
  },
  {
    name: "Coastal Builders Group",
    externalId: "coastal-builders-004",
    discountPercent: 12,
    hq: {
      name: "Coastal Builders Group - Miami HQ",
      address1: "7900 NW 25th St",
      city: "Miami",
      zoneCode: "FL",
      zip: "33122",
      countryCode: "US",
    },
    branch: {
      name: "Coastal Builders Group - Tampa Branch",
      address1: "4110 W Linebaugh Ave",
      city: "Tampa",
      zoneCode: "FL",
      zip: "33624",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Miguel",
        lastName: "Ferrara",
        email: "m.ferrara@coastalbuildersgroup.com",
        role: "admin",
        title: "Regional Director",
      },
      {
        firstName: "Danielle",
        lastName: "Proctor",
        email: "d.proctor@coastalbuildersgroup.com",
        role: "buyer",
        title: "Electrical Buyer",
      },
      {
        firstName: "Kevin",
        lastName: "Seabolt",
        email: "k.seabolt@coastalbuildersgroup.com",
        role: "buyer",
        title: "Materials Buyer",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "CBG-T12-250",
      "THHN-12-500": "CBG-T12-500",
      "NMB-12-2-250": "CBG-NMB-250",
      "QO120": "CBG-BRK-Q120",
      "QO230": "CBG-BRK-Q230",
      "EMT-50-BX10": "CBG-EMT-50BX",
      "SHOP-LED-2PK": "CBG-LED-SHOP2",
      "UFO-HB-100W": "CBG-LED-UFO1",
      "RCPT-20A-BX10": "CBG-OUT-20BX",
      "SW-1P-BX10": "CBG-SWT-1PBX",
      "VEST-CL2-CTN6": "CBG-PPE-VC6",
    },
  },
  {
    name: "Heartland MEP Solutions",
    externalId: "heartland-mep-005",
    discountPercent: 8,
    hq: {
      name: "Heartland MEP Solutions - Kansas City HQ",
      address1: "2501 Southwest Blvd",
      city: "Kansas City",
      zoneCode: "MO",
      zip: "64108",
      countryCode: "US",
    },
    branch: {
      name: "Heartland MEP Solutions - St. Louis Branch",
      address1: "3800 Lindell Blvd",
      city: "St. Louis",
      zoneCode: "MO",
      zip: "63108",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Patricia",
        lastName: "Dunbar",
        email: "p.dunbar@heartlandmep.com",
        role: "admin",
        title: "VP of Procurement",
      },
      {
        firstName: "James",
        lastName: "Holloway",
        email: "j.holloway@heartlandmep.com",
        role: "buyer",
        title: "Electrical Procurement",
      },
      {
        firstName: "Renee",
        lastName: "Castillo",
        email: "r.castillo@heartlandmep.com",
        role: "buyer",
        title: "Project Buyer",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "HMS-TH12-250",
      "THHN-10-250": "HMS-TH10-250",
      "NMB-12-2-250": "HMS-NMB-12250",
      "QO120": "HMS-BK-QO120",
      "BR120": "HMS-BK-BR120",
      "EMT-50-BX10": "HMS-CT-E50BX",
      "TROF-2X4-50W": "HMS-LT-24TRF",
      "GFCI-20A-BX5": "HMS-GFI-20B5",
      "TOOL-11IN1": "HMS-TL-11IN1",
    },
  },
  {
    name: "Northeast Power Systems",
    externalId: "northeast-power-006",
    discountPercent: 18,
    hq: {
      name: "Northeast Power Systems - Boston HQ",
      address1: "290 Summer St",
      city: "Boston",
      zoneCode: "MA",
      zip: "02210",
      countryCode: "US",
    },
    branch: {
      name: "Northeast Power Systems - Providence Branch",
      address1: "1 Ship St",
      city: "Providence",
      zoneCode: "RI",
      zip: "02903",
      countryCode: "US",
    },
    contacts: [
      {
        firstName: "Gregory",
        lastName: "Callahan",
        email: "g.callahan@northeastpowersystems.com",
        role: "admin",
        title: "Chief Procurement Officer",
      },
      {
        firstName: "Diane",
        lastName: "Marcotte",
        email: "d.marcotte@northeastpowersystems.com",
        role: "admin",
        title: "Purchasing Director",
      },
      {
        firstName: "Anthony",
        lastName: "Leblanc",
        email: "a.leblanc@northeastpowersystems.com",
        role: "buyer",
        title: "Senior Buyer",
      },
      {
        firstName: "Kristen",
        lastName: "Shapiro",
        email: "k.shapiro@northeastpowersystems.com",
        role: "buyer",
        title: "Electrical Buyer",
      },
    ],
    customerSkuMap: {
      "THHN-12-250": "NPS-W12-250FT",
      "THHN-12-500": "NPS-W12-500FT",
      "THHN-10-250": "NPS-W10-250FT",
      "NMB-12-2-250": "NPS-NM122-250",
      "QO120": "NPS-CB-QO120",
      "QO230": "NPS-CB-QO230",
      "BR120": "NPS-CB-BR120",
      "EMT-50-BX10": "NPS-EMT50-10",
      "EMT-75-BX10": "NPS-EMT75-10",
      "SHOP-LED-2PK": "NPS-LT-SHP2PK",
      "RCPT-20A-BX10": "NPS-RCP20-10",
      "GFCI-20A-BX5": "NPS-GFI20-5",
    },
  },
];

// ─── SECTION D — ORDER_TEMPLATES, QUOTE_TEMPLATES, LIST_TEMPLATES ─────────────

const ORDER_TEMPLATES = [
  {
    label: "Downtown Office Tower – Rough-In Package",
    productIndices: [2, 9, 17, 31],
    quantities: [50, 4, 20, 10],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 14,
    poNumberSuffix: "0042",
    note: "Phase 1 rough-in for floors 3-7. All conduit to be installed before drywall inspection on Friday.",
  },
  {
    label: "Warehouse Expansion – Panel & Wire Drop",
    productIndices: [1, 8, 11, 22, 33],
    quantities: [200, 1, 2, 8, 16],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 10,
    poNumberSuffix: "0117",
    note: "Main distribution panel upgrade and 200A feeder wire run. Coordinate with GC for lift access on east wall.",
  },
  {
    label: "Retail Strip Mall – Lighting & Switches",
    productIndices: [24, 27, 30, 35],
    quantities: [24, 12, 40, 40],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 7,
    poNumberSuffix: "0203",
    note: "Tenant improvement package for units 4-8. LED troffers and tamper-resistant receptacles per NEC 2020.",
  },
  {
    label: "Municipal Water Treatment – Control Wiring",
    productIndices: [0, 5, 16, 19, 32],
    quantities: [500, 100, 30, 15, 20],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 18,
    poNumberSuffix: "0388",
    note: "Low-voltage control wiring for pump stations 2 and 3. All conduit must be Schedule 80 PVC per project spec.",
  },
  {
    label: "School Gymnasium Remodel – Fixtures",
    productIndices: [23, 26, 29, 38],
    quantities: [16, 8, 4, 2],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 3,
    poNumberSuffix: "0451",
    note: "High-bay LED fixtures for gym ceiling at 30 ft. Safety harnesses required on site per district policy.",
  },
  {
    label: "Apartment Complex – Breaker Replacements",
    productIndices: [10, 13, 34, 36],
    quantities: [12, 6, 24, 24],
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    monthsAgo: 1,
    poNumberSuffix: "0519",
    note: "Unit-by-unit panel breaker swap-out, buildings A and B. Schedule with property manager for tenant notification.",
  },
  {
    label: "Industrial Freezer Facility – Conduit Run",
    productIndices: [3, 7, 18, 20, 39],
    quantities: [300, 150, 40, 40, 3],
    financialStatus: "pending",
    fulfillmentStatus: null,
    monthsAgo: 1,
    poNumberSuffix: "0601",
    note: "Cold-storage conduit installation pending owner approval on conduit routing change request submitted 05/28.",
  },
  {
    label: "Hotel Renovation – Partial Material Return",
    productIndices: [4, 6, 15, 25, 37],
    quantities: [100, 60, 3, 10, 30],
    financialStatus: "partially_refunded",
    fulfillmentStatus: null,
    monthsAgo: 5,
    poNumberSuffix: "0744",
    note: "Scope reduction on floors 9-12 resulted in return of 40 spools wire and 1 sub-panel. Credit memo pending approval.",
  },
];

const QUOTE_TEMPLATES = [
  {
    label: "New Quote – LED Retrofit Inquiry",
    title: "LED Retrofit – Parking Structure Level 1 & 2",
    productIndices: [22, 25, 28],
    quantities: [40, 20, 10],
    status: "new",
    referenceNumber: "QT-2026-0081",
    expiryDays: 30,
    messages: [
      {
        author: "Jordan Calloway",
        authorRole: "buyer",
        body: "Hi, we need pricing on LED fixtures for our parking structure retrofit. Approximately 40 vapor-tight fixtures on level 1 and 20 wall packs on level 2. Can you confirm availability and lead time? We'd like to start install mid-July.",
      },
    ],
  },
  {
    label: "In-Process Quote – Service Entrance Wire",
    title: "Service Entrance Cable – Distribution Center Upgrade",
    productIndices: [1, 3, 6, 23],
    quantities: [400, 200, 100, 6],
    status: "in_process",
    referenceNumber: "QT-2026-0064",
    expiryDays: 14,
    messages: [
      {
        author: "Priya Nair",
        authorRole: "buyer",
        body: "We're upgrading the service entrance at our distribution center and need 400 ft of 4/0 THHN and 200 ft of 2/0 for the feeder runs. Also adding 6 high-bay fixtures in the new dock extension. Please quote with your best volume pricing.",
      },
      {
        author: "Marcus Webb",
        authorRole: "rep",
        body: "Thanks Priya! I've reviewed the quantities and can offer tier-2 pricing on the THHN given the volume. The high-bay fixtures have a 5-day lead time from our regional warehouse. I'll have a formal quote document to you by EOD tomorrow — just need confirmation on the delivery address.",
      },
    ],
  },
  {
    label: "Expired Quote – Conduit & Wire Bundle",
    title: "Data Center Fit-Out – Wire & Conduit Package",
    productIndices: [0, 4, 17, 21, 26],
    quantities: [600, 300, 50, 25, 12],
    status: "expired",
    referenceNumber: "QT-2025-0932",
    expiryDays: -30,
    messages: [
      {
        author: "Desiree Fontaine",
        authorRole: "buyer",
        body: "We need a quote for the data center fit-out on the 4th floor — roughly 600 ft of Cat-rated wire, 300 ft of 12 AWG THHN, 50 sticks of 1-inch EMT, and associated fittings. Project was targeting a Q4 start.",
      },
      {
        author: "Ray Okoro",
        authorRole: "rep",
        body: "Hi Desiree, quote is attached for review. Pricing is valid for 30 days. Given Q4 demand, I'd recommend locking in the EMT conduit soon — we've seen supply tighten in November. Let me know if you'd like to adjust quantities or need anything added.",
      },
    ],
  },
];

const LIST_TEMPLATES = [
  {
    name: "Standard Job-Site Starter Kit",
    description: "Company-approved core materials stocked on every active job site. Covers common wire gauges, breakers, conduit, and basic fixtures for day-to-day task work.",
    isCompanyList: true,
    productIndices: [1, 5, 9, 17, 30, 38],
    quantities: [100, 50, 4, 20, 20, 1],
  },
  {
    name: "Lighting Upgrade Personal Wishlist",
    description: "Products I frequently spec for lighting retrofit projects. Handy reference for quick reorders on commercial LED upgrades.",
    isCompanyList: false,
    productIndices: [22, 24, 27, 34, 36],
    quantities: [12, 8, 8, 10, 10],
  },
];

// ─── SECTION E — COLLECTIONS + createCollections() ───────────────────────────

const COLLECTIONS = [
  { title: "Wire & Cable", description: "Commercial electrical wire and cable", handle: "wire-cable" },
  { title: "Breakers & Panels", description: "Circuit breakers and electrical panels", handle: "breakers-panels" },
  { title: "Conduit & Fittings", description: "Electrical conduit, fittings, and accessories", handle: "conduit-fittings" },
  { title: "Lighting Fixtures", description: "Commercial and industrial lighting fixtures", handle: "lighting-fixtures" },
  { title: "Switches & Receptacles", description: "Commercial wiring devices", handle: "switches-receptacles" },
  { title: "Tools & Safety", description: "Electrical tools and safety equipment", handle: "tools-safety" },
  { title: "Low Voltage & Communications", description: "Data, security, AV, and fire alarm cable", handle: "low-voltage" },
  { title: "Motors & Motor Controls", description: "Contactors, starters, drives, and overloads", handle: "motors-controls" },
  { title: "Transformers", description: "Control, step-down, and distribution transformers", handle: "transformers" },
  { title: "Enclosures & Boxes", description: "NEMA enclosures, junction boxes, and pull boxes", handle: "enclosures" },
  { title: "Cable Management", description: "Raceway, cable tray, strut, and cable ties", handle: "cable-management" },
  { title: "Grounding & Bonding", description: "Ground rods, clamps, lugs, and bonding jumpers", handle: "grounding-bonding" },
  { title: "Test & Measurement", description: "Multimeters, clamp meters, and electrical testers", handle: "test-measurement" },
  { title: "Industrial Controls", description: "Push buttons, selectors, relays, and timers", handle: "industrial-controls" },
];

async function createCollections(): Promise<Record<string, string>> {
  console.log("\n📂 Creating collections...");
  const handles: Record<string, string> = {};

  for (const col of COLLECTIONS) {
    const data = await graphql<{
      collectionCreate: {
        collection: { id: string; handle: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
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
      const msgs = data.collectionCreate.userErrors.map(e => e.message).join(", ");
      if (msgs.toLowerCase().includes("already")) {
        console.log(`  ↩ Already exists: ${col.title}`);
        // leave handles[col.handle] empty — downstream code skips if missing
      } else {
        console.warn(`  ⚠ ${col.title}: ${msgs}`);
      }
    }
    await sleep(500);
  }
  return handles;
}

// ─── SECTION F — createProducts() ────────────────────────────────────────────

interface ProductResult {
  productId: string;
  variantId: string;
  inventoryItemId: string;
  sku: string;
  handle: string;
  price: string;
}

async function createProducts(collectionIds: Record<string, string>): Promise<ProductResult[]> {
  console.log("\n📦 Creating products...");

  // Get location ID
  const locData = await graphql<{ locations: { edges: Array<{ node: { id: string } }> } }>(
    `query { locations(first: 1) { edges { node { id } } } }`
  );
  const locationId = locData.locations.edges[0]?.node.id ?? "";
  if (locationId) console.log(`  Location: ${locationId}`);

  const results: ProductResult[] = [];

  for (const product of PRODUCTS_V2) {
    const collectionTitle = COLLECTIONS.find(c => c.handle === product.collection)?.title ?? "";

    // Build metafields
    const metafields: Array<{ namespace: string; key: string; value: string; type: string }> = [
      { namespace: "custom", key: "uom", value: product.uom, type: "single_line_text_field" },
      { namespace: "custom", key: "spec_sheet_url", value: "/specs/" + product.sku.toLowerCase() + ".pdf", type: "single_line_text_field" },
      { namespace: "custom", key: "lead_time", value: product.leadTime, type: "single_line_text_field" },
      { namespace: "custom", key: "product_specs", value: JSON.stringify(product.specs), type: "json" },
      { namespace: "custom", key: "warranty", value: product.warranty, type: "single_line_text_field" },
      { namespace: "custom", key: "msrp", value: product.msrp, type: "number_decimal" },
    ];
    if (product.pricingTiers !== null) {
      metafields.push({
        namespace: "custom",
        key: "pricing_tiers",
        value: JSON.stringify(product.pricingTiers),
        type: "json",
      });
    }
    if (product.installGuideUrl) {
      metafields.push({ namespace: "custom", key: "install_guide_url", value: product.installGuideUrl, type: "single_line_text_field" });
    }
    if (product.cadFileUrl) {
      metafields.push({ namespace: "custom", key: "cad_file_url", value: product.cadFileUrl, type: "single_line_text_field" });
    }

    // 1. productCreate
    const createData = await graphql<{
      productCreate: {
        product: {
          id: string;
          handle: string;
          variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> };
        } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(
      `mutation ProductCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            handle
            variants(first: 1) { edges { node { id inventoryItem { id } } } }
          }
          userErrors { field message }
        }
      }`,
      {
        input: {
          title: product.title,
          vendor: product.vendor,
          productType: collectionTitle,
          tags: product.tags,
          status: "ACTIVE",
          descriptionHtml: product.descriptionHtml,
          metafields,
        },
      }
    );

    if (!createData.productCreate.product) {
      console.warn(`  ⚠ ${product.title}: ${createData.productCreate.userErrors.map(e => e.message).join(", ")}`);
      await sleep(400);
      continue;
    }

    const productId = createData.productCreate.product.id;
    const handle = createData.productCreate.product.handle;
    const defaultVariant = createData.productCreate.product.variants.edges[0]?.node;

    if (!defaultVariant) {
      console.warn(`  ⚠ ${product.title}: no default variant returned`);
      await sleep(400);
      continue;
    }

    const variantId = defaultVariant.id;
    const inventoryItemId = defaultVariant.inventoryItem?.id ?? "";

    // 2. productVariantsBulkUpdate — set sku, price, compareAtPrice
    await graphql<{ productVariantsBulkUpdate: { userErrors: Array<{ message: string }> } }>(
      `mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id }
          userErrors { message }
        }
      }`,
      {
        productId,
        variants: [{
          id: variantId,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          inventoryItem: { sku: product.sku, tracked: true },
        }],
      }
    ).catch(e => console.warn(`  ⚠ Variant update ${product.sku}: ${e.message}`));

    // 3. inventoryAdjustQuantities — delta 200
    if (locationId && inventoryItemId) {
      await graphql<{ inventoryAdjustQuantities: { userErrors: Array<{ message: string }> } }>(
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
              delta: product.inventoryQty,
              inventoryItemId,
              locationId,
            }],
          },
        }
      ).catch(() => { /* inventory optional for demo */ });
    }

    // 4. collectionAddProducts
    const colId = collectionIds[product.collection];
    if (colId) {
      await graphql<{ collectionAddProducts: { userErrors: Array<{ message: string }> } }>(
        `mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            userErrors { message }
          }
        }`,
        { id: colId, productIds: [productId] }
      ).catch(e => console.warn(`  ⚠ Collection assign ${product.sku}: ${e.message}`));
    }

    console.log(`  ✓ ${product.title} (${product.sku})`);
    results.push({ productId, variantId, inventoryItemId, sku: product.sku, handle, price: product.price });
    await sleep(400);
  }

  return results;
}

// ─── SECTION G — createCompanies() ───────────────────────────────────────────

interface CompanyResult {
  companyId: string;
  hqLocationId: string;
  branchLocationId: string;
  mainCustomerId: string;
  mainCustomerNumericId: number;
  contactIds: string[];
  contactCustomerIds: string[];
}

async function createCompanies(prodResults: ProductResult[]): Promise<CompanyResult[]> {
  console.log("\n🏢 Creating B2B companies...");
  const results: CompanyResult[] = [];

  for (const company of COMPANIES_V2) {
    const firstContact = company.contacts[0]!;

    // 1. companyCreate — in 2025-04, contacts are created separately via companyContactCreate
    const compData = await graphql<{
      companyCreate: {
        company: {
          id: string;
          locations: { edges: Array<{ node: { id: string } }> };
        } | null;
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
          company: { name: company.name, externalId: company.externalId },
          companyLocation: {
            name: company.hq.name,
            shippingAddress: {
              address1: company.hq.address1,
              city: company.hq.city,
              zoneCode: company.hq.zoneCode,
              zip: company.hq.zip,
              countryCode: company.hq.countryCode,
            },
            billingSameAsShipping: true,
          },
        },
      }
    );

    if (!compData.companyCreate.company) {
      const errs = compData.companyCreate.userErrors.map(e => e.message).join(", ");
      console.warn(`  ⚠ ${company.name}: ${errs} — skipping`);
      await sleep(400);
      continue;
    }

    const companyId = compData.companyCreate.company.id;
    const hqLocationId = compData.companyCreate.company.locations.edges[0]?.node.id ?? "";

    // 2. companyContactCreate for main contact — 2025-04: input takes firstName/lastName/email/title
    //    (creates a new customer account + company contact in one call)
    const mainContactData = await graphql<{
      companyContactCreate: {
        companyContact: { id: string; customer: { id: string } } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CompanyContactCreate($companyId: ID!, $input: CompanyContactInput!) {
        companyContactCreate(companyId: $companyId, input: $input) {
          companyContact { id customer { id } }
          userErrors { message }
        }
      }`,
      {
        companyId,
        input: {
          firstName: firstContact.firstName,
          lastName: firstContact.lastName,
          email: firstContact.email,
          title: firstContact.title ?? "",
        },
      }
    );

    const mainContactId = mainContactData.companyContactCreate.companyContact?.id ?? "";
    const mainCustomerId = mainContactData.companyContactCreate.companyContact?.customer.id ?? "";
    if (!mainContactId) {
      console.warn(`    ⚠ Main contact ${firstContact.email}: ${mainContactData.companyContactCreate.userErrors.map(e => e.message).join(", ")} (continuing without main contact)`);
    }
    const mainCustomerNumericId = parseInt(mainCustomerId.split("/").pop() ?? "0");

    console.log(`  ✓ Company: ${company.name}`);

    // 3. companyLocationCreate for branch
    const branchData = await graphql<{
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
          name: company.branch.name,
          shippingAddress: {
            address1: company.branch.address1,
            city: company.branch.city,
            zoneCode: company.branch.zoneCode,
            zip: company.branch.zip,
            countryCode: company.branch.countryCode,
          },
          billingSameAsShipping: true,
        },
      }
    );

    const branchLocationId = branchData.companyLocationCreate.companyLocation?.id ?? "";
    if (branchLocationId) {
      console.log(`    + Branch: ${company.branch.name}`);
    } else {
      console.warn(`    ⚠ Branch location: ${branchData.companyLocationCreate.userErrors.map(e => e.message).join(", ")}`);
    }

    await sleep(300);

    // 4. Create remaining contacts — companyContactCreate handles customer creation too
    const contactIds: string[] = [mainContactId];
    const contactCustomerIds: string[] = [mainCustomerId];

    for (let i = 1; i < company.contacts.length; i++) {
      const contact = company.contacts[i]!;

      // companyContactCreate — 2025-04 creates customer + contact together
      const addContactData = await graphql<{
        companyContactCreate: {
          companyContact: { id: string; customer: { id: string } } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation CompanyContactCreate($companyId: ID!, $input: CompanyContactInput!) {
          companyContactCreate(companyId: $companyId, input: $input) {
            companyContact { id customer { id } }
            userErrors { message }
          }
        }`,
        {
          companyId,
          input: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            title: contact.title ?? "",
          },
        }
      );

      const addedContactId = addContactData.companyContactCreate.companyContact?.id;
      const addedCustId = addContactData.companyContactCreate.companyContact?.customer.id;
      if (addedContactId) {
        contactIds.push(addedContactId);
        if (addedCustId) contactCustomerIds.push(addedCustId);
        console.log(`    + Contact: ${contact.firstName} ${contact.lastName} (${contact.role})`);
      } else {
        console.warn(`    ⚠ CompanyContact ${contact.email}: ${addContactData.companyContactCreate.userErrors.map(e => e.message).join(", ")}`);
      }

      await sleep(300);
    }

    // 5. Get role IDs
    const rolesData = await graphql<{
      company: {
        contactRoles: { edges: Array<{ node: { id: string; name: string } }> };
      } | null;
    }>(
      `query GetRoles($id: ID!) {
        company(id: $id) {
          contactRoles(first: 10) {
            edges { node { id name } }
          }
        }
      }`,
      { id: companyId }
    );

    const roleEdges = rolesData.company?.contactRoles.edges ?? [];
    // Default B2B role names vary by store (e.g. "Location admin" / "Ordering only"),
    // so match by intent rather than an exact "admin"/"buyer" string.
    const adminRoleId = roleEdges.find(e => /admin/i.test(e.node.name))?.node.id ?? roleEdges[0]?.node.id ?? "";
    const buyerRoleId = roleEdges.find(e => /order|buyer/i.test(e.node.name))?.node.id ?? adminRoleId;

    // 6. Assign roles to all contacts
    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];
      if (!contactId) continue;
      const contactDef = company.contacts[i];
      if (!contactDef) continue;
      const roleId = contactDef.role === "admin" ? adminRoleId : buyerRoleId;
      if (!roleId) continue;

      await graphql<{ companyContactAssignRoles: { userErrors: Array<{ message: string }> } }>(
        `mutation AssignRole($companyContactId: ID!, $rolesToAssign: [CompanyContactRoleAssign!]!) {
          companyContactAssignRoles(companyContactId: $companyContactId, rolesToAssign: $rolesToAssign) {
            roleAssignments { companyContact { id } }
            userErrors { message }
          }
        }`,
        {
          companyContactId: contactId,
          rolesToAssign: [{ companyContactRoleId: roleId, companyLocationId: hqLocationId }],
        }
      ).catch(e => console.warn(`    ⚠ Role assign: ${e.message}`));

      await sleep(200);
    }

    // 7. Set company metafield for customer SKUs.
    // 2026-07: CompanyInput no longer accepts `metafields` — use metafieldsSet
    // with the company GID as ownerId.
    await graphql<{ metafieldsSet: { userErrors: Array<{ message: string }> } }>(
      `mutation SetCompanySkus($mf: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $mf) {
          metafields { id }
          userErrors { message }
        }
      }`,
      {
        mf: [{
          ownerId: companyId,
          namespace: "b2b",
          key: "customer_skus",
          value: JSON.stringify(company.customerSkuMap),
          type: "json",
        }],
      }
    ).catch(e => console.warn(`    ⚠ Company metafield: ${e.message}`));

    // 8. priceListCreate
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
              value: company.discountPercent,
            },
          },
        },
      }
    );

    const priceListId = plData.priceListCreate.priceList?.id;
    if (!priceListId) {
      console.warn(`    ⚠ PriceList for ${company.name}: ${plData.priceListCreate.userErrors.map(e => e.message).join(", ")}`);
    } else {
      console.log(`    + Price list: ${company.discountPercent}% discount`);
    }

    // 9. catalogCreate
    if (priceListId) {
      const locationIds: string[] = [hqLocationId];
      if (branchLocationId) locationIds.push(branchLocationId);

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
              companyLocationIds: locationIds,
            },
          },
        }
      );

      if (catData.catalogCreate.catalog) {
        console.log(`    + Catalog assigned to ${locationIds.length} location(s)`);
      } else {
        console.warn(`    ⚠ Catalog: ${catData.catalogCreate.userErrors.map(e => e.message).join(", ")}`);
      }
    }

    results.push({
      companyId,
      hqLocationId,
      branchLocationId,
      mainCustomerId,
      mainCustomerNumericId,
      contactIds,
      contactCustomerIds,
    });

    await sleep(600);
  }

  return results;
}

// ─── SECTION H — createOrders() ──────────────────────────────────────────────

async function createOrders(companies: CompanyResult[], prods: ProductResult[]): Promise<void> {
  console.log("\n🧾 Creating orders...");
  const now = Date.now();

  for (const c of companies) {
    for (const t of ORDER_TEMPLATES) {
      const line_items = t.productIndices.map((idx, i) => ({
        variant_id: parseInt(prods[idx]?.variantId.split("/").pop() ?? "0"),
        quantity: t.quantities[i] ?? 1,
      })).filter(li => li.variant_id !== 0);

      const monthMs = t.monthsAgo * 30 * 24 * 60 * 60 * 1000;
      const created_at = new Date(now - monthMs).toISOString();
      const po_number = "PO-2025-" + t.poNumberSuffix;

      const orderBody: Record<string, unknown> = {
        customer: { id: c.mainCustomerNumericId },
        line_items,
        financial_status: t.financialStatus,
        created_at,
        processed_at: created_at,
        po_number,
        note: t.note,
        tags: ["b2b-demo"],
      };
      if (t.fulfillmentStatus !== null) {
        orderBody.fulfillment_status = t.fulfillmentStatus;
      }

      await restOrder({ order: orderBody });
      await sleep(300);
    }
    console.log(`  ✓ Orders for ${c.companyId}`);
  }
}

// ─── SECTION I — createQuotes() ──────────────────────────────────────────────

async function createQuotes(companies: CompanyResult[], prods: ProductResult[]): Promise<void> {
  console.log("\n💬 Creating quotes (draft orders)...");
  const now = Date.now();

  for (const c of companies) {
    for (const t of QUOTE_TEMPLATES) {
      const expiresAt = new Date(now + t.expiryDays * 86400000).toISOString();
      const notesThread = JSON.stringify(
        t.messages.map(m => ({
          author: m.author,
          authorRole: m.authorRole,
          date: new Date(now).toISOString(),
          body: m.body,
        }))
      );

      const lineItems = t.productIndices
        .map((idx, i) => {
          const p = prods[idx];
          if (!p) return null;
          return {
            variantId: p.variantId,
            quantity: t.quantities[i] ?? 1,
            originalUnitPrice: p.price,
          };
        })
        .filter((li): li is { variantId: string; quantity: number; originalUnitPrice: string } => li !== null);

      const metafields = [
        { namespace: "quote", key: "status", value: t.status, type: "single_line_text_field" },
        { namespace: "quote", key: "title", value: t.title, type: "single_line_text_field" },
        { namespace: "quote", key: "reference_number", value: t.referenceNumber, type: "single_line_text_field" },
        { namespace: "quote", key: "expires_at", value: expiresAt, type: "single_line_text_field" },
        { namespace: "quote", key: "notes_thread", value: notesThread, type: "json" },
      ];

      await graphql<{ draftOrderCreate: { draftOrder: { id: string } | null; userErrors: Array<{ message: string }> } }>(
        `mutation DraftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder { id }
            userErrors { message }
          }
        }`,
        {
          input: {
            lineItems,
            // 2026-07: draftOrderCreate rejects sending both customer and
            // purchasing_entity — B2B quotes use purchasingEntity only.
            purchasingEntity: {
              purchasingCompany: {
                companyId: c.companyId,
                companyLocationId: c.hqLocationId,
                companyContactId: c.contactIds[0] ?? "",
              },
            },
            tags: ["b2b-quote"],
            metafields,
          },
        }
      ).catch(e => console.warn(`  ⚠ Quote ${t.referenceNumber}: ${e.message}`));

      await sleep(400);
    }
    console.log(`  ✓ Quotes for ${c.companyId}`);
  }
}

// ─── SECTION J — createLists() ───────────────────────────────────────────────

async function createLists(companies: CompanyResult[], prods: ProductResult[]): Promise<void> {
  console.log("\n📋 Creating shopping lists (metaobjects)...");

  for (const c of companies) {
    for (const t of LIST_TEMPLATES) {
      const items = t.productIndices.map((idx, i) => {
        const p = prods[idx];
        return {
          productId: "",
          variantId: p?.variantId ?? "",
          sku: p?.sku ?? "",
          quantity: t.quantities[i] ?? 1,
          productHandle: p?.handle ?? "",
          productName: "",
        };
      });

      await graphql<{ metaobjectCreate: { metaobject: { id: string } | null; userErrors: Array<{ message: string }> } }>(
        `mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject { id }
            userErrors { message }
          }
        }`,
        {
          metaobject: {
            type: "b2b_shopping_list",
            fields: [
              { key: "name", value: t.name },
              { key: "description", value: t.description },
              { key: "customer_id", value: c.contactCustomerIds[0] ?? "" },
              { key: "company_id", value: t.isCompanyList ? c.companyId : "" },
              { key: "items", value: JSON.stringify(items) },
            ],
          },
        }
      ).catch(e => console.warn(`  ⚠ List "${t.name}": ${e.message}`));

      await sleep(300);
    }
    console.log(`  ✓ Lists for ${c.companyId}`);
  }
}

// ─── SECTION K — main() ──────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Shopify B2B Demo Seed v2\n");
  const colIds = await createCollections();
  const prodResults = await createProducts(colIds);
  console.log("✓ Products:", prodResults.length);
  const compResults = await createCompanies(prodResults);
  console.log("✓ Companies:", compResults.length);
  await createOrders(compResults, prodResults);
  console.log("✓ Orders created");
  await createQuotes(compResults, prodResults);
  console.log("✓ Quotes created");
  await createLists(compResults, prodResults);
  console.log("✓ Lists created");
  console.log("\n✅ Done!\n");
}

main().catch(e => { console.error(e); process.exit(1); });
