"""
ELATŌ Backend — FastAPI entrypoint.

Config, structured logging, request logging middleware, CORS, global error
handling, the JWT/DI auth pattern, and every app/api/v1 route are wired in.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

settings = get_settings()
configure_logging(settings.env)
logger = logging.getLogger("elato.startup")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.is_production and settings.jwt_secret == "dev-only-insecure-secret-change-me":
        raise RuntimeError("JWT_SECRET must be set to a real value in production — refusing to start.")
    if settings.is_production and settings.sync_cron_secret == "dev-only-cron-secret-change-me":
        raise RuntimeError("SYNC_CRON_SECRET must be set to a real value in production — refusing to start.")
    logger.info(f"ELATŌ API starting in '{settings.env}' mode.")
    yield


app = FastAPI(title="ELATŌ API", version="0.0.0", lifespan=lifespan)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # Dev convenience only: preview tooling assigns random localhost ports
    # when 5173/5174 are taken, so CORS_ALLOWED_ORIGINS alone is too static
    # for local work. Never active in production — origins there are fixed,
    # real domains and belong in CORS_ALLOWED_ORIGINS.
    allow_origin_regex=r"^http://localhost:\d+$" if not settings.is_production else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Outermost middleware (added last) — compresses every JSON response over
# 500 bytes when the client sends `Accept-Encoding: gzip` (every browser
# does by default), which is most of this API's list endpoints
# (menu-items/gallery/categories/etc). No effect on clients that don't
# advertise gzip support, and no change to response content either way.
app.add_middleware(GZipMiddleware, minimum_size=500)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
