import { useId, type HTMLAttributes } from "react";

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
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "default" | "compact";
};

export function Segmented<T extends string = string>({
  label,
  labelId,
  options,
  value,
  onChange,
  size = "default",
  className,
  ...props
}: SegmentedProps<T>) {
  const generatedId = useId();
  const groupLabelId = labelId ?? generatedId;

  return (
    <div className={cx("tem-field", className)}>
      <span className="tem-field__label" id={groupLabelId}>
        {label}
      </span>
      <div
        className={cx(
          "tem-segmented",
          size === "compact" && "tem-segmented--compact",
        )}
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
