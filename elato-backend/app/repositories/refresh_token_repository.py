"""
Refresh-token store, backed by the `refresh_tokens` table (migration 0002).
Tokens are stored hashed (SHA-256) — never in plaintext — so a DB read alone
can't be replayed as a live session. Rotation-on-use + revocation are what
make "log out everywhere" possible.
"""

import hashlib
from datetime import datetime, timezone
from typing import Any

from app.repositories.base import client

TABLE = "refresh_tokens"


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def store(admin_id: str, token: str, expires_at: datetime) -> None:
    client().table(TABLE).insert(
        {
            "admin_id": admin_id,
            "token_hash": _hash(token),
            "expires_at": expires_at.isoformat(),
        }
    ).execute()


def find_valid(token: str) -> dict[str, Any] | None:
    res = (
        client()
        .table(TABLE)
        .select("*")
        .eq("token_hash", _hash(token))
        .is_("revoked_at", "null")
        .gt("expires_at", datetime.now(timezone.utc).isoformat())
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def revoke(token: str) -> None:
    client().table(TABLE).update({"revoked_at": datetime.now(timezone.utc).isoformat()}).eq(
        "token_hash", _hash(token)
    ).execute()


def revoke_for_admin(admin_id: str, token: str) -> None:
    """Like `revoke`, but scoped to `admin_id` — a caller can only revoke their own token."""
    client().table(TABLE).update({"revoked_at": datetime.now(timezone.utc).isoformat()}).eq(
        "token_hash", _hash(token)
    ).eq("admin_id", admin_id).execute()


def revoke_all_for_admin(admin_id: str) -> None:
    client().table(TABLE).update({"revoked_at": datetime.now(timezone.utc).isoformat()}).eq(
        "admin_id", admin_id
    ).is_("revoked_at", "null").execute()
