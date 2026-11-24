import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";
import { IconArrowUp, IconCheck, IconClock, IconClose } from "./icons";

export type InvoiceStatus = "accepted" | "pending" | "rejected";

export type ChipVariant =
  | "ok"
  | "pending"
  | "error"
  | "delta"
  | "weight"
  | "fixed";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant: ChipVariant;
  children: ReactNode;
};

const variantClass: Record<ChipVariant, string> = {
  ok: "tem-chip--ok",
  pending: "tem-chip--pending",
  error: "tem-chip--error",
  delta: "tem-chip--delta",
  weight: "tem-chip--weight",
  fixed: "tem-chip--fixed",
};

export function Chip({ variant, className, children, ...props }: ChipProps) {
  return (
    <span className={cx("tem-chip", variantClass[variant], className)} {...props}>
      {children}
    </span>
  );
}

const statusConfig: Record<
  InvoiceStatus,
  { variant: ChipVariant; label: string; icon: ReactNode }
> = {
  accepted: {
    variant: "ok",
    label: "Aceptada",
    icon: <IconCheck />,
  },
  pending: {
    variant: "pending",
    label: "Por reenviar",
    icon: <IconClock />,
  },
  rejected: {
    variant: "error",
    label: "Rechazada",
    icon: <IconClose />,
  },
};

export type StatusChipProps = Omit<ChipProps, "variant" | "children"> & {
  status: InvoiceStatus;
};

export function StatusChip({ status, ...props }: StatusChipProps) {
  const config = statusConfig[status];
  return (
    <Chip variant={config.variant} {...props}>
      {config.icon}
      {config.label}
    </Chip>
  );
}

export type DeltaChipProps = Omit<ChipProps, "variant" | "children"> & {
  children: ReactNode;
};

export function DeltaChip({ children, ...props }: DeltaChipProps) {
  return (
    <Chip variant="delta" {...props}>
      <IconArrowUp />
      {children}
    </Chip>
  );
}
