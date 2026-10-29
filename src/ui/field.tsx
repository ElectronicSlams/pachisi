"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly controlAfter?: ReactNode;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, description, error, id, className = "", inputClassName = "", controlAfter, "aria-describedby": describedBy, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const ariaDescribedBy = [describedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-field ${className}`.trim()}>
      <label className="ui-field-label" htmlFor={inputId}>{label}</label>
      <div className="ui-field-control">
        <input
          {...inputProps}
          ref={ref}
          id={inputId}
          className={`input ${inputClassName}`.trim()}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
        />
        {controlAfter}
      </div>
      {description ? <span className="ui-field-description" id={descriptionId}>{description}</span> : null}
      {error ? <span className="ui-field-error" id={errorId}>{error}</span> : null}
    </div>
  );
});
