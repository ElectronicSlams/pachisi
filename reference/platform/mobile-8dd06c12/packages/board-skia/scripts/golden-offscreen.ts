import { fileURLToPath } from "node:url";
import { OFFSCREEN_GOLDEN_CASES } from "../src/golden/offscreen-cases";
import { runOffscreenGoldens } from "../src/golden/offscreen";

const referenceRoot = fileURLToPath(new URL("../goldens/offscreen", import.meta.url));
const failureRoot = fileURLToPath(new URL("../artifacts/golden-failures", import.meta.url));
const argumentsList = process.argv.slice(2);
const update = argumentsList.includes("--update");
const unknown = argumentsList.filter((argument, index) => {
  if (argument === "--update" || argument === "--compare") return false;
  if (argument === "--approval-reason") return false;
  if (index > 0 && argumentsList[index - 1] === "--approval-reason") return false;
  return true;
});
if (unknown.length > 0 || (update && argumentsList.includes("--compare"))) {
  throw new TypeError(`Unsupported golden CLI arguments: ${unknown.join(", ") || "conflicting mode flags"}.`);
}
const reasonIndex = argumentsList.indexOf("--approval-reason");
const approvalReason = reasonIndex === -1 ? undefined : argumentsList[reasonIndex + 1];
const result = await runOffscreenGoldens({
  mode: update ? "update" : "compare",
  cases: OFFSCREEN_GOLDEN_CASES,
  referenceRoot,
  failureRoot,
  ...(approvalReason === undefined ? {} : { approvalReason }),
});

const summary = [
  `mode=${result.mode}`,
  `cases=${OFFSCREEN_GOLDEN_CASES.length}`,
  `compared=${result.compared}`,
  `exact=${result.exactMatches}`,
  `tolerated=${result.toleratedMatches}`,
  `updated=${result.updated}`,
  `failures=${result.failures.length}`,
].join(" ");
process.stdout.write(`${summary}\n`);
for (const failure of result.failures) {
  process.stderr.write(`${failure.id}: ${failure.reason}\n`);
}
if (result.failures.length > 0) {
  process.stderr.write(`Failure artifacts: ${failureRoot}\n`);
  process.exitCode = 1;
}
