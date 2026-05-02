import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<ComponentPropsWithoutRef<typeof BaseButton>, "className"> & {
  className?: string | undefined;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClass =
  "m-0 inline-flex select-none items-center justify-center rounded-md border outline-0 font-inherit font-semibold leading-6 transition focus-visible:outline-2 focus-visible:outline-stone-950 focus-visible:-outline-offset-1 disabled:pointer-events-none disabled:opacity-60 data-[disabled]:pointer-events-none data-[disabled]:opacity-60";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border-stone-950 bg-stone-950 text-white shadow-sm hover:bg-stone-700 hover:border-stone-700",
  secondary: "border-border bg-card text-foreground hover:bg-muted",
  ghost: "border-transparent bg-transparent text-foreground shadow-none hover:text-primary",
  danger:
    "border-rose-700 bg-rose-700 text-white shadow-sm hover:border-rose-800 hover:bg-rose-800",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-4 text-base",
  lg: "h-14 px-5 text-base",
};

export function buttonClassName(
  options: {
    className?: string | undefined;
    size?: ButtonSize;
    variant?: ButtonVariant;
  } = {},
): string {
  const { className, size = "md", variant = "primary" } = options;
  return [baseClass, variantClass[variant], sizeClass[size], className].filter(Boolean).join(" ");
}

export function Button({
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps): React.ReactElement {
  return <BaseButton className={buttonClassName({ className, size, variant })} {...props} />;
}
