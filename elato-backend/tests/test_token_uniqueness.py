"""Regression test for a production incident: two refresh tokens issued for
the same admin within the same second-resolution `exp` window used to encode
to the exact same JWT string (no jti), which collided on
refresh_tokens.token_hash's unique constraint and surfaced as an unhandled
500 on /refresh. app/core/security.py now includes a random `jti` claim so
same-second tokens are never identical."""

from app.core.security import create_access_token, create_refresh_token


def test_refresh_tokens_for_same_subject_are_unique_even_in_the_same_second():
    tokens = {create_refresh_token(subject="admin-1") for _ in range(20)}
    assert len(tokens) == 20


def test_access_tokens_for_same_subject_are_unique_even_in_the_same_second():
    tokens = {create_access_token(subject="admin-1", extra_claims={"role": "owner"}) for _ in range(20)}
    assert len(tokens) == 20
