import type { HTMLAttributes, ReactNode } from "react";

export type SettingRowProps = HTMLAttributes<HTMLDivElement> & {
  readonly label: ReactNode;
  readonly value?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly strong?: boolean;
};

export function SettingRow({ label, value, description, action, strong = false, className = "", ...props }: SettingRowProps) {
  return (
    <div {...props} className={`set-row ui-setting-row${strong ? " set-row-strong" : ""} ${className}`.trim()}>
      <span className="set-l ui-setting-label">{label}</span>
      <span className="set-v ui-setting-value">{value}</span>
      {description ? <span className="ui-setting-description">{description}</span> : null}
      {action ? <span className="ui-setting-action">{action}</span> : null}
    </div>
  );
}
