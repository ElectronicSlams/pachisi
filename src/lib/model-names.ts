const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const bedrockSuffix = /\s+V\d+:\d+$/u;
const freeSuffix = /\s*\(free\)\s*$/iu;
const spacedDateSuffix = /\s+(20\d\d)\s+(0[1-9]|1[0-2])\s+([0-3]\d)$/u;
const compactDateSuffix = /\s+(20\d\d)(0[1-9]|1[0-2])([0-3]\d)$/u;
const latestSuffix = /\s+latest$/iu;
const spacedVersion = /\b(\d) (\d{1,2})\b(?!\s*[BbKkMm]\b)/gu;
const casing: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bDeepseek\b/gu, "DeepSeek"],
  [/\bGpt\b/gu, "GPT"],
  [/\bGPT (\d|o\d)/gu, "GPT-$1"],
  [/\b(\d+)b\b/gu, "$1B"],
  [/\bA(\d+)b\b/gu, "A$1B"],
];

/**
 * Formats a catalogue model name for people (brief §8.2): "GPT-4o (May 2024)",
 * not "GPT 4o 2024 05 13"; "Gemma 4 26B A4B", not "Gemma 4 26B A4B  (free)".
 * The raw id stays available separately; this is display only.
 */
export function formatModelDisplayName(name: string, providerName?: string | null): string {
  let value = name.replace(/\s+/gu, " ").trim().replace(freeSuffix, "").replace(bedrockSuffix, "");
  if (providerName) {
    const prefix = `${providerName} `;
    const rest = value.slice(prefix.length);
    // "Anthropic Claude Haiku" loses its vendor prefix; "DeepSeek V4 Pro" keeps its name.
    if (value.toLowerCase().startsWith(prefix.toLowerCase()) && /^[A-Za-z]{2,}/u.test(rest) && !/^V\d/u.test(rest)) {
      value = rest;
    }
  }
  const date = value.match(spacedDateSuffix) ?? value.match(compactDateSuffix);
  if (date) {
    const month = monthNames[Number(date[2]) - 1];
    value = `${value.slice(0, date.index).trim()} (${month} ${date[1]})`;
  }
  if (latestSuffix.test(value)) value = `${value.replace(latestSuffix, "")} (latest)`;
  value = value.replace(spacedVersion, "$1.$2");
  for (const [pattern, replacement] of casing) value = value.replace(pattern, replacement);
  return value;
}

/** Splits `provider/model` for the mono id row, where the provider prefix is dimmed. */
export function splitModelId(id: string): { readonly provider: string; readonly model: string } {
  const slash = id.indexOf("/");
  return slash < 0 ? { provider: "", model: id } : { provider: id.slice(0, slash), model: id.slice(slash + 1) };
}
