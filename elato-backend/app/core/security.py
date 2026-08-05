"""JWT issuance/verification and password hashing. Built once here, reused
by every auth-touching route — no route should parse a JWT inline."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_ph = PasswordHasher()
_JWT_ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    return _ph.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    # jti: without a random per-token claim, two tokens issued for the same
    # subject in the same second-resolution `exp` window encode to the exact
    # same JWT string. Harmless for access tokens on their own, but
    # create_refresh_token's version of this collided on refresh_tokens'
    # unique token_hash index in production (two near-simultaneous /refresh
    # calls -> identical token -> identical hash -> insert failed). Added
    # here too for consistency.
    payload = {
        "sub": subject,
        "type": "access",
        "exp": expire,
        "jti": secrets.token_urlsafe(16),
        **(extra_claims or {}),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    # jti guarantees uniqueness even when issued for the same subject within
    # the same exp-second — see create_access_token's comment for the
    # production incident this fixes (refresh_tokens_token_hash_key
    # duplicate-key errors from two near-simultaneous refresh calls).
    payload = {"sub": subject, "type": "refresh", "exp": expire, "jti": secrets.token_urlsafe(16)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=_JWT_ALGORITHM)


class TokenError(Exception):
    """Raised for any invalid/expired/wrong-type token — callers map this to 401."""


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc

    if payload.get("type") != expected_type:
        raise TokenError(f"expected a {expected_type} token")
    return payload
