import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "dark" | "text";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "tem-btn--primary",
  secondary: "tem-btn--secondary",
  dark: "tem-btn--dark",
  text: "tem-btn--text",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("tem-btn", variantClass[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
};

export function IconButton({
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button type={type} className={cx("tem-iconbtn", className)} {...props}>
      {children}
    </button>
  );
}
