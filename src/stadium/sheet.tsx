"use client";

import type { ReactNode } from "react";
import { Dialog } from "../ui/dialog";

/**
 * Stadium sheet: a bottom sheet with a grab handle on phones, a centred
 * modal on desktop. Built on the native <dialog> in components/ui/dialog, so
 * it traps focus, closes on Escape and the scrim, and returns focus.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: "sm" | "md" | "lg";
}) {
  return (
    <Dialog className={`st-sheet st-sheet-${size}`} description={description} footer={footer} onClose={onClose} open={open} title={title}>
      {children}
    </Dialog>
  );
}
