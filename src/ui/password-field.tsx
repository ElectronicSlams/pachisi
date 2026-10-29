"use client";

import { forwardRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/icon";
import { Field, type FieldProps } from "../ui/field";

export type PasswordFieldProps = Omit<FieldProps, "type" | "controlAfter"> & {
  readonly showLabel?: ReactNode;
  readonly hideLabel?: ReactNode;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { showLabel = "Show password", hideLabel = "Hide password", className = "", maxLength = 128, description = "Up to 128 characters.", ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const actionLabel = visible ? hideLabel : showLabel;
  return (
    <Field
      {...props}
      maxLength={maxLength}
      description={description}
      ref={ref}
      className={`ui-password-field ui-password-input ${className}`.trim()}
      type={visible ? "text" : "password"}
      controlAfter={(
        <button
          className="ui-password-toggle"
          type="button"
          aria-label={typeof actionLabel === "string" ? actionLabel : undefined}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          disabled={props.disabled}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    />
  );
});
