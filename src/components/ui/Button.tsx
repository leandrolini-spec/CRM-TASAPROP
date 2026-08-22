import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand-navy text-white hover:opacity-90 disabled:opacity-50 shadow-sm",
  secondary:
    "bg-white text-brand-navy border border-gray-300 hover:bg-gray-50 disabled:opacity-50",
  ghost: "text-brand-gray hover:text-brand-navy hover:bg-gray-100 disabled:opacity-50",
  danger: "bg-white text-red-600 border border-gray-300 hover:bg-red-50 disabled:opacity-50",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className = "", variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
});
