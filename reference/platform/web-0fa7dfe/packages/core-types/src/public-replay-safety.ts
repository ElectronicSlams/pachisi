export const PUBLIC_REPLAY_FORBIDDEN_KEY_PATTERN =
  /private|secret|hidden|prompt|response|provider[_-]?log|provider[_-]?receipt|api[_-]?key|(auth|access|refresh|session|upload|runner|firebase)[_-]?token|credential|judge|auditor|receipt|raw[_-]?(output|action|prompt|response)|request[_-]?id|phone|firebase|installation|attestation|provenance|ciphertext|hmac/iu;

export const PUBLIC_REPLAY_BILLING_FORBIDDEN_KEY_PATTERN =
  /usage|input[_-]?tokens|output[_-]?tokens|cached[_-]?input[_-]?tokens|reasoning[_-]?tokens|total[_-]?tokens|cost|cost[_-]?usd|estimated[_-]?cost|amount[_-]?usd|billing/iu;

export const PUBLIC_REPLAY_FORBIDDEN_VALUE_PATTERN =
  /(sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{16,}|AQ\.[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|1\/\/[0-9A-Za-z._-]{16,}|cfut_[0-9A-Za-z_-]{16,}|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret|credential|hidden[_ -]?seed|private[_ -]?prompt)\s*[:=]\s*[^\s,;]{6,})/iu;

export type PublicReplaySafetyIssue = {
  readonly path: string;
  readonly key: string;
};

export type PublicReplaySafetyOptions = {
  readonly allowBillingFields?: boolean;
};

export function isForbiddenPublicReplayKey(key: string, options: PublicReplaySafetyOptions = {}): boolean {
  if (PUBLIC_REPLAY_FORBIDDEN_KEY_PATTERN.test(key)) {
    return true;
  }
  return options.allowBillingFields !== true && PUBLIC_REPLAY_BILLING_FORBIDDEN_KEY_PATTERN.test(key);
}

export function collectPublicReplaySafetyIssues(
  value: unknown,
  path = "$",
  options: PublicReplaySafetyOptions = {}
): PublicReplaySafetyIssue[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectPublicReplaySafetyIssues(entry, `${path}[${index}]`, options));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const current = `${path}.${key}`;
    const issue = isForbiddenPublicReplayKey(key, options) ? [{ path: current, key }] : [];
    return [...issue, ...collectPublicReplaySafetyIssues(entry, current, options)];
  });
}

export function publicReplayValueContainsForbiddenText(value: unknown): boolean {
  if (typeof value === "string") {
    return PUBLIC_REPLAY_FORBIDDEN_VALUE_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(publicReplayValueContainsForbiddenText);
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).some(publicReplayValueContainsForbiddenText);
}

export function assertPublicReplaySafe(value: unknown, path = "$", options: PublicReplaySafetyOptions = {}): void {
  const [issue] = collectPublicReplaySafetyIssues(value, path, options);
  if (issue) {
    throw new Error(`Replay event contains non-public field at ${issue.path}`);
  }
  if (publicReplayValueContainsForbiddenText(value)) {
    throw new Error(`Replay event contains secret-like text at ${path}`);
  }
}

export function parsePublicReplayJsonl(
  text: string,
  label = "public replay events",
  options: PublicReplaySafetyOptions = {}
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid JSON";
      throw new Error(`${label} line ${index + 1} cannot be parsed: ${message}`);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${label} line ${index + 1} must be a JSON object`);
    }
    assertPublicReplaySafe(parsed, `$[${index}]`, options);
    rows.push(parsed as Record<string, unknown>);
  }
  return rows;
}

export function assertPublicReplayJsonlSafe(
  text: string,
  label = "public replay events",
  options: PublicReplaySafetyOptions = {}
): void {
  parsePublicReplayJsonl(text, label, options);
}
