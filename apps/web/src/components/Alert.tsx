import type { ReactNode } from "react";

import { cx } from "./cx";
import { IconAlert } from "./icons";

export type AlertProps = {
  children: ReactNode;
  className?: string;
};

/** Error message: always icon plus text, never color alone. */
export function Alert({ children, className }: AlertProps) {
  return (
    <div role="alert" className={cx("tem-alert", className)}>
      <IconAlert />
      <span>{children}</span>
    </div>
  );
}
