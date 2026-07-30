from datetime import datetime, timezone
from typing import Any

from app.repositories.base import client

TABLE = "hero_backgrounds"


def get_by_slot(slot: str) -> dict[str, Any] | None:
    res = client().table(TABLE).select("*").eq("slot", slot).limit(1).execute()
    return res.data[0] if res.data else None


def list_all() -> list[dict[str, Any]]:
    res = client().table(TABLE).select("*").order("slot").execute()
    return res.data


def upsert(slot: str, fields: dict[str, Any]) -> dict[str, Any]:
    """Update the row for `slot` if one exists, else insert a new one.

    Deliberately not a real `INSERT ... ON CONFLICT DO UPDATE` (Postgres's
    `.upsert()`): that statement validates NOT NULL constraints against the
    *insert candidate* row before it ever checks for a conflict, so a caller
    that only supplies a few columns (e.g. `upload_hero_poster`, which never
    touches the video_* columns) would fail with a NOT NULL violation on an
    update that should have left those columns untouched. Two round-trips
    here avoids that entirely: an UPDATE only ever touches the columns it's
    given, no matter what else is NOT NULL on the row.
    """
    payload = {**fields, "updated_at": datetime.now(timezone.utc).isoformat()}
    res = client().table(TABLE).update(payload).eq("slot", slot).execute()
    if res.data:
        return res.data[0]
    res = client().table(TABLE).insert({**payload, "slot": slot}).execute()
    return res.data[0]


def delete(slot: str) -> None:
    client().table(TABLE).delete().eq("slot", slot).execute()
