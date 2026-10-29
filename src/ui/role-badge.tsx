import type { HTMLAttributes } from "react";
import { Icon } from "../ui/icon";

export type RoleBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly roleName: string | null | undefined;
  readonly fallback?: string;
};

const privilegedRoles = new Set(["owner", "super_admin", "admin"]);

export function RoleBadge({ roleName, fallback = "No access", className = "", ...props }: RoleBadgeProps) {
  const normalized = roleName?.trim().toLowerCase() ?? "";
  const label = normalized ? normalized.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()) : fallback;
  const tone = privilegedRoles.has(normalized) ? "accent" : normalized ? "plain" : "loss";
  return (
    <span {...props} className={`tag tag-${tone} ui-role-badge ${className}`.trim()}>
      <Icon name="lock" size={12} /> {label}
    </span>
  );
}
