"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/icon";

export type TerminalLine = { readonly id: string; readonly content: ReactNode };

/** The dark-in-both-themes terminal from the Open source door, with copy. */
export function Terminal({ title, lines, copyText }: { readonly title: string; readonly lines: readonly TerminalLine[]; readonly copyText?: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy(): Promise<void> {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus("copied");
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="terminal">
      <div className="term-bar">
        <span aria-hidden="true" className="term-dots"><i /><i /><i /></span>
        <span className="term-title mono">{title}</span>
        {copyText ? (
          <button className="term-copy" type="button" onClick={() => void copy()}>
            <Icon name={copyStatus === "copied" ? "check" : "copy"} size={13} />
            <span aria-live="polite">{copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy"}</span>
          </button>
        ) : null}
      </div>
      <div className="term-body mono" role="region" aria-label={`${title} code`} tabIndex={0}>{lines.map((line) => <div className="term-line" key={line.id}>{line.content}</div>)}</div>
    </div>
  );
}
