"""Pings Supabase with a trivial read so the project registers activity and
doesn't get auto-paused by Supabase's free-tier inactivity policy (7 days).
Meant to be run on a schedule (see .github/workflows/keepalive.yml), not as
part of the app itself — hitting the Railway backend's own /health wouldn't
help here, since that never touches Supabase.

Usage: .venv/Scripts/python.exe scripts/keepalive.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import get_supabase


def main() -> None:
    # `settings` is the smallest always-present table (see
    # migrations/0001_initial_schema.sql) — a single-row select is enough to
    # count as activity without touching real data.
    result = get_supabase().table("settings").select("key").limit(1).execute()
    print(f"Keepalive ping ok — {len(result.data)} row(s) read.")


if __name__ == "__main__":
    main()
