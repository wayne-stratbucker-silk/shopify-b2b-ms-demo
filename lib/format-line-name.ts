// ─── Product-name + variant-option formatting ───────────────────────────────
//
// Single source of truth for the "Name (Option: Value, …)" pattern used wherever
// a line item's product name is rendered (cart, quick order, saved-list detail).
// Each surface gathers its own variant option pairs from whatever data it has on
// hand (BC cart `options`, quick-order `VariantOption`, batch-fetched variant
// labels) and hands them here so the display string stays consistent everywhere.

/** One variant option name/value pair (e.g. `{ name: "Color", value: "Red" }`). */
export interface NameOptionPair {
  name?: string | null;
  value?: string | null;
}

/**
 * Append variant option `name: value` pairs to a product name, in parentheses.
 *
 *   formatLineName("Cat6 Cable", [{ name: "Length", value: "50 ft" }, { name: "Gauge", value: "12 AWG" }])
 *     → "Cat6 Cable (Length: 50 ft, Gauge: 12 AWG)"
 *
 * Pairs missing a value are dropped; a pair with a value but no name renders the
 * value alone. Returns the bare name when there are no usable options.
 */
export function formatLineName(name: string, options?: NameOptionPair[] | null): string {
  if (!options?.length) return name;
  const pairs = options
    .map((o) => {
      const value = o.value?.toString().trim();
      if (!value) return null;
      const optName = o.name?.toString().trim();
      return optName ? `${optName}: ${value}` : value;
    })
    .filter((s): s is string => !!s);
  return pairs.length ? `${name} (${pairs.join(", ")})` : name;
}
