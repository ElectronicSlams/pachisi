import type { ModelIdentity } from "../lib/model-identity";
import { splitModelId } from "../lib/model-names";

/** A provider mark (white SVG asset, inverted in light theme) or mono initials. */
function ProviderMark({ identity, size = 16 }: { readonly identity: Pick<ModelIdentity, "providerName" | "markUrl">; readonly size?: number }) {
  if (identity.markUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Tiny local SVG marks; Next image optimization is globally disabled. // react-doctor-disable-next-line react-doctor/nextjs-no-img-element
      <img alt="" aria-hidden="true" className="st-mark" decoding="async" height={size} loading="lazy" src={identity.markUrl} width={size} />
    );
  }
  const initials = identity.providerName.replace(/[^A-Za-z0-9 ]/gu, " ").trim().split(/\s+/u).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return <span aria-hidden="true" className="st-mark st-mark-initials mono" style={{ width: size, height: size, fontSize: Math.max(8, size * 0.5) }}>{initials}</span>;
}

export type ModelChipProps = {
  readonly identity: ModelIdentity;
  /** "name": display name (default). "id": mono `provider/model` with the provider dimmed. "stacked": name over id. */
  readonly display?: "name" | "id" | "stacked";
  /** Completed matches: winner at weight 600, loser at 55% opacity. */
  readonly outcome?: "winner" | "loser" | null;
  readonly size?: "sm" | "md";
};

export function ModelChip({ identity, display = "name", outcome = null, size = "md" }: ModelChipProps) {
  const { provider, model } = splitModelId(identity.id);
  const markSize = size === "sm" ? 14 : 16;
  return (
    <span className={`st-model st-model-${size}`} data-outcome={outcome ?? undefined} title={identity.id}>
      <ProviderMark identity={identity} size={markSize} />
      {display === "id" ? (
        <span className="st-model-id mono">{provider ? <span className="st-dim">{provider}/</span> : null}{model}</span>
      ) : display === "stacked" ? (
        <span className="st-model-stack">
          <span className="st-model-name">{identity.name}</span>
          <span className="st-model-id mono">{provider ? <span className="st-dim">{provider}/</span> : null}{model}</span>
        </span>
      ) : (
        <span className="st-model-name">{identity.name}</span>
      )}
      {outcome === "winner" ? <span className="sr-only"> (winner)</span> : null}
    </span>
  );
}

/** Model A · vs · model B, the matchup pairing used by posters and headers. */
export function Matchup({ a, b, winner = null, display = "name", size = "md" }: {
  readonly a: ModelIdentity;
  readonly b: ModelIdentity;
  readonly winner?: "a" | "b" | "draw" | null;
  readonly display?: ModelChipProps["display"];
  readonly size?: ModelChipProps["size"];
}) {
  const decided = winner === "a" || winner === "b";
  return (
    <span className="st-matchup">
      <ModelChip display={display} identity={a} outcome={decided ? (winner === "a" ? "winner" : "loser") : null} size={size} />
      <span className="st-vs mono">vs</span>
      <ModelChip display={display} identity={b} outcome={decided ? (winner === "b" ? "winner" : "loser") : null} size={size} />
    </span>
  );
}
