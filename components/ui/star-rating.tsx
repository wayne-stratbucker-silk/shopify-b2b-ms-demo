// Simple, dependency-free star rating display (rounds to the nearest half).
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span aria-label={`${rating} out of 5 stars`} style={{ display: "inline-flex", gap: 1, color: "#f59e0b", fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true">
          {rounded >= i ? "★" : rounded >= i - 0.5 ? "⯨" : "☆"}
        </span>
      ))}
    </span>
  );
}
