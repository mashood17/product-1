"""
Admin auth: login, refresh rotation, logout (incl. "everywhere"), and
password reset. Password-reset emails are sent via Supabase Auth's built-in
email delivery (project decision — see README "Password reset" section):
it needs no new provider account or DNS/domain setup, which matters since
elatogroups.in isn't purchased yet. If/when transactional volume or template
control outgrows it, swap for Resend without touching callers — this is the
only place that sends the email.
"""

import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.db import get_supabase
from app.repositories import admin_repository, password_reset_repository, refresh_token_repository

_REFRESH_TOKEN_DAYS = 7
_RESET_TOKEN_MINUTES = 30


def _issue_pair(admin: dict) -> tuple[str, str]:
    access = create_access_token(subject=admin["id"], extra_claims={"role": admin["role"]})
    refresh = create_refresh_token(subject=admin["id"])
    refresh_token_repository.store(
        admin["id"], refresh, datetime.now(timezone.utc) + timedelta(days=_REFRESH_TOKEN_DAYS)
    )
    return access, refresh


def login(email: str, password: str) -> tuple[dict, str, str]:
    admin = admin_repository.get_by_email(email)
    if not admin or not verify_password(password, admin["password_hash"]):
        raise UnauthorizedError("Invalid email or password.")
    admin_repository.touch_last_login(admin["id"])
    access, refresh = _issue_pair(admin)
    return admin, access, refresh


def refresh(refresh_token: str) -> tuple[str, str]:
    from app.core.security import TokenError

    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise UnauthorizedError("Invalid or expired refresh token.") from exc

    stored = refresh_token_repository.find_valid(refresh_token)
    if not stored:
        raise UnauthorizedError("Refresh token has been revoked or reused.")

    admin = admin_repository.get_by_id(payload["sub"])
    if not admin:
        raise UnauthorizedError("Admin account no longer exists.")

    # Rotation: the token just used is revoked and a brand new pair is issued.
    # A revoked token being presented again means it was replayed/stolen.
    refresh_token_repository.revoke(refresh_token)
    access, new_refresh = _issue_pair(admin)
    return access, new_refresh


def logout(refresh_token: str | None, admin_id: str, everywhere: bool) -> None:
    if everywhere:
        refresh_token_repository.revoke_all_for_admin(admin_id)
    elif refresh_token:
        refresh_token_repository.revoke_for_admin(admin_id, refresh_token)


def request_password_reset(email: str) -> None:
    admin = admin_repository.get_by_email(email)
    if not admin:
        # Deliberately silent — do not reveal whether an email is registered.
        return

    token = secrets.token_urlsafe(32)
    password_reset_repository.store(
        admin["id"], token, datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_MINUTES)
    )
    settings = get_settings()
    reset_link = f"{settings.frontend_admin_url}/reset-password?token={token}"

    supabase = get_supabase()
    # Supabase's admin email API sends a password-recovery style email; the
    # link embedded points at our own admin panel route, not Supabase's.
    supabase.auth.admin.generate_link(
        {
            "type": "recovery",
            "email": email,
            "options": {"redirect_to": reset_link},
        }
    )


def change_password(admin_id: str, current_password: str, new_password: str) -> None:
    admin = admin_repository.get_by_id(admin_id)
    if not admin or not verify_password(current_password, admin["password_hash"]):
        raise UnauthorizedError("Current password is incorrect.")

    admin_repository.update(admin_id, {"password_hash": hash_password(new_password)})
    refresh_token_repository.revoke_all_for_admin(admin_id)


def confirm_password_reset(token: str, new_password: str) -> None:
    stored = password_reset_repository.find_valid(token)
    if not stored:
        raise UnauthorizedError("Invalid or expired reset token.")

    admin_repository.update(stored["admin_id"], {"password_hash": hash_password(new_password)})
    password_reset_repository.mark_used(token)
    refresh_token_repository.revoke_all_for_admin(stored["admin_id"])
