from typing import Any

from postgrest.exceptions import APIError

from app.core.exceptions import AppError
from app.repositories.base import client, unwrap_single

TABLE = "admins"

# Postgres foreign-key-violation SQLSTATE. Media/site-content/hero-background/
# offer-registration/video-gallery rows reference admins(id) with
# ON DELETE SET NULL (migrations/0015_admin_fk_delete_set_null.sql) so this
# shouldn't fire in normal operation — this is a defensive fallback for a
# project whose DB hasn't picked up that migration yet, not the primary fix.
_FOREIGN_KEY_VIOLATION = "23503"


def get_by_email(email: str) -> dict[str, Any] | None:
    res = client().table(TABLE).select("*").eq("email", email).limit(1).execute()
    return res.data[0] if res.data else None


def get_by_id(admin_id: str) -> dict[str, Any] | None:
    res = client().table(TABLE).select("*").eq("id", admin_id).limit(1).execute()
    return res.data[0] if res.data else None


def touch_last_login(admin_id: str) -> None:
    from datetime import datetime, timezone

    client().table(TABLE).update({"last_login_at": datetime.now(timezone.utc).isoformat()}).eq(
        "id", admin_id
    ).execute()


def create(email: str, password_hash: str, role: str) -> dict[str, Any]:
    res = client().table(TABLE).insert({"email": email, "password_hash": password_hash, "role": role}).execute()
    return unwrap_single(res.data, "Admin not created")


def update(admin_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    res = client().table(TABLE).update(fields).eq("id", admin_id).execute()
    return unwrap_single(res.data, "Admin not found")


def list_all() -> list[dict[str, Any]]:
    res = client().table(TABLE).select("id,email,role,created_at,last_login_at").order("created_at").execute()
    return res.data


def delete(admin_id: str) -> None:
    try:
        client().table(TABLE).delete().eq("id", admin_id).execute()
    except APIError as exc:
        if getattr(exc, "code", None) == _FOREIGN_KEY_VIOLATION:
            raise AppError(
                code="admin_has_related_records",
                message="This admin created content that still references them and can't be deleted yet.",
                status_code=409,
            ) from exc
        raise
