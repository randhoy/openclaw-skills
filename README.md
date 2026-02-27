# serper-search (OpenClaw skill)

SERP-only search tool for OpenClaw using Serper.dev:

- web / news / scholar
- zero-trust friendly (no shell, no scraping)
- API key via env only

## Prerequisites

- Python 3.8+
- Outbound network access to the Serper API endpoint
- A valid `SERPER_API_KEY` for real queries

## Install to OpenClaw workspace

Recommended target:
`/home/username/.openclaw/workspace/skills/serper-search/`

> The exact OpenClaw workspace path can vary by machine/setup. If your workspace root differs, replace `/home/username/.openclaw/workspace/skills` with your local path.

Example:

```bash
cd /home/username/.openclaw/workspace/skills
git clone https://github.com/<OWNER>/serper-search.git
# then move/copy the nested skills folder contents:
cp -a serper-search/skills/serper-search .
```

Expected repository layout after clone:

```text
serper-search/
├── README.md
└── skills/
    └── serper-search/
        └── bin/
            └── serper_search.py
```

You can also clone into a temp folder and copy only `skills/serper-search`.

## Set secret (`SERPER_API_KEY`)

### Option A: systemd (recommended for systemd-managed OpenClaw)

Use a systemd drop-in for the OpenClaw service:

```ini
[Service]
Environment="SERPER_API_KEY=YOUR_KEY"
```

### Option B: shell environment (non-systemd)

```bash
export SERPER_API_KEY="YOUR_KEY"
```

Security note: do not commit real API keys to git, config files in this repo, or shared shell history.

## Output format

By default the skill prints a **single JSON object** to stdout, suitable for LLM/tool consumption:

```json
{
  "query": "OpenClaw",
  "type": "web",
  "limit": 3,
  "answer_box": "Optional short answer/summary if Serper provides one",
  "results": [
    {
      "title": "Result title",
      "link": "https://example.com",
      "snippet": "Short snippet from the SERP.",
      "date": "2024-01-01"
    }
  ]
}
```

- `stdout`: JSON payload as above (one object per invocation).
- `stderr`: human-readable diagnostics only (errors, warnings).
- Exit code: `0` on success, non-zero on error.

## Smoke tests

### Smoke test (no key)

```bash
env -u SERPER_API_KEY python3 skills/serper-search/bin/serper_search.py --type web --q "test"
```

Expected result: command exits non-zero and prints an error indicating that `SERPER_API_KEY` is missing.

### Smoke test (with key)

```bash
python3 skills/serper-search/bin/serper_search.py --type web --q "OpenClaw" --num 3
```

Expected result: command exits with code 0 and prints **JSON** with search results on stdout.

For a human-friendly preview in the terminal, you can request Markdown instead:

```bash
python3 skills/serper-search/bin/serper_search.py --type web --q "OpenClaw" --num 3 --format markdown
```

## License

MIT
