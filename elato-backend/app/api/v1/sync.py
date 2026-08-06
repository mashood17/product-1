"""
Scheduled sync endpoint for the Google Reviews cache (Section 9 — "a simple
cron-triggered endpoint... is sufficient at this scale"). Trigger via
Railway's cron schedule feature hitting this with the shared secret header;
not exposed to admins or the public.
"""

import secrets

from fastapi import APIRouter, Depends, Header

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.middleware.rate_limit import rate_limit
from app.services import reviews_service

router = APIRouter(prefix="/sync", tags=["sync"])


def _check_cron_secret(x_cron_secret: str | None) -> None:
    settings = get_settings()
    if not x_cron_secret or not secrets.compare_digest(x_cron_secret, settings.sync_cron_secret):
        raise UnauthorizedError("Invalid or missing cron secret.")


@router.post(
    "/reviews",
    status_code=200,
    dependencies=[Depends(rate_limit("sync-reviews", max_requests=10, window_seconds=60))],
)
async def sync_reviews(x_cron_secret: str | None = Header(default=None)):
    _check_cron_secret(x_cron_secret)
    count = await reviews_service.sync_google_reviews()
    return {"synced": count}
