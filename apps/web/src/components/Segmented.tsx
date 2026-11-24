import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string = string> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  label: string;
  labelId?: string;
  options: readonly [SegmentedOption<T>, SegmentedOption<T>];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string = string>({
  label,
  labelId,
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedProps<T>) {
  const groupLabelId = labelId ?? "tem-segmented-label";

  return (
    <div className={cx("tem-field", className)}>
      <span className="tem-field__label" id={groupLabelId}>
        {label}
      </span>
      <div
        className="tem-segmented"
        role="group"
        aria-labelledby={groupLabelId}
        {...props}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
