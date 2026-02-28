#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadConfig } from './config.js';
import { fetchAndParseFeeds } from './rss.js';
import { filterGrants } from './filter.js';
import { formatResults } from './output.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
  console.log(`
grant-watch - Watch grant RSS feeds and filter opportunities.

Usage:
  grant-watch --config <path> [--output <path>] [--format json|markdown]

Options:
  --config <path>     Path to JSON config file (required).
  --output <path>     Optional output file; if omitted, prints to stdout.
  --format <fmt>      Output format: "json" (default) or "markdown".
  --help              Show this help.
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    configPath: null,
    outputPath: null,
    format: 'json'
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      result.help = true;
    } else if (a === '--config') {
      result.configPath = args[++i];
    } else if (a === '--output') {
      result.outputPath = args[++i];
    } else if (a === '--format') {
      result.format = args[++i];
    } else {
      console.error(`Unknown argument: ${a}`);
      result.invalid = true;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || args.invalid || !args.configPath) {
    printHelp();
    process.exit(args.invalid || !args.configPath ? 1 : 0);
  }

  if (!['json', 'markdown'].includes(args.format)) {
    console.error(`Invalid --format: ${args.format}. Use "json" or "markdown".`);
    process.exit(1);
  }

  try {
    const config = loadConfig(args.configPath);
    const items = await fetchAndParseFeeds(config.feeds);
    const filtered = filterGrants(items, config.filters || {});
    const output = formatResults(filtered, {
      format: args.format
    });

    if (args.outputPath) {
      fs.writeFileSync(args.outputPath, output, 'utf8');
    } else {
      console.log(output);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${__filename}`) {
  main();
}
