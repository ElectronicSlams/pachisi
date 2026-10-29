import type { HTMLAttributes, ReactNode } from "react";
export function SectionHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return <div className="sechead"><div>{eyebrow ? <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div> : null}<h2 className="sechead-title">{title}</h2>{sub ? <p className="sechead-sub">{sub}</p> : null}</div>{action ? <div className="sechead-action">{action}</div> : null}</div>;
}
export function Card({ hover = false, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { readonly hover?: boolean }) {
  return <div className={`card${hover ? " card-hover" : ""} ${className}`.trim()} {...props} />;
}
