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

// ─── SECTION A — Boilerplate ──────────────────────────────────────────────────

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "makeswift-b2b-demo.myshopify.com";
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2025-04";
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

const REST_URL = `https://${STORE_DOMAIN}/admin/api/2025-04/orders.json`;
async function restOrder(body: unknown) {
  const r = await fetch(REST_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN }, body: JSON.stringify(body) });
  if (!r.ok) { console.warn("  REST order failed:", (await r.text()).slice(0, 200)); return null; }
  return r.json();
}

// ─── SECTION B — PRODUCTS_V2 ──────────────────────────────────────────────────

const PRODUCTS_V2 = [
  // wire-cable (8)
  { title: "THHN 12AWG Solid Copper Wire 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-12S-250", price: "34.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12 AWG solid copper THHN/THWN-2 building wire, 250 ft spool. Rated 600V, suitable for use in conduit, raceways, and cable trays in dry or wet locations up to 90°C. UL listed and RoHS compliant for commercial and residential applications.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "12awg", "solid", "copper"], pricingTiers: null },
  { title: "THHN 12AWG Stranded Copper Wire 500ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-12STR-500", price: "62.99", compareAtPrice: "74.99", uom: "FT", descriptionHtml: "<p>Southwire 12 AWG stranded copper THHN/THWN-2 wire, 500 ft spool, available in standard colors. Flexible stranded construction eases pulling through conduit runs and tight bends. Rated 600V at 90°C dry / 75°C wet, UL listed.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "12awg", "stranded", "sale"], pricingTiers: null },
  { title: "THHN 10AWG Stranded Copper Wire 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-10STR-250", price: "44.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 10 AWG stranded copper THHN/THWN-2 wire on a 250 ft spool. Suitable for 30A branch circuits supplying HVAC, water heaters, and sub-panels. Dual-rated THHN/THWN-2 for both dry and wet conduit installations up to 90°C.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "10awg", "stranded"], pricingTiers: null },
  { title: "THHN 8AWG Stranded Copper Wire 500ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-THHN-8STR-500", price: "139.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 8 AWG stranded copper THHN/THWN-2 wire, 500 ft spool. Handles 40–50A circuits for electric ranges, dryer feeders, and sub-panel runs. Dual-rated THHN/THWN-2, 600V, 90°C dry rating, UL listed and manufactured to ASTM B8 stranding standards.</p>", tags: ["wire-cable", "b2b-demo", "thhn", "8awg", "stranded", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 129.99 }, { minQty: 10, unitPrice: 119.99 }, { minQty: 20, unitPrice: 109.99 }] },
  { title: "12-2 NM-B Romex Non-Metallic Cable 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-NMB-122-250", price: "59.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12-2 NM-B (Romex) non-metallic sheathed cable with ground, 250 ft coil. Ideal for 20A residential and light commercial branch circuits in dry, protected locations. Meets NEC Article 334 requirements; UL listed and RoHS compliant.</p>", tags: ["wire-cable", "b2b-demo", "nm-b", "romex", "12-2", "new"], pricingTiers: null },
  { title: "12-3 NM-B Romex Non-Metallic Cable 250ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-NMB-123-250", price: "84.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 12-3 NM-B cable with ground, 250 ft coil — includes black, red, white, and bare copper conductors. Used for 20A multi-wire branch circuits, switch loops, and 240V appliance connections in dry locations. UL listed per UL 719 standard.</p>", tags: ["wire-cable", "b2b-demo", "nm-b", "romex", "12-3", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 79.99 }, { minQty: 6, unitPrice: 74.99 }, { minQty: 12, unitPrice: 69.99 }] },
  { title: "10-2 MC Metal-Clad Cable 250ft", vendor: "AFC Cable Systems", collection: "wire-cable", sku: "AFC-MC-102-250", price: "189.99", compareAtPrice: "219.99", uom: "FT", descriptionHtml: "<p>AFC Cable Systems 10-2 MC metal-clad cable with aluminum armor, 250 ft reel. Contains 10 AWG THHN copper conductors and a bare aluminum bonding strip. Suitable for exposed and concealed wiring in commercial and industrial applications per NEC Article 330; UL listed.</p>", tags: ["wire-cable", "b2b-demo", "mc-cable", "10-2", "metal-clad", "sale", "bulk"], pricingTiers: [{ minQty: 2, unitPrice: 179.99 }, { minQty: 5, unitPrice: 164.99 }, { minQty: 10, unitPrice: 149.99 }] },
  { title: "SER 4-3 Aluminum Service Entrance Cable 100ft", vendor: "Southwire", collection: "wire-cable", sku: "SWR-SER-43AL-100", price: "124.99", compareAtPrice: null, uom: "FT", descriptionHtml: "<p>Southwire 4-3 SER aluminum service entrance cable, 100 ft reel — includes two 4 AWG phase conductors, one 4 AWG neutral, and one 6 AWG bare copper ground. Rated 600V, 75°C, for residential and light commercial service drops and sub-panel feeders. UL listed per UL 854.</p>", tags: ["wire-cable", "b2b-demo", "ser", "aluminum", "service-entrance", "new"], pricingTiers: null },

  // breakers-panels (8)
  { title: "Square D QO120 20A 1-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO120-20A-1P", price: "8.49", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO120 20-amp single-pole plug-on circuit breaker with Visi-Trip indicator. Features exclusive Qwik-Open mechanism for 3-cycle interruption response and trip-free design. Rated 120V AC, 10 kAIC interrupt capacity; UL listed and compatible with QO load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "1-pole", "square-d", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 7.49 }, { minQty: 25, unitPrice: 6.99 }, { minQty: 50, unitPrice: 6.49 }] },
  { title: "Square D QO230 30A 2-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO230-30A-2P", price: "16.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO230 30-amp two-pole circuit breaker for 240V branch circuits protecting dryers, HVAC, and water heaters. Visi-Trip indicator and Qwik-Open mechanism ensure fast, reliable tripping. Rated 240V AC, 10 kAIC; UL listed for QO load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "30a", "2-pole", "square-d", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 15.49 }, { minQty: 15, unitPrice: 14.29 }, { minQty: 30, unitPrice: 13.49 }] },
  { title: "Square D QO220 20A 2-Pole Circuit Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO220-20A-2P", price: "14.49", compareAtPrice: "17.99", uom: "EA", descriptionHtml: "<p>Square D QO220 20-amp two-pole breaker ideal for 240V small appliance circuits and HVAC equipment. Visi-Trip indicator provides immediate visual fault indication; trip-free design prevents manual override when tripped. Rated 240V AC, 10 kAIC interrupt rating; UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "2-pole", "square-d", "sale"], pricingTiers: null },
  { title: "Square D QO230GFI 30A 2-Pole GFCI Breaker", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO230GFI-30A", price: "54.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO230GFI 30-amp two-pole GFCI circuit breaker provides Class A ground-fault protection (5 mA trip threshold) for outdoor, spa, and hot tub circuits. Includes pigtail neutral wire and TEST button for NEC-compliant monthly testing. Rated 240V AC, 10 kAIC; UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "gfci", "30a", "2-pole", "square-d", "new"], pricingTiers: null },
  { title: "Eaton BR120 20A 1-Pole Circuit Breaker", vendor: "Eaton", collection: "breakers-panels", sku: "ETN-BR120-20A-1P", price: "7.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Eaton BR120 20-amp single-pole plug-on circuit breaker for use with Eaton BR, CH, and compatible load centers. Features thermal-magnetic tripping for overload and short-circuit protection. Rated 120V AC, 10 kAIC interrupt capacity; UL listed and meets ANSI C37.29 standards.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "20a", "1-pole", "eaton", "bulk"], pricingTiers: [{ minQty: 10, unitPrice: 6.99 }, { minQty: 25, unitPrice: 6.49 }, { minQty: 50, unitPrice: 5.99 }] },
  { title: "Siemens Q2100 100A 2-Pole Circuit Breaker", vendor: "Siemens", collection: "breakers-panels", sku: "SIE-Q2100-100A-2P", price: "38.99", compareAtPrice: "44.99", uom: "EA", descriptionHtml: "<p>Siemens Q2100 100-amp two-pole main or feeder breaker for 240V sub-panel feeds and large motor loads. Thermal-magnetic trip design with common trip to simultaneously open both poles on fault. Rated 240V AC, 22 kAIC interrupt capacity; UL listed for QP load centers.</p>", tags: ["breakers-panels", "b2b-demo", "breaker", "100a", "2-pole", "siemens", "sale"], pricingTiers: null },
  { title: "Square D 200A 30-Space QO Load Center", vendor: "Square D", collection: "breakers-panels", sku: "SQD-QO130L200PG-200A", price: "189.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Square D QO130L200PG 200-amp 30-space 60-circuit indoor load center with convertible main breaker. Factory-installed 200A QOM2 main breaker with Homeline bus bar and copper bus rated for aluminum or copper conductors. Includes indoor enclosure with hinged door; UL listed to UL 67.</p>", tags: ["breakers-panels", "b2b-demo", "panel", "load-center", "200a", "square-d", "new"], pricingTiers: null },
  { title: "Eaton 200A 20-Circuit Load Center", vendor: "Eaton", collection: "breakers-panels", sku: "ETN-BR2020B200-200A", price: "164.99", compareAtPrice: "194.99", uom: "EA", descriptionHtml: "<p>Eaton BR2020B200 200-amp 20-space 20-circuit indoor main breaker load center with convertible to main lug. Accepts BR-style plug-on breakers; aluminum bus rated for copper or aluminum conductors. NEMA 1 indoor enclosure with flush trim included; UL listed.</p>", tags: ["breakers-panels", "b2b-demo", "panel", "load-center", "200a", "eaton", "sale"], pricingTiers: null },

  // conduit-fittings (6)
  { title: "EMT 1/2in Conduit 10ft (Box of 10)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-12-10FT-BX10", price: "54.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 1/2 in. EMT (Electrical Metallic Tubing) in a box of 10 sticks, each 10 ft long. Hot-dip galvanized inside and out for superior corrosion resistance in indoor and outdoor applications per NEC Article 358. UL listed and meets ANSI C80.3 dimensional standards.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "1/2in", "conduit", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 49.99 }, { minQty: 6, unitPrice: 46.99 }, { minQty: 12, unitPrice: 43.99 }] },
  { title: "EMT 3/4in Conduit 10ft (Box of 10)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-34-10FT-BX10", price: "79.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 3/4 in. EMT conduit, box of 10 sticks at 10 ft each (100 linear feet). Galvanized steel construction resists corrosion in damp locations; standard trade size accommodates up to 7 THHN 12 AWG conductors. UL listed per UL 797 and ANSI C80.3.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "3/4in", "conduit", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 72.99 }, { minQty: 6, unitPrice: 67.99 }, { minQty: 12, unitPrice: 62.99 }] },
  { title: "EMT 1in Conduit 10ft (Box of 5)", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-EMT-1-10FT-BX5", price: "59.99", compareAtPrice: "69.99", uom: "BX", descriptionHtml: "<p>Allied Tube & Conduit 1 in. EMT conduit, box of 5 sticks at 10 ft each (50 linear feet). Ideal for feeder runs and larger wire fills in commercial construction; hot-dip galvanized finish for corrosion protection in wet and dry locations. UL listed per UL 797.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "1in", "conduit", "sale"], pricingTiers: null },
  { title: "1/2in Rigid Steel Conduit 10ft Each", vendor: "Allied Tube & Conduit", collection: "conduit-fittings", sku: "ATC-RGD-12-10FT-EA", price: "8.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Allied Tube & Conduit 1/2 in. rigid galvanized steel conduit (RGS), single 10 ft stick with one coupling included. Provides maximum mechanical protection for conductors in exposed, hazardous, or high-impact locations per NEC Article 344. Hot-dip galvanized inside and out; UL listed and ANSI C80.1 compliant.</p>", tags: ["conduit-fittings", "b2b-demo", "rigid", "1/2in", "conduit"], pricingTiers: null },
  { title: "1/2in EMT Compression Coupling (Bag of 50)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-CC-12-BG50", price: "39.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>Thomas & Betts 1/2 in. EMT compression couplings, bag of 50. Die-cast zinc construction with serrated compression ring provides a watertight connection rated for outdoor and wet locations. Meets NEMA FB-1 and UL 514B standards; listed for use with 1/2 in. EMT conduit.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "compression", "coupling", "1/2in", "bulk"], pricingTiers: [{ minQty: 3, unitPrice: 35.99 }, { minQty: 6, unitPrice: 32.99 }, { minQty: 12, unitPrice: 29.99 }] },
  { title: "3/4in EMT Set Screw Connector (Bag of 25)", vendor: "Thomas & Betts", collection: "conduit-fittings", sku: "TNB-EMT-SSC-34-BG25", price: "18.99", compareAtPrice: "22.99", uom: "PK", descriptionHtml: "<p>Thomas & Betts 3/4 in. EMT set screw connectors, bag of 25, for dry indoor conduit terminations to enclosures and junction boxes. Zinc die-cast body with steel set screw; insulated throat protects conductors from sharp edges. UL listed per UL 514B; meets NEMA FB-1.</p>", tags: ["conduit-fittings", "b2b-demo", "emt", "set-screw", "connector", "3/4in", "sale"], pricingTiers: null },

  // lighting-fixtures (8)
  { title: "Lithonia 4ft LED Shop Light 40W 2-Pack", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-SHOPLT-4FT-40W-2PK", price: "54.99", compareAtPrice: null, uom: "PK", descriptionHtml: "<p>Lithonia Lighting 4 ft. 40W LED wraparound shop lights, 2-pack, delivering 4,400 lumens per fixture at 5000K daylight color temperature. Linkable design allows daisy-chaining up to 4 fixtures; 5-foot cord and plug included. Rated for dry/damp locations; 50,000-hour rated life, DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "shop-light", "4ft", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 49.99 }, { minQty: 10, unitPrice: 44.99 }, { minQty: 20, unitPrice: 39.99 }] },
  { title: "Lithonia UFO LED High Bay 100W", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-HBUFO-100W-5K", price: "89.99", compareAtPrice: "109.99", uom: "EA", descriptionHtml: "<p>Lithonia Lighting 100W UFO round LED high bay fixture producing 13,000 lumens at 5000K, replacing 250W metal halide. Die-cast aluminum housing with polycarbonate lens; IP65 rated for wet/dusty environments. 0–10V dimming ready, 120–277V universal voltage, DLC Premium listed, 5-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "high-bay", "ufo", "100w", "sale"], pricingTiers: null },
  { title: "Lithonia UFO LED High Bay 150W", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-HBUFO-150W-5K", price: "119.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 150W UFO LED high bay producing 19,500 lumens at 5000K for warehouses and manufacturing floors with 20–40 ft mounting heights. IP65-rated aluminum housing, 0–10V dimming, 120–277V universal input, DLC Premium listed. Replaces 400W metal halide with 62% energy savings.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "high-bay", "ufo", "150w", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 109.99 }, { minQty: 10, unitPrice: 99.99 }, { minQty: 20, unitPrice: 89.99 }] },
  { title: "Lithonia 2x4 LED Troffer 50W 5000K", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-TROF-2X4-50W-5K", price: "74.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 2 ft. x 4 ft. 50W LED lay-in troffer producing 5,500 lumens at 5000K for office and commercial ceiling grid applications. 0–10V dimming compatible; fits standard 15/16 in. T-bar grid. DLC listed, Title 24 compliant, 50,000-hour rated life, 5-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "troffer", "2x4", "new"], pricingTiers: null },
  { title: "Hubbell 8ft LED Strip Light 60W", vendor: "Hubbell Lighting", collection: "lighting-fixtures", sku: "HUB-STRIP-8FT-60W-4K", price: "94.99", compareAtPrice: "114.99", uom: "EA", descriptionHtml: "<p>Hubbell Lighting 8 ft. 60W LED industrial strip light delivering 7,800 lumens at 4000K neutral white for warehouses, parking garages, and utility spaces. Surface or pendant mount; V-shaped reflector for optimized distribution. 120–277V, IP44 rated, 70,000-hour L70 life; DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "strip-light", "8ft", "sale"], pricingTiers: null },
  { title: "RAB Area Light 150W Bronze LED", vendor: "RAB Lighting", collection: "lighting-fixtures", sku: "RAB-AREA-150W-BRZ-5K", price: "249.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>RAB Lighting AREA4T150 150W LED area light in bronze finish producing 18,000 lumens at 5000K for parking lots, roadways, and large outdoor areas. Die-cast aluminum housing, Type IV distribution, IK08 impact rated, IP65 sealed, 0–10V dimming. DLC Premium listed; 10-year limited warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "area-light", "outdoor", "new"], pricingTiers: null },
  { title: "Lithonia LED Wall Pack 26W Bronze", vendor: "Lithonia Lighting", collection: "lighting-fixtures", sku: "LIT-WALLPK-26W-BRZ-4K", price: "64.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Lithonia Lighting 26W LED full-cutoff wall pack in bronze finish, producing 2,800 lumens at 4000K for building perimeters, stairwells, and loading docks. Die-cast aluminum housing with photocell (dusk-to-dawn) included; IP65 rated for wet locations. 120–277V universal, DLC listed.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "wall-pack", "outdoor"], pricingTiers: null },
  { title: "Philips LED PL-C 13W Lamp (Carton of 10)", vendor: "Philips", collection: "lighting-fixtures", sku: "PHI-LEDPLC-13W-4P-CTN10", price: "79.99", compareAtPrice: "94.99", uom: "CTN", descriptionHtml: "<p>Philips 13W LED PL-C 4-pin retrofit lamp (carton of 10) replacing 26W CFL PL-C lamps in 4-pin ballast bypass fixtures. 1,200-lumen output at 4000K with 80+ CRI; compatible with electronic ballasts or direct-wire configuration. Energy Star certified, 25,000-hour rated life, 3-year warranty.</p>", tags: ["lighting-fixtures", "b2b-demo", "led", "pl-c", "lamp", "retrofit", "sale"], pricingTiers: null },

  // switches-receptacles (8)
  { title: "Leviton 20A Duplex Receptacle White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5352-W-BX10", price: "39.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5352 20-amp 125V duplex receptacle in white finish, commercial-grade, box of 10. Side-wire and back-wire terminals accept 10–12 AWG copper conductors; T-slot design accepts 20A and 15A plugs. Listed for residential and commercial use; UL listed, meets NEMA WD-6 specifications.</p>", tags: ["switches-receptacles", "b2b-demo", "receptacle", "20a", "duplex", "leviton", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 35.99 }, { minQty: 10, unitPrice: 31.99 }, { minQty: 20, unitPrice: 27.99 }] },
  { title: "Leviton 20A GFCI Receptacle White (Box of 5)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-GFNT2-W-BX5", price: "54.99", compareAtPrice: "64.99", uom: "BX", descriptionHtml: "<p>Leviton GFNT2 20-amp GFCI duplex receptacle in white, box of 5, with self-test SmartLock Pro technology that locks out power if GFCI protection is lost. Monochromatic design; accepts 20A and 15A plugs. Required for kitchens, bathrooms, garages, and outdoor locations per NEC; UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "gfci", "receptacle", "20a", "leviton", "sale"], pricingTiers: null },
  { title: "Hubbell 20A Hospital Grade Receptacle (Box of 10)", vendor: "Hubbell", collection: "switches-receptacles", sku: "HUB-HBL5362W-BX10", price: "149.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Hubbell HBL5362 20-amp 125V hospital grade duplex receptacle in white, box of 10. Green dot marking certifies hospital grade construction with extra-heavy-duty contacts and housing. Side-wire binding screw and back-wire push-in terminals; UL listed for health care facilities per NFPA 99.</p>", tags: ["switches-receptacles", "b2b-demo", "hospital-grade", "receptacle", "20a", "hubbell", "new"], pricingTiers: null },
  { title: "Leviton 20A Single-Pole Switch White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5621-W-BX10", price: "34.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5621 20-amp 120/277V commercial-grade single-pole toggle switch in white, box of 10. AC-rated for fluorescent, incandescent, and motor loads; back-wire and side-wire terminals accept 10–12 AWG copper. Listed in NEMA WD-1 configuration; UL listed for residential and commercial applications.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "single-pole", "20a", "leviton", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 29.99 }, { minQty: 10, unitPrice: 26.99 }, { minQty: 20, unitPrice: 23.99 }] },
  { title: "Leviton 20A 3-Way Switch White (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5603-W-BX10", price: "54.99", compareAtPrice: "64.99", uom: "BX", descriptionHtml: "<p>Leviton 5603 20-amp 120/277V commercial-grade 3-way toggle switch in white, box of 10. Clearly marked common terminal screw; suitable for two-point control of lighting loads in hallways, stairwells, and large rooms. AC-rated for fluorescent and incandescent loads; UL listed.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "3-way", "20a", "leviton", "sale"], pricingTiers: null },
  { title: "Leviton 20A 4-Way Switch White (Box of 5)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5604-W-BX5", price: "44.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5604 20-amp 120/277V commercial-grade 4-way toggle switch in white, box of 5, for multi-point lighting control with 3-way switches. Four screw terminals for traveler wires; AC-rated for fluorescent, incandescent, and tungsten-halogen loads. UL listed for residential and commercial use.</p>", tags: ["switches-receptacles", "b2b-demo", "switch", "4-way", "20a", "leviton"], pricingTiers: null },
  { title: "Leviton 20A Isolated Ground Receptacle Orange (Box of 10)", vendor: "Leviton", collection: "switches-receptacles", sku: "LEV-5362-IG-BX10", price: "84.99", compareAtPrice: null, uom: "BX", descriptionHtml: "<p>Leviton 5362-IG 20-amp isolated ground duplex receptacle in orange finish, box of 10, for sensitive electronics and data equipment requiring a clean, noise-free ground reference. Isolated grounding pin prevents electromagnetic interference from propagating through conduit. UL listed; identified by orange color per NEC 406.3(D)(3).</p>", tags: ["switches-receptacles", "b2b-demo", "isolated-ground", "receptacle", "20a", "leviton", "new"], pricingTiers: null },
  { title: "Hubbell 20A L5-20 Twist-Lock Receptacle", vendor: "Hubbell", collection: "switches-receptacles", sku: "HUB-HBL2310-L520R", price: "24.99", compareAtPrice: "29.99", uom: "EA", descriptionHtml: "<p>Hubbell HBL2310 20-amp 125V NEMA L5-20R locking receptacle for generators, UPS systems, and portable power equipment requiring a secure, vibration-resistant connection. 2-pole 3-wire grounding configuration; screw terminals accept 10–12 AWG conductors. UL listed, NEMA WD-6 compliant.</p>", tags: ["switches-receptacles", "b2b-demo", "twist-lock", "receptacle", "20a", "hubbell", "sale"], pricingTiers: null },

  // tools-safety (6)
  { title: "Klein 11-in-1 Multi-Bit Screwdriver", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-32500-11N1", price: "24.99", compareAtPrice: null, uom: "EA", descriptionHtml: "<p>Klein Tools 32500 11-in-1 screwdriver and nut driver with interchangeable bits including 6 screwdriver bits (Phillips #1, #2, #3; slotted 3/16, 1/4, 5/16) and 5 nut driver sizes (3/8, 5/16, 1/4, 3/16, 11/32 in.). Cushion-grip handle with wire bender/loop hole; bits store in handle. Meets ASME B107.17 standards.</p>", tags: ["tools-safety", "b2b-demo", "screwdriver", "multi-bit", "klein", "bulk"], pricingTiers: [{ minQty: 5, unitPrice: 21.99 }, { minQty: 10, unitPrice: 19.99 }, { minQty: 25, unitPrice: 17.99 }] },
  { title: "Klein Electrician Scissors 3-Pack", vendor: "Klein Tools", collection: "tools-safety", sku: "KLN-2100-7-3PK", price: "39.99", compareAtPrice: "46.99", uom: "PK", descriptionHtml: "<p>Klein Tools 2100-7 electrician scissors, 3-pack, with hardened steel blades for cutting wire, cable, and insulation cleanly and precisely. Serrated edge grips wire during cutting; notched blade strips 12 and 14 AWG solid wire. Plastic dip handles for grip; hot-riveted pivot for longevity.</p>", tags: ["tools-safety", "b2b-demo", "scissors", "electrician", "klein", "sale"], pricingTiers: null },
  { title: "Fluke T6-1000 PRO Electrical Tester", vendor: "Fluke", collection: "tools-safety", sku: "FLK-T6-1000PRO", price: "189.99", compareAtPrice: "219.99", uom: "EA", descriptionHtml: "<p>Fluke T6-1000 PRO non-contact electrical tester measures voltage (1–1000V AC), current (0.5–200A), and frequency without test leads, using FieldSense technology through the wire's insulation. CAT IV 600V / CAT III 1000V safety rated; VoltAlert for non-contact voltage detection. IP40 rated; includes holster.</p>", tags: ["tools-safety", "b2b-demo", "tester", "voltage", "fluke", "sale", "new"], pricingTiers: null },
  { title: "3M Safety Vest Class 2 (Carton of 6)", vendor: "3M", collection: "tools-safety", sku: "3M-VEST-C2-OR-CTN6", price: "89.99", compareAtPrice: null, uom: "CTN", descriptionHtml: "<p>3M high-visibility Class 2 safety vest in fluorescent orange with 2 in. silver retroreflective tape, carton of 6 (sizes M–XL available). Meets ANSI/ISEA 107-2020 Class 2 requirements for workers on or near roadways and job sites. Zipper front closure, two chest pockets, mic tab; machine washable polyester mesh.</p>", tags: ["tools-safety", "b2b-demo", "safety-vest", "class-2", "hi-vis", "bulk"], pricingTiers: [{ minQty: 2, unitPrice: 79.99 }, { minQty: 4, unitPrice: 72.99 }, { minQty: 8, unitPrice: 66.99 }] },
  { title: "Pyramex Hard Hat White (Carton of 6)", vendor: "Pyramex", collection: "tools-safety", sku: "PYR-HP14110-WHT-CTN6", price: "74.99", compareAtPrice: "89.99", uom: "CTN", descriptionHtml: "<p>Pyramex HP14110 full brim hard hat in white, carton of 6, with 6-point nylon suspension and ratchet adjustment (6.5–8 in. head size). ANSI/ISEA Z89.1-2014 Type I Class E rated for electrical hazards up to 20,000V. ABS shell withstands impact and penetration; slots accept compatible accessories.</p>", tags: ["tools-safety", "b2b-demo", "hard-hat", "ppe", "pyramex", "sale"], pricingTiers: null },
  { title: "Ideal T-100 Wire Stripper/Cutter Kit", vendor: "Ideal Industries", collection: "tools-safety", sku: "IDL-T100-KIT-SET", price: "54.99", compareAtPrice: null, uom: "SET", descriptionHtml: "<p>Ideal Industries T-100 wire stripper and cutter kit including the T-100 stripper (strips 10–18 AWG solid, 12–20 AWG stranded), a matching wire cutter, and a screw-terminal crimper tool in a carrying pouch. Spring-loaded handles reduce hand fatigue; precision-ground blades for clean, nick-free stripping. Meets ANSI/ASME B107 tool standards.</p>", tags: ["tools-safety", "b2b-demo", "wire-stripper", "kit", "ideal", "new"], pricingTiers: null },
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
    ];
    if (product.pricingTiers !== null) {
      metafields.push({
        namespace: "custom",
        key: "pricing_tiers",
        value: JSON.stringify(product.pricingTiers),
        type: "json",
      });
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
          sku: product.sku,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          inventoryItem: { tracked: true },
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
              delta: 200,
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

    // 1. customerCreate for contacts[0]
    const custData = await graphql<{
      customerCreate: {
        customer: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { message }
        }
      }`,
      {
        input: {
          firstName: firstContact.firstName,
          lastName: firstContact.lastName,
          email: firstContact.email,
          emailMarketingConsent: { marketingState: "NOT_SUBSCRIBED" },
        },
      }
    );

    if (!custData.customerCreate.customer) {
      console.warn(`  ⚠ Customer for ${firstContact.email}: ${custData.customerCreate.userErrors.map(e => e.message).join(", ")}`);
      await sleep(600);
      continue;
    }

    const mainCustomerId = custData.customerCreate.customer.id;
    const mainCustomerNumericId = parseInt(mainCustomerId.split("/").pop() ?? "0");

    // 2. companyCreate
    const compData = await graphql<{
      companyCreate: {
        company: {
          id: string;
          locations: { edges: Array<{ node: { id: string } }> };
          contacts: { edges: Array<{ node: { id: string } }> };
        } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CompanyCreate($input: CompanyCreateInput!) {
        companyCreate(input: $input) {
          company {
            id
            locations(first: 1) { edges { node { id } } }
            contacts(first: 1) { edges { node { id } } }
          }
          userErrors { field message }
        }
      }`,
      {
        input: {
          company: {
            name: company.name,
            externalId: company.externalId,
          },
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
          companyContact: {
            customerId: mainCustomerId,
          },
        },
      }
    );

    if (!compData.companyCreate.company) {
      console.warn(`  ⚠ ${company.name}: ${compData.companyCreate.userErrors.map(e => e.message).join(", ")}`);
      await sleep(600);
      continue;
    }

    const companyId = compData.companyCreate.company.id;
    const hqLocationId = compData.companyCreate.company.locations.edges[0]?.node.id ?? "";
    const mainContactId = compData.companyCreate.company.contacts.edges[0]?.node.id ?? "";

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

    // 4. Create remaining contacts and add to company
    const contactIds: string[] = [mainContactId];
    const contactCustomerIds: string[] = [mainCustomerId];

    for (let i = 1; i < company.contacts.length; i++) {
      const contact = company.contacts[i]!;

      // customerCreate
      const addCustData = await graphql<{
        customerCreate: {
          customer: { id: string } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation CustomerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer { id }
            userErrors { message }
          }
        }`,
        {
          input: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            emailMarketingConsent: { marketingState: "NOT_SUBSCRIBED" },
          },
        }
      );

      const addedCustomerId = addCustData.customerCreate.customer?.id;
      if (!addedCustomerId) {
        console.warn(`    ⚠ Customer ${contact.email}: ${addCustData.customerCreate.userErrors.map(e => e.message).join(", ")}`);
        await sleep(300);
        continue;
      }

      contactCustomerIds.push(addedCustomerId);

      // companyContactCreate
      const addContactData = await graphql<{
        companyContactCreate: {
          companyContact: { id: string } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation CompanyContactCreate($companyId: ID!, $input: CompanyContactInput!) {
          companyContactCreate(companyId: $companyId, input: $input) {
            companyContact { id }
            userErrors { message }
          }
        }`,
        {
          companyId,
          input: {
            customerId: addedCustomerId,
          },
        }
      );

      const addedContactId = addContactData.companyContactCreate.companyContact?.id;
      if (addedContactId) {
        contactIds.push(addedContactId);
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
    const adminRoleId = roleEdges.find(e => e.node.name.toLowerCase() === "admin")?.node.id ?? "";
    const buyerRoleId = roleEdges.find(e => e.node.name.toLowerCase() === "buyer")?.node.id ?? "";

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

    // 7. Set company metafield for customer SKUs
    await graphql<{ companyUpdate: { company: { id: string } | null; userErrors: Array<{ message: string }> } }>(
      `mutation CompanyUpdateMeta($id: ID!, $mf: [MetafieldInput!]!) {
        companyUpdate(companyId: $id, input: { metafields: $mf }) {
          company { id }
          userErrors { message }
        }
      }`,
      {
        id: companyId,
        mf: [{
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

    let priceListId = plData.priceListCreate.priceList?.id;
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
            customerId: c.mainCustomerId,
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
  console.log("\n✅ Done! Run npm run algolia-sync next.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
