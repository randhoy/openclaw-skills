#!/usr/bin/env python3
"""
Serper Search (OpenClaw skill)

Security:
- stdlib HTTPS POST (urllib). No shell.
- Reads SERPER_API_KEY from env only.
- Never prints secrets.
- Hard caps results to 10 (default 5).
- SERP-only: returns metadata; does not fetch pages.
"""

import argparse
import json
import os
import re
import sys
import textwrap
import urllib.error
import urllib.request


ENDPOINTS = {
    "web": "https://google.serper.dev/search",
    "news": "https://google.serper.dev/news",
    "scholar": "https://google.serper.dev/scholar",
}

MAX_QUERY_CHARS = 256
MAX_RESULTS = 10


def clamp(n: int, lo: int, hi: int) -> int:
    return lo if n < lo else hi if n > hi else n


def sanitize_query(q: str) -> str:
    q = q.strip()
    # Remove control chars to avoid terminal/log injection
    q = re.sub(r"[\x00-\x1F\x7F]", " ", q)
    q = re.sub(r"\s+", " ", q).strip()
    return q[:MAX_QUERY_CHARS]


def post_json(url: str, api_key: str, payload: dict, timeout: int) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url=url,
        data=body,
        method="POST",
        headers={
            "X-API-KEY": api_key,  # never log this
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "openclaw-skill/serper-search (stdlib)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        # Never echo headers (could include secrets). Only safe body/reason.
        try:
            err_body = e.read().decode("utf-8", errors="replace")
        except Exception:
            err_body = ""
        raise RuntimeError(f"HTTP {e.code}: {err_body or e.reason}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error: {e.reason}") from e
    except json.JSONDecodeError as e:
        raise RuntimeError("Bad JSON response from Serper") from e


def format_answer_box(data: dict) -> str:
    parts = []

    kg = data.get("knowledgeGraph")
    if isinstance(kg, dict):
        title = str(kg.get("title") or "").strip()
        desc = str(kg.get("description") or "").strip()
        website = str(kg.get("website") or "").strip()
        if title:
            parts.append(f"**{title}**")
        if desc:
            parts.append(desc)
        if website:
            parts.append(website)

    ab = data.get("answerBox")
    if isinstance(ab, dict):
        title = str(ab.get("title") or "").strip()
        ans = str(ab.get("answer") or ab.get("snippet") or "").strip()
        link = str(ab.get("link") or "").strip()
        if ans:
            if title:
                parts.append(f"**{title}**")
            parts.append(ans)
            if link:
                parts.append(link)

    # Keep compact (max 3 lines)
    return "\n".join(parts[:3]).strip() if parts else ""


def extract_results(data: dict, search_type: str) -> list:
    items = data.get("news") if search_type == "news" else data.get("organic")
    items = items or []
    if not isinstance(items, list):
        return []

    out = []
    for it in items:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title") or "").strip()
        link = str(it.get("link") or "").strip()
        snippet = str(it.get("snippet") or "").strip()
        date = str(it.get("date") or "").strip()
        if not (title or link):
            continue
        out.append({"title": title, "link": link, "snippet": snippet, "date": date})
    return out


def to_markdown(answer_box: str, results: list, limit: int) -> str:
    lines = []
    if answer_box:
        lines.append(answer_box)
        lines.append("")

    if not results:
        lines.append("_No results returned._")
        return "\n".join(lines).strip()

    for i, r in enumerate(results[:limit], start=1):
        title = r.get("title") or "Untitled"
        link = r.get("link") or ""
        snippet = r.get("snippet") or ""
        date = r.get("date") or ""

        head = f"{i}. {title}"
        if link:
            head += f" — {link}"
        lines.append(head)

        details = []
        if snippet:
            details.append(snippet)
        if date:
            details.append(f"Date: {date}")
        if details:
            lines.append(textwrap.indent("\n".join(details), "   "))
        lines.append("")
    return "\n".join(lines).strip()


def main() -> int:
    p = argparse.ArgumentParser(description="Serper SERP-only search (OpenClaw skill)")
    p.add_argument("--type", choices=["web", "news", "scholar"], default="web")
    p.add_argument("--q", required=True)
    p.add_argument("--num", type=int, default=5, help=f"1..{MAX_RESULTS} (hard capped)")
    p.add_argument("--gl", default="")
    p.add_argument("--hl", default="")
    p.add_argument("--tbs", default="")
    p.add_argument("--timeout", type=int, default=12, help="seconds")
    p.add_argument("--raw", action="store_true", help="Print raw Serper JSON (debug)")
    p.add_argument(
        "--format",
        choices=["json", "markdown"],
        default="json",
        help="Output format for stdout (default: json for OpenClaw tools; markdown is for humans)",
    )
    args = p.parse_args()

    api_key = os.environ.get("SERPER_API_KEY", "").strip()
    if not api_key:
        print("ERROR: SERPER_API_KEY is not set.", file=sys.stderr)
        return 2

    q = sanitize_query(args.q)
    if not q:
        print("ERROR: Empty query.", file=sys.stderr)
        return 2

    limit = clamp(args.num, 1, MAX_RESULTS)
    payload = {"q": q, "num": limit}
    if args.gl.strip():
        payload["gl"] = args.gl.strip()
    if args.hl.strip():
        payload["hl"] = args.hl.strip()
    if args.tbs.strip():
        payload["tbs"] = args.tbs.strip()

    try:
        data = post_json(ENDPOINTS[args.type], api_key, payload, timeout=args.timeout)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    if args.raw:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0

    answer_box = format_answer_box(data)
    results = extract_results(data, args.type)

    if args.format == "markdown":
        print(to_markdown(answer_box, results, limit))
        return 0

    # Default: machine-readable JSON payload for OpenClaw.
    out = {
        "query": q,
        "type": args.type,
        "limit": limit,
        "answer_box": answer_box,
        "results": results,
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
