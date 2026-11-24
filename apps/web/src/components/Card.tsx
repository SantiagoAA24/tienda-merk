import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export type CardProps = HTMLAttributes<HTMLElement> & {
  hero?: boolean;
  overlap?: boolean;
  children: ReactNode;
};

export function Card({
  hero = false,
  overlap = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cx(
        "tem-card",
        hero && "tem-card--hero",
        overlap && "tem-overlap",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export type CardHeadProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardHead({ className, children, ...props }: CardHeadProps) {
  return (
    <div className={cx("tem-card__head", className)} {...props}>
      {children}
    </div>
  );
}

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h2 className={cx("tem-card__title", className)} {...props}>
      {children}
    </h2>
  );
}
