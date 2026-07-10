#!/usr/bin/env node
/**
 * CLI wrapper around scripts/lib/fact-registry.mjs, so factforge-fact-audit
 * can look up and append registry entries via Bash the same way every other
 * skill talks to manifest_cli.mjs/validate.mjs, instead of ad hoc node -e.
 */
import { parseArgs, printJson, CliError } from "./lib/fs-utils.mjs";
import { lookupClaim, appendVerification } from "./lib/fact-registry.mjs";

async function cmdLookup(args) {
  const { claim } = args;
  if (!claim) throw new CliError("--claim is required", "UNKNOWN_ERROR");
  const entry = await lookupClaim(claim);
  return { claim, found: entry !== null, registry_hit: entry ? entry.registryHit : false, entry };
}

async function cmdAppend(args) {
  const { claim, category, verdict, "project-id": projectId, notes, sources } = args;
  if (!claim || !category || !verdict || !projectId) {
    throw new CliError("--claim, --category, --verdict, --project-id are required", "UNKNOWN_ERROR");
  }
  let parsedSources = [];
  if (sources) {
    try {
      parsedSources = JSON.parse(sources);
    } catch {
      throw new CliError(
        `--sources must be a JSON array string, e.g. '[{"url":"...","publisher":"...","accessed_date":"..."}]'`,
        "UNKNOWN_ERROR"
      );
    }
  }
  const entry = await appendVerification(claim, {
    category,
    verdict,
    sources: parsedSources,
    verifiedByProject: projectId,
    notes: notes || "",
  });
  return { claim, appended: entry };
}

const SUBCOMMANDS = { lookup: cmdLookup, append: cmdAppend };

function printUsage() {
  console.log(
    [
      "Usage: node scripts/fact_registry_cli.mjs <lookup|append> [--flag value ...]",
      "",
      "  lookup --claim \"<exact claim text>\"",
      "  append --claim \"<exact claim text>\" --category <health|psychological|scientific|statistical|named|other>",
      "         --verdict <verified|disputed|outdated> --project-id <id> [--sources '<json array>'] [--notes \"...\"]",
    ].join("\n")
  );
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  const handler = SUBCOMMANDS[subcommand];
  if (!handler) {
    printUsage();
    process.exitCode = subcommand ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  try {
    const result = await handler(args);
    printJson({ ok: true, ...result });
  } catch (err) {
    printJson({ ok: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
