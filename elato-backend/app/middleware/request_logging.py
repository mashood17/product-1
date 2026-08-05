"""Assigns a request ID and logs method/path/status/timing for every request.

Raw ASGI middleware, not `BaseHTTPMiddleware` — see the comment atop
SecurityHeadersMiddleware for why: stacking `BaseHTTPMiddleware` subclasses
causes Starlette to re-raise exceptions that were already turned into clean
responses by our own handlers, and the response loses its CORS headers on
the way out. Wrapping `send` directly avoids that failure mode entirely."""

import logging
import time

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import log_request_timing, new_request_id

logger = logging.getLogger("elato.request")


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = new_request_id()
        start = time.perf_counter()
        status_code = 500

        async def send_with_logging(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
                duration_ms = (time.perf_counter() - start) * 1000
                log_request_timing(logger, scope["method"], scope["path"], status_code, duration_ms)
            await send(message)

        await self.app(scope, receive, send_with_logging)
