import type { InputHTMLAttributes } from "react";
import { useId, useState } from "react";

import { cx } from "./cx";
import { Field } from "./Field";
import { IconEye, IconEyeOff } from "./icons";

export type PasswordFieldProps = {
  label: string;
  invalid?: boolean;
  className?: string;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "className" | "type"
  >;
};

export function PasswordField({
  label,
  invalid,
  className,
  inputProps,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <Field
      label={label}
      id={id}
      className={cx(invalid && "tem-field--error", className)}
    >
      <div className="tem-password">
        <input
          id={id}
          className="tem-input"
          type={visible ? "text" : "password"}
          aria-invalid={invalid ? true : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="tem-password__toggle"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </Field>
  );
}
