"use client";

import { useEffect, useEffectEvent, useRef } from "react";

const dialogTabStopSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function dialogTabStops(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(dialogTabStopSelector)).filter((element) => (
    element.tabIndex >= 0
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden"
    && !element.closest("[inert]")
  ));
}

export function useControlledModalDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeFromEvent = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const closeFromBackdrop = (event: globalThis.MouseEvent) => {
      if (event.target === dialog) closeFromEvent();
    };
    const containKeyboardFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.target instanceof Element && event.target.closest("dialog") !== dialog) return;
      const tabStops = dialogTabStops(dialog);
      if (tabStops.length === 0) {
        event.preventDefault();
        dialog.tabIndex = -1;
        dialog.focus();
        return;
      }
      const first = tabStops[0]!;
      const last = tabStops.at(-1)!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("click", closeFromBackdrop);
    dialog.addEventListener("keydown", containKeyboardFocus);
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      dialog.showModal();
      queueMicrotask(() => {
        const initialFocus = dialog.querySelector<HTMLElement>("[autofocus]") ?? dialogTabStops(dialog)[0];
        if (initialFocus) initialFocus.focus();
        else {
          dialog.tabIndex = -1;
          dialog.focus();
        }
      });
    } else if (!open && dialog.open) {
      dialog.close();
      queueMicrotask(() => returnFocusRef.current?.focus());
    }
    return () => {
      dialog.removeEventListener("click", closeFromBackdrop);
      dialog.removeEventListener("keydown", containKeyboardFocus);
    };
  }, [open]);

  useEffect(() => () => {
    const returnFocus = returnFocusRef.current;
    const dialog = dialogRef.current;
    queueMicrotask(() => {
      if (!dialog?.isConnected) returnFocus?.focus();
    });
  }, []);

  return dialogRef;
}
