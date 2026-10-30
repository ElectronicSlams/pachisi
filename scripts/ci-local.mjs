// Local CI gate. Runs the same steps as .github/workflows/ci.yml on this machine
// and records dated evidence under docs/validation/ so a reviewer can see what was
// verified, on which commit, without hosted CI. Hosted Actions are unavailable while
// the organisation's GitHub billing is locked, so this script is the release gate.
//
//   pnpm ci:local                 full run (install, check, consumer, browser)
//   pnpm ci:local --skip-install  reuse node_modules
//   pnpm ci:local --skip-browser  everything except Playwright
//   pnpm ci:local --no-record     run but do not touch docs/validation or docs/captures
//
// Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to an existing Chromium binary to skip the
// Playwright download (useful offline or when the CDN is slow); the browser check
// honours the same variable and the evidence records which binary ran.
import { spawnSync, execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import os from "node:os";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = new Set(process.argv.slice(2));
const record = !args.has("--no-record");
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || null;

function version(cmd, flag = "--version") {
  try { return execFileSync(cmd, [flag], { encoding: "utf8" }).trim(); } catch { return "unavailable"; }
}
function git(...a) {
  try { return execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim(); } catch { return ""; }
}

const steps = [
  { name: "install", command: ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"], skip: args.has("--skip-install") },
  { name: "check", command: ["pnpm", "check"] },
  { name: "consumer", command: ["pnpm", "test:consumer"] },
  { name: "playwright-install", command: ["pnpm", "exec", "playwright", "install", "chromium"], skip: args.has("--skip-browser") || chromiumExecutable !== null },
  { name: "browser", command: ["pnpm", "test:browser"], skip: args.has("--skip-browser") },
];

const results = [];
let failed = false;
for (const step of steps) {
  if (step.skip) { results.push({ name: step.name, command: step.command.join(" "), status: "skipped" }); continue; }
  if (failed) { results.push({ name: step.name, command: step.command.join(" "), status: "not-run" }); continue; }
  const started = Date.now();
  process.stdout.write(`\n== ${step.name}: ${step.command.join(" ")}\n`);
  const run = spawnSync(step.command[0], step.command.slice(1), { cwd: root, stdio: "inherit", env: process.env });
  const exitCode = run.status ?? (run.error ? 1 : 0);
  results.push({ name: step.name, command: step.command.join(" "), status: exitCode === 0 ? "passed" : "failed", exitCode, durationMs: Date.now() - started });
  if (exitCode !== 0) failed = true;
}

const evidence = {
  ranOn: new Date().toISOString(),
  commit: git("rev-parse", "HEAD"),
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  workingTreeClean: git("status", "--porcelain") === "",
  host: { platform: `${os.platform()} ${os.release()} ${os.arch()}`, node: process.version, pnpm: version("pnpm"), python3: version("python3") },
  chromium: chromiumExecutable ? { executable: chromiumExecutable.replace(os.homedir(), "~"), source: "PLAYWRIGHT_CHROMIUM_EXECUTABLE" } : { executable: "playwright-managed", source: "playwright install chromium" },
  mirrors: ".github/workflows/ci.yml (library job)",
  steps: results,
  result: failed ? "failed" : "passed",
};

if (record) {
  await mkdir(join(root, "docs/validation"), { recursive: true });
  await writeFile(join(root, "docs/validation/local-ci.json"), JSON.stringify(evidence, null, 2) + "\n");
  // Copy the artefacts the hosted job would have uploaded, so the record stays with the docs.
  const copies = [
    ["artifacts/browser/report.json", "docs/validation/browser.json"],
    ["artifacts/consumer-result.json", "docs/validation/consumer.json"],
    ["artifacts/browser/catalogue-1440-light.png", "docs/captures/catalogue-desktop-light.png"],
    ["artifacts/browser/catalogue-390-dark.png", "docs/captures/catalogue-phone-dark.png"],
    ["artifacts/browser/game-390-dark.png", "docs/captures/game-phone-dark.png"],
    ["artifacts/browser/event-390-dark.png", "docs/captures/event-phone-dark.png"],
  ];
  for (const [from, to] of copies) {
    if (!existsSync(join(root, from))) continue;
    if (from.endsWith(".json")) {
      JSON.parse(await readFile(join(root, from), "utf8"));
    }
    await copyFile(join(root, from), join(root, to));
  }
}

console.log(`\nLocal CI ${evidence.result} on ${evidence.commit.slice(0, 7)}${evidence.workingTreeClean ? "" : " (working tree dirty)"}.`);
for (const step of results) console.log(`  ${step.name.padEnd(20)} ${step.status}${step.durationMs ? ` (${Math.round(step.durationMs / 1000)}s)` : ""}`);
if (record) console.log("Evidence written to docs/validation/local-ci.json.");
process.exit(failed ? 1 : 0);
