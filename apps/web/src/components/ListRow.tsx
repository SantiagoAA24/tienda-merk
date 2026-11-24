import type { HTMLAttributes, ReactNode } from "react";

import { StatusChip, type InvoiceStatus } from "./Chip";
import { cx } from "./cx";

export type ListRowProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  meta: string;
  status: InvoiceStatus;
  trailing?: ReactNode;
};

export function ListRow({
  title,
  meta,
  status,
  trailing,
  className,
  ...props
}: ListRowProps) {
  return (
    <div className={cx("tem-listrow", className)} {...props}>
      <div>
        <div className="tem-listrow__title">{title}</div>
        <div className="tem-listrow__meta">{meta}</div>
      </div>
      {trailing ?? <StatusChip status={status} />}
    </div>
  );
}
