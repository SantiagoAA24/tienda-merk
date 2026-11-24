import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export type StatItem = {
  value: string;
  label: string;
};

export type StatsProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow: string;
  total: string;
  delta?: ReactNode;
  items: readonly [StatItem, StatItem, StatItem];
};

export function Stats({
  eyebrow,
  total,
  delta,
  items,
  className,
  ...props
}: StatsProps) {
  return (
    <div className={cx(className)} {...props}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="tem-eyebrow">{eyebrow}</div>
        {delta}
      </div>
      <div className="tem-total">{total}</div>
      <div className="tem-stats">
        {items.map((item) => (
          <div key={item.label}>
            <div className="tem-stat__value">{item.value}</div>
            <div className="tem-stat__label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
