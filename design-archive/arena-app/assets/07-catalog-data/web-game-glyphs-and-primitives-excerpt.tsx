"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type ArenaCategory,
  type MatchSeed,
  arenas,
  arenaBySlug,
  providerBySlug,
} from "@/lib/platform-data";
import { providerColor } from "@/lib/provider-color";
import { publicProviderLogoUrl } from "@/lib/public-provider-logos";
import { Button, Icon, Tag, type IconName } from "@/components/ui";

export { Button, Icon, Tag };
export type { IconName };

const glyphs: Record<ArenaCategory | string, React.ReactNode> = {
  Board: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h16M4 14h16M9 4v16M14 4v16" /></>,
  Card: <><rect x="4" y="3" width="11" height="15" rx="2" /><path d="M9 7l2 3-2 3-2-3z" fill="currentColor" stroke="none" /><rect x="9" y="7" width="11" height="14" rx="2" opacity="0.5" /></>,
  Strategy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  RL: <><path d="M3 14c2 0 2-6 4-6s2 8 4 8 2-10 4-10 2 8 4 8" /><path d="M3 19h18" opacity="0.4" /></>,
  chess: <path d="M9 21h6M8 18h8l-1-3H9zM10 15l-.5-3M14 15l.5-3M9.5 12h5M12 4a2 2 0 0 1 1 3.7L13 9h-2l-1-1.3A2 2 0 0 1 12 4z" />,
  "tic-tac-toe": <><path d="M9 4v16M15 4v16M4 9h16M4 15h16" /><path d="M5.5 5.5l2.5 2.5M8 5.5L5.5 8" /><circle cx="18" cy="12" r="2" /></>,
  "connect-four": <><rect x="4" y="5" width="16" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1.6" /><circle cx="9" cy="15" r="1.6" /><circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none" /></>,
};

export function GameGlyph({ slug, category, size = 22 }: { slug: string; category: ArenaCategory; size?: number }) {
  const inner = glyphs[slug] ?? glyphs[category] ?? glyphs.Board;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}

export function ProviderDot({ provider, size = 16 }: { provider: string; size?: number }) {
  const name = providerBySlug[provider]?.name ?? provider;
  const logoUrl = publicProviderLogoUrl(provider);
  const color = providerColor(providerBySlug[provider]?.hue);
  const initials = name
    .replace(/[^A-Za-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`provdot ${logoUrl ? "provider-logo provider-logo-imgwrap" : ""}`}
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklch, ${color} 18%, transparent)`,
        color,
        fontSize: size * 0.46,
      }}
    >
      {logoUrl
        // eslint-disable-next-line @next/next/no-img-element -- Provider marks are tiny local assets and Next image optimization is globally disabled. // react-doctor-disable-next-line react-doctor/nextjs-no-img-element
        ? <img src={logoUrl} alt="" className="provider-logo-img" loading="lazy" decoding="async" />
        : initials}
    </span>
  );
}

export function ModelBadge({ id, size = 13, showFamily = false, family, dot = true }: { id: string; size?: number; showFamily?: boolean; family?: string; dot?: boolean }) {
  const [providerPart, slugPart] = id.split("/");
  const provider = providerPart ?? "unknown";
  const slug = slugPart ?? id;
  return (
    <span className="modelbadge" title={id}>
      {dot ? <ProviderDot provider={provider} size={size + 3} /> : null}
      <span className="mono modelname" style={{ fontSize: size }}>
        <span className="mb-prov">{provider}/</span>
        {slug}
      </span>
      {showFamily && family ? <span className="mb-fam">{family}</span> : null}
    </span>
  );
}

export function Terminal({
  title,
  lines,
  copyText,
}: {
  title: string;
  lines: readonly { id: string; content: React.ReactNode }[];
  copyText?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!copyText || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="terminal">
      <div className="term-bar">
        <span className="term-dots"><i /><i /><i /></span>
        <span className="term-title mono">{title}</span>
        {copyText ? <button className="term-copy" type="button" onClick={copy}><Icon name={copied ? "check" : "copy"} size={13} />{copied ? "Copied" : "Copy"}</button> : null}
      </div>
      <div className="term-body mono">
        {lines.map((line) => <div key={line.id} className="term-line">{line.content}</div>)}
      </div>
    </div>
  );
}

export function DifficultyTag({ level }: { level: string }) {
  const tone = level === "Beginner" ? "win" : level === "Advanced" ? "loss" : "draw";
  return <span className={`difftag difftag-${tone}`}>{level}</span>;
}

function StatusBadge({ status }: { status: MatchSeed["status"] }) {
  if (status === "live") return <span className="statusb statusb-live"><span className="livedot" />Live</span>;
  if (status === "scheduled") return <span className="statusb statusb-sched">Upcoming</span>;
  return <span className="statusb statusb-done">Completed</span>;
}

export function Medal({ rank }: { rank: number }) {
