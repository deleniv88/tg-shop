"use client";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  size,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "lg";
}) {
  return (
    <div className={`stepper${size === "lg" ? " lg" : ""}`}>
      <button type="button" aria-label="−" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
