import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cx } from "./cx";
import { IconClose } from "./icons";

export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;
  children?: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  id,
  className,
  inputProps,
  children,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("tem-field", error && "tem-field--error", className)}>
      <label className="tem-field__label" htmlFor={fieldId}>
        {label}
      </label>
      {children ?? (
        <input
          className="tem-input"
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
      )}
      {hint && !error ? (
        <span className="tem-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="tem-field__error" id={errorId} role="alert">
          <IconClose size={14} />
          {error}
        </span>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cx("tem-input", className)} {...props} />;
}
