import type { AnchorHTMLAttributes } from "react";
/** Browser default. Platform adapters own navigation and prefetch policy. */
export type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string; readonly prefetch?: boolean };
export function Anchor({ prefetch: _prefetch, ...props }: AnchorProps) { return <a {...props} />; }
