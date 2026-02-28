# grant-watch

CLI tool to watch grant opportunities from RSS feeds and filter them by criteria.

## Installation (local dev)

```bash
npm install
npm link
```

This will install dependencies and link the `grant-watch` CLI into your PATH.

## Usage

```bash
grant-watch --config ./config.json --format json
grant-watch --config ./config.json --format markdown --output grants.md
```

### Options

- `--config <path>` (required)  
  Path to JSON configuration file.

- `--output <path>` (optional)  
  If provided, results are written to the given file. Otherwise they are printed to stdout.

- `--format <json|markdown>` (optional)  
  Output format:
  - `json`: machine-readable output for other agents/tools.
  - `markdown`: human-friendly markdown summary.

## Config file format

Example:

```json
{
  "feeds": [
    "https://example.org/grants.rss",
    "https://another.org/funding.rss"
  ],
  "filters": {
    "keywords": ["AI", "Europe", "startup"],
    "min_amount": 10000,
    "max_deadline_days": 60
  }
}
```

- `feeds` — non-empty array of RSS feed URLs.
- `filters.keywords` — array of strings; at least one of them must be present in the title or description.
- `filters.min_amount` — reserved for future structured amount parsing (currently not enforced).
- `filters.max_deadline_days` — naive deadline filter; if a structured date is present in the RSS item, only grants with deadlines within this many days are included.

## Notes

- No secrets or API keys are used. All data comes from public RSS feeds.
- Deadline/amount extraction is intentionally conservative and can be improved later once specific feeds are known.
