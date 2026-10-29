import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../ui/icon";

export type CalloutProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
  readonly tone?: "info" | "success" | "warning" | "danger";
  readonly title?: ReactNode;
  readonly icon?: IconName;
};

const defaultIcons: Record<NonNullable<CalloutProps["tone"]>, IconName> = {
  info: "lock",
  success: "check",
  warning: "bell",
  danger: "close",
};

export function Callout({ children, tone = "info", title, icon, className = "", role, ...props }: CalloutProps) {
  return (
    <div
      {...props}
      className={`ui-callout ui-callout-${tone} ${className}`.trim()}
      role={role ?? (tone === "danger" ? "alert" : "status")}
    >
      <Icon name={icon ?? defaultIcons[tone]} size={15} />
      <div>{title ? <strong className="ui-callout-title">{title}</strong> : null}{children}</div>
    </div>
  );
}
