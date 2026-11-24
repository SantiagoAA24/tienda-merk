import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";
import { IconCheck } from "./icons";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> & {
  children: ReactNode;
};

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <label className={cx("tem-check", className)}>
      <input type="checkbox" className="tem-check__input" {...props} />
      <span className="tem-check__box" aria-hidden="true">
        <IconCheck size={15} strokeWidth={3.4} />
      </span>
      {children}
    </label>
  );
}
