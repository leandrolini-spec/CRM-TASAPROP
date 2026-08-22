import type { HTMLAttributes } from "react";

type Tone = "navy" | "cyan" | "lime" | "gray" | "green" | "red" | "orange";

const TONE_CLASSES: Record<Tone, string> = {
  navy: "bg-brand-navy/10 text-brand-navy",
  cyan: "bg-brand-cyan/15 text-brand-navy",
  lime: "bg-brand-lime/25 text-brand-navy",
  gray: "bg-gray-100 text-brand-gray",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({
  className = "",
  tone = "gray",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
