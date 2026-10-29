import type { ReactNode } from "react";

export function Tag({ children, tone = "plain" }: { readonly children: ReactNode; readonly tone?: "plain" | "accent" | "win" | "loss" | "draw" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
