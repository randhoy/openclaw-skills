---
name: serper-search
description: "Zero-trust SERP search via Serper.dev (web/news/scholar). No shell. API key via env only."
user-invocable: true
metadata: {"openclaw": {"emoji": "🔎", "homepage": "https://serper.dev/", "primaryEnv": "SERPER_API_KEY", "requires": {"bins": ["python3"], "env": ["SERPER_API_KEY"]}}}
---

# Serper Search (SERP-only, Zero-Trust)

This skill performs **web/news/scholar search** using Serper.dev and returns a **safe, minimal** list of results.
It is **SERP-only**: it does not fetch pages or scrape content.

## Security contract

- Reads `SERPER_API_KEY` from environment only.
- Never prints/logs the API key.
- No shell execution (no curl/wget/ssh/sudo).
- Limits results to 1..5 by default (hard cap 10).
- Returns titles/links/snippets (+ date if available).

## Endpoints

- Web: https://google.serper.dev/search
- News: https://google.serper.dev/news
- Scholar: https://google.serper.dev/scholar

## Usage (exec)

Default contract (for OpenClaw and other agents):

- Stdout: single-line JSON object suitable for LLM consumption.
- Stderr: human-readable diagnostics only.
- Exit code: `0` on success, non-zero on error.

Examples (JSON output, recommended for tools):

```bash
python3 "{baseDir}/bin/serper_search.py" --type web --q "<query>" --num 5
python3 "{baseDir}/bin/serper_search.py" --type news --q "<query>" --num 5
python3 "{baseDir}/bin/serper_search.py" --type scholar --q "<query>" --num 5
```

Optional arguments:

- `--gl <CC>` — country, e.g. `US`, `UA`, `DE`
- `--hl <lang>` — language, e.g. `en`, `uk`, `de`
- `--tbs <str>` — time range, e.g. `qdr:d`, `qdr:w`
- `--timeout <sec>` — request timeout in seconds

For human-friendly inspection in a terminal, use Markdown output:

```bash
python3 "{baseDir}/bin/serper_search.py" --type web --q "<query>" --num 5 --format markdown
```

Raw Serper JSON (debug only):

```bash
python3 "{baseDir}/bin/serper_search.py" --type web --q "<query>" --num 5 --raw
```
