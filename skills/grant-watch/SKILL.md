---
name: grant-watch
description: CLI skill to watch grant opportunities from one or more RSS/Atom feeds and filter them by configurable criteria.
---

# grant-watch (OpenClaw skill)

## Purpose

`grant-watch` is a Node.js-based CLI skill that fetches public grant/funding opportunities from RSS/Atom feeds and filters them according to a JSON configuration.

It is designed to be safe-by-default:
- uses **only public RSS/Atom URLs**,
- does **not** require or handle API keys or tokens,
- performs read-only HTTP requests and local filtering.

## Inputs

### 1. Config file (JSON)

The primary input is a JSON configuration file, referenced via the `--config` CLI flag.

Example:

```json
{
  "feeds": [
    "https://www.nasa.gov/rss/dyn/breaking_news.rss"
  ],
  "filters": {
    "keywords": ["NASA"],
    "min_amount": 10000,
    "max_deadline_days": 365
  }
}
```

Fields:

- `feeds` (array, required):
  - Non-empty array of RSS/Atom feed URLs.
- `filters` (object, optional):
  - `keywords` (array of strings, optional):
    - At least one keyword must appear (case-insensitive) in the title or description for an item to match.
  - `min_amount` (number, optional):
    - Reserved for future structured amount parsing (currently not enforced).
  - `max_deadline_days` (number, optional):
    - Naive deadline filter. When a structured deadline/date is available in the feed item, only grants with deadlines within this many days from "now" are retained.

### 2. CLI Arguments

The skill is exposed as a CLI command (typically via `npm link`):

```bash
grant-watch --config <path> [--output <path>] [--format json|markdown]
```

- `--config <path>` (required)
  - Path to the JSON configuration file.
- `--output <path>` (optional)
  - If provided, results are written to this file; otherwise they are printed to stdout.
- `--format <json|markdown>` (optional)
  - `json` (default): machine-readable summary.
  - `markdown`: human-friendly output suitable for direct reading or posting.

## Outputs

### JSON format (`--format json`)

`stdout` will contain a single JSON array of simplified grant objects, for example:

```json
[
  {
    "title": "Example grant title",
    "link": "https://example.org/grant/123",
    "description": "Short description of the grant.",
    "pubDate": "2026-02-27T16:46:41.000Z",
    "source": "https://example.org/grants.rss"
  }
]
```

- Suitable for consumption by other agents, tools, or pipelines.
- Exit code: `0` on success, non-zero on error.

### Markdown format (`--format markdown`)

`stdout` (or the file given by `--output`) will contain:

```markdown
# Grant Watch Results

## Example grant title
- **Link:** https://example.org/grant/123
- **Published:** 2026-02-27T16:46:41.000Z
- **Source feed:** https://example.org/grants.rss

Short description of the grant.
```

- Intended for direct reading by humans or inclusion in reports.

## Behavior & Logic

1. Load configuration from the JSON file.
2. For each URL in `feeds`:
   - Perform an HTTP GET (via `node-fetch`).
   - Parse the response using `rss-parser`.
   - Accept both RSS and Atom-style feeds when possible.
3. Normalize each item into a consistent internal structure (`title`, `link`, `description`, `pubDate`, `raw`, `source`).
4. Apply filters:
   - `keywords`: require at least one keyword in title/description.
   - `max_deadline_days`: when a structured deadline is available, discard items with deadlines beyond the threshold.
5. Emit the filtered list in the requested format (`json` or `markdown`).

## Security & Secrets

- `grant-watch` **does not** accept, read, or require any API keys or secrets.
- All inputs are public RSS/Atom URLs and local JSON configuration.
- No secrets should ever be stored in the config file, source code, or logs.
- Any future extension that introduces secrets MUST:
  - use environment variables or a secret store,
  - never hardcode secrets or tokens into this repository.

## Files & Layout

Within the `openclaw-skills` repository, this skill lives under:

```text
skills/
  grant-watch/
    package.json
    README.md
    SKILL.md
    src/
      cli.js
      config.js
      rss.js
      filter.js
      output.js
    tests/
      config.test.js
      filter.test.js
      output.test.js
```

## Usage in OpenClaw

- Intended to be invoked as a CLI from within automated workflows (cron, agents, or external orchestrators).
- Other agents can:
  - prepare `config.json`,
  - invoke `grant-watch` with `--format json`,
  - consume the JSON output as structured input for further decision-making (e.g., ranking, alerting).

