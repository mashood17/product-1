"""One-off: clear all rows from analytics_events so the admin dashboard's
"Recent Activity" / "Last 30 Days" widgets start clean (e.g. before handing
the site over to a client after internal/e2e testing generated noise events).

Only touches analytics_events — menu items, admins, settings, specials,
categories, and media/uploaded images are untouched; new events populate the
table normally as soon as real traffic starts hitting the tracked actions.

Usage: .venv/Scripts/python.exe scripts/reset_analytics.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.repositories.base import client

TABLE = "analytics_events"


def main() -> None:
    supabase = client()
    before = supabase.table(TABLE).select("id", count="exact").execute()
    total = before.count if before.count is not None else len(before.data)
    if total == 0:
        print("analytics_events is already empty — nothing to do.")
        return

    print(f"About to permanently delete {total} row(s) from '{TABLE}'.")
    confirm = input("Type 'yes' to continue: ").strip().lower()
    if confirm != "yes":
        print("Aborted — no rows deleted.")
        return

    # PostgREST requires a filter on delete; id is never null, so this matches every row.
    supabase.table(TABLE).delete().not_.is_("id", "null").execute()

    after = supabase.table(TABLE).select("id", count="exact").execute()
    remaining = after.count if after.count is not None else len(after.data)
    print(f"Done. {total} row(s) deleted, {remaining} remaining.")


if __name__ == "__main__":
    main()
