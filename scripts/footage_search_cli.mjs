#!/usr/bin/env node
/**
 * Mechanical footage search: calls the free-tier provider APIs, normalizes
 * results, and applies the two hard filters (minimum duration, minimum
 * resolution) - a candidate failing either is excluded outright, never
 * down-weighted. factforge-footage-retrieval calls this per scene, then
 * applies judgment (which surviving candidate is actually the right one,
 * and why) on top - that reasoning never lives here.
 */
import { parseArgs, printJson, CliError } from "./lib/fs-utils.mjs";
import { searchPexels, searchPixabay, searchCoverr } from "./lib/footage_apis.mjs";

const SEARCHERS = { pexels: searchPexels, pixabay: searchPixabay, coverr: searchCoverr };
const DEFAULT_PROVIDERS = ["pexels", "pixabay", "coverr"];

async function cmdSearch(args) {
  const { query } = args;
  if (!query) throw new CliError("--query is required", "UNKNOWN_ERROR");

  const minDurationSec = args["min-duration-sec"] ? Number(args["min-duration-sec"]) : 0;
  const minHeight = args["min-height"] ? Number(args["min-height"]) : 1080;
  const providers = args.providers
    ? String(args.providers)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : DEFAULT_PROVIDERS;

  const providerResults = {};
  const allCandidates = [];
  for (const name of providers) {
    const searcher = SEARCHERS[name];
    if (!searcher) continue;
    const result = await searcher(query);
    providerResults[name] = {
      available: result.available,
      error: result.error || null,
      candidate_count: result.candidates.length,
    };
    allCandidates.push(...result.candidates);
  }

  const passesFilters = (c) =>
    c.selected_url &&
    c.native_duration_sec != null &&
    c.native_duration_sec >= minDurationSec &&
    c.native_resolution &&
    c.native_resolution.height >= minHeight;

  const candidates = allCandidates.filter(passesFilters);
  const filteredOut = allCandidates.length - candidates.length;

  return {
    query,
    min_duration_sec: minDurationSec,
    min_height: minHeight,
    providers: providerResults,
    candidates,
    total_candidates: allCandidates.length,
    filtered_out: filteredOut,
  };
}

const SUBCOMMANDS = { search: cmdSearch };

function printUsage() {
  console.log(
    [
      "Usage: node scripts/footage_search_cli.mjs search --query \"...\" [--min-duration-sec N] [--min-height N] [--providers pexels,pixabay,coverr]",
      "",
      "Returns only candidates passing BOTH the duration and resolution hard filters.",
      "An empty candidates[] means: route this scene to fallback_to_ai_visual.",
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
