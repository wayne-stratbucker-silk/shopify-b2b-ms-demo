import { useCallback } from "react";

/**
 * Shared behavior for quantity number inputs across the storefront.
 *
 * - onFocus: clears the visible value so the user can type a fresh number
 *   without first deleting the existing one. We mutate the DOM value directly
 *   (the input is controlled by `value={qty}`); React reconciles it on the
 *   next render driven by onChange/onBlur, so increment/decrement and any
 *   downstream logic keep working off the real `qty` state.
 * - onBlur: if the field was left empty or invalid, coerce it back to `min`
 *   (default 1) by re-syncing through the provided setter, never NaN/blank.
 *
 * Pair with the `qty-input` CSS class for centered text + hidden native spinner.
 */
export function useQtyInput(setQty: (value: number) => void, min = 1) {
  const onFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the displayed value so the user types into an empty box.
    e.target.value = "";
  }, []);

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < min) {
        // Restore to the minimum; setQty re-renders the controlled value.
        setQty(min);
        e.target.value = String(min);
      }
    },
    [setQty, min],
  );

  return { onFocus, onBlur };
}
