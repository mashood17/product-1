from typing import Any

from app.repositories.base import client, unwrap_single

TABLE = "video_gallery"


def list_all() -> list[dict[str, Any]]:
    # Newest first — the public showcase and the admin list both want the
    # most recently uploaded video shown/listed first, with no separate
    # display_order column to maintain.
    res = client().table(TABLE).select("*").order("created_at", desc=True).execute()
    return res.data


def get(id: str) -> dict[str, Any] | None:
    res = client().table(TABLE).select("*").eq("id", id).limit(1).execute()
    return res.data[0] if res.data else None


def insert(fields: dict[str, Any]) -> dict[str, Any]:
    res = client().table(TABLE).insert(fields).execute()
    return unwrap_single(res.data, "Video not created")


def update(id: str, fields: dict[str, Any]) -> dict[str, Any]:
    res = client().table(TABLE).update(fields).eq("id", id).execute()
    return unwrap_single(res.data, "Video not found")


def delete(id: str) -> None:
    client().table(TABLE).delete().eq("id", id).execute()
