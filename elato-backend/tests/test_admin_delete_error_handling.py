"""Regression tests for the admin-delete 500/CORS bug.

Two independent things were broken and are pinned down here:
1. Deleting an admin who has related records (media.uploaded_by etc.) used to
   raise a raw Postgres foreign-key-violation as an unhandled 500 instead of
   a clean error — app/repositories/admin_repository.py now catches it.
2. ANY unhandled exception used to produce a 500 response missing CORS
   headers, because `@app.exception_handler(Exception)` is special-cased by
   Starlette onto ServerErrorMiddleware, which sits outside CORSMiddleware.
   app/core/exceptions.py's UnhandledExceptionMiddleware fixes this — this
   test would fail (no access-control-allow-origin header) without it.
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.core.dependencies import CurrentAdmin, get_current_admin
from app.main import app

ALLOWED_ORIGIN = "http://localhost:5174"


def _client_as(role: str) -> TestClient:
    app.dependency_overrides[get_current_admin] = lambda: CurrentAdmin(id="owner-id", role=role)
    return TestClient(app, raise_server_exceptions=False)


def teardown_function():
    app.dependency_overrides.clear()


def test_owner_cannot_delete_self():
    client = _client_as("owner")
    resp = client.delete("/api/v1/admin/users/owner-id", headers={"Origin": ALLOWED_ORIGIN})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "cannot_delete_self"
    assert resp.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


def test_delete_with_foreign_key_violation_returns_clean_409_not_500():
    """Patches the Supabase client itself (not admin_repository.delete) so the
    repository's own try/except around .execute() actually runs — patching
    delete() directly would replace that error handling entirely and prove
    nothing."""
    client = _client_as("owner")

    fk_error = APIError(
        {
            "message": 'update or delete on table "admins" violates foreign key '
            'constraint "media_uploaded_by_fkey" on table "media"',
            "code": "23503",
            "details": None,
            "hint": None,
        }
    )

    mock_query = MagicMock()
    mock_query.table.return_value.delete.return_value.eq.return_value.execute.side_effect = fk_error

    with patch("app.repositories.admin_repository.client", return_value=mock_query):
        resp = client.delete(
            "/api/v1/admin/users/11111111-1111-1111-1111-111111111111",
            headers={"Origin": ALLOWED_ORIGIN},
        )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "admin_has_related_records"
    assert resp.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


def test_unexpected_exception_still_returns_cors_headers():
    """The general case: any bare (non-AppError) exception must still come
    back through CORSMiddleware, not just the foreign-key-violation path."""
    client = _client_as("owner")

    with patch("app.repositories.admin_repository.delete", side_effect=RuntimeError("boom")):
        resp = client.delete(
            "/api/v1/admin/users/11111111-1111-1111-1111-111111111111",
            headers={"Origin": ALLOWED_ORIGIN},
        )

    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "internal_error"
    assert resp.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN
    assert "x-request-id" in resp.headers


def test_non_owner_cannot_delete_admin():
    client = _client_as("admin")
    resp = client.delete(
        "/api/v1/admin/users/11111111-1111-1111-1111-111111111111",
        headers={"Origin": ALLOWED_ORIGIN},
    )
    assert resp.status_code == 403
