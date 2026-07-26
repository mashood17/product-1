from typing import Any

from postgrest.exceptions import APIError

from app.repositories.base import client, raise_for_postgrest, unwrap_single

TABLE = "gallery"


def list_public(category: str | None) -> list[dict[str, Any]]:
    query = client().table(TABLE).select("*, media(storage_path, bucket)")
    if category:
        query = query.eq("category", category)
    try:
        res = query.order("display_order").execute()
    except APIError as exc:
        raise_for_postgrest(exc)
    return res.data


def list_admin(limit: int, offset: int) -> tuple[list[dict[str, Any]], int]:
    res = (
        client()
        .table(TABLE)
        .select("*, media(storage_path, bucket)", count="exact")
        .order("display_order")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return res.data, res.count or 0


def get(item_id: str) -> dict[str, Any]:
    res = client().table(TABLE).select("*, media(storage_path, bucket)").eq("id", item_id).limit(1).execute()
    return unwrap_single(res.data, "Gallery item not found")


def create(fields: dict[str, Any]) -> dict[str, Any]:
    res = client().table(TABLE).insert(fields).execute()
    return unwrap_single(res.data, "Gallery item not created")


def update(item_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    res = client().table(TABLE).update(fields).eq("id", item_id).execute()
    return unwrap_single(res.data, "Gallery item not found")


def delete(item_id: str) -> None:
    client().table(TABLE).delete().eq("id", item_id).execute()


def count_all() -> int:
    res = client().table(TABLE).select("id", count="exact").execute()
    return res.count or 0


def count_by_category(category: str) -> int:
    res = client().table(TABLE).select("id", count="exact").eq("category", category).execute()
    return res.count or 0
