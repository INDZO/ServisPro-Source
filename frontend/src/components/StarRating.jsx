
import React, { useMemo, useState } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function StarRating({
  value = 0,
  readOnly = false,
  onChange,
  size = "md",
  className = "",
}) {
  const safeValue = clamp(Number(value || 0), 0, 5);

  if (readOnly) {
    const pct = (safeValue / 5) * 100;

    return (
      <span className={`starRO starRO--${size} ${className}`.trim()} aria-label={`${safeValue} od 5`}>
        <span className="starROBase">★★★★★</span>
        <span className="starROFill" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
    );
  }

  const [hover, setHover] = useState(0);
  const rounded = Math.round(safeValue);
  const current = hover || rounded;

  const stars = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const idx = i + 1;
      return { idx, filled: idx <= current };
    });
  }, [current]);

  return (
    <div className={`starRating starRating--${size} ${className}`.trim()}>
      {stars.map((s) => (
        <button
          key={s.idx}
          type="button"
          className={`starBtn ${s.filled ? "isFilled" : ""}`}
          aria-label={`${s.idx} od 5`}
          title={`${s.idx} / 5`}
          onClick={() => onChange && onChange(s.idx)}
          onMouseEnter={() => setHover(s.idx)}
          onMouseLeave={() => setHover(0)}
        >
          {s.filled ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
