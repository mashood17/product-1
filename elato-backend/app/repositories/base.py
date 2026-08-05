"""Small shared helpers for repositories built on the Supabase Python client."""

import logging
from typing import Any

from postgrest.exceptions import APIError

from app.core.exceptions import AppError
from app.db import get_supabase

logger = logging.getLogger("elato.errors")


def client():
    return get_supabase()


def raise_for_postgrest(exc: APIError) -> None:
    """Repositories catch APIError and call this so a bad DB response
    becomes the app's standard error shape instead of a raw 500 traceback.

    The real Postgrest message (constraint/column/table names) is logged
    server-side only — clients get a generic message so DB schema details
    never leak over the API."""
    logger.error("Postgrest error: %s", exc.message or exc)
    raise AppError(code="database_error", message="A database error occurred.", status_code=502) from exc


def unwrap_single(rows: list[dict[str, Any]], not_found_message: str) -> dict[str, Any]:
    if not rows:
        from app.core.exceptions import NotFoundError

        raise NotFoundError(not_found_message)
    return rows[0]
