import { Fragment } from "react";
import fields from "./public-fields.json";
import type { DemonstrationFrame } from "./demos";

const gameFields: Readonly<Record<string, readonly string[]>> = fields;
const publicKeys = new Set(
  "P R B N L G S NS EW bids card cards cell count delivery distance energy face heading hit kind lane lanes level next_foot penalty phase player player_1 player_1_share player_2 player_3 player_4 price prize progress rank side speed strain target tile torso_angle trump velocity vx vy winner x x_max x_min y angle angular_velocity".split(" ")
);
function label(key: string) {
  return key.replace(/^player_([1-4])$/, "P$1").replaceAll("_"," ");
}
function describe(value: unknown): string {
  if (value === null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(describe).join(", ") : "None";
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).filter(([key]) => publicKeys.has(key))
    .map(([key,v]) => `${label(key)} ${describe(v)}`).join(" · ");
}

/** Only fields from the spectator contract are inspectable. Hosts provide redacted frames. */
export function PositionDetails({game,frame}:{game:string;frame:DemonstrationFrame}) {
  const keys = Object.hasOwn(gameFields,game) ? gameFields[game]! : [];
  return <details className="st-position-details"><summary>Inspect public position</summary>
    <dl>{keys.filter(key => Object.hasOwn(frame.state,key)).map(key => {
      const value = frame.state[key];
      const rows = Array.isArray(value) && value.every(Array.isArray) && ["board","grid","boards"].includes(key);
      const text = rows ? value.map((row,i) => `Row ${i+1}: ${describe(row)}`).join("\n") : describe(value);
      return <Fragment key={key}><dt>{label(key)}</dt><dd>{text || "None"}</dd></Fragment>;
    })}</dl>
  </details>;
}
