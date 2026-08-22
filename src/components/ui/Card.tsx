import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type CardOwnProps = {
  as?: ElementType;
  shadow?: boolean;
  className?: string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardOwnProps &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps>;

export function Card<T extends ElementType = "div">({
  as,
  className = "",
  shadow = false,
  ...props
}: CardProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={`bg-white rounded-xl border border-gray-200 ${
        shadow ? "shadow-sm" : ""
      } ${className}`}
      {...props}
    />
  );
}
