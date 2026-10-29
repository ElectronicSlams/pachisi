"use client";

import { useId, useState } from "react";
import { Button } from "../ui/button";

export type CopyFieldProps = {
  readonly label: string;
  readonly value: string;
  readonly multiline?: boolean;
  readonly sensitive?: boolean;
  readonly className?: string;
};

export function CopyField({ label, value, multiline = false, sensitive = false, className = "" }: CopyFieldProps) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={`ui-copy-field ${className}`.trim()}>
      <label className="ui-field-label" htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} className="input mono ui-copy-value" value={value} readOnly rows={Math.min(10, Math.max(3, value.split("\n").length))} aria-label={sensitive ? `${label}; sensitive value` : label} />
      ) : (
        <input id={id} className="input mono ui-copy-value" value={value} readOnly type={sensitive ? "password" : "text"} />
      )}
      <Button type="button" size="sm" variant="secondary" icon={status === "copied" ? "check" : "copy"} onClick={() => void copy()}>
        {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy"}
      </Button>
      <span className="sr-only" aria-live="polite">{status === "copied" ? `${label} copied.` : status === "error" ? `${label} could not be copied.` : ""}</span>
    </div>
  );
}
