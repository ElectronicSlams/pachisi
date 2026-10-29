"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "../ui/icon";
import { useControlledModalDialog } from "./use-controlled-modal-dialog";

export type DialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly closeLabel?: string;
  readonly closeDisabled?: boolean;
  readonly className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Close dialog",
  closeDisabled = false,
  className = "",
}: DialogProps) {
  const dialogRef = useControlledModalDialog(open, () => { if (!closeDisabled) onClose(); });
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={dialogRef}
      className={`ui-dialog ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // A nested modal's Escape event must not dismiss its parent.
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!closeDisabled) onClose();
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        if (open && !closeDisabled) onClose();
      }}
    >
      <div className="ui-dialog-surface">
        <header className="ui-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button className="icon-btn" type="button" aria-label={closeLabel} onClick={onClose} disabled={closeDisabled}>
            <Icon name="close" size={15} />
          </button>
        </header>
        <div className="ui-dialog-content">{children}</div>
        {footer ? <footer className="ui-dialog-footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
