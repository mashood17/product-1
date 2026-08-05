"""
Baseline security response headers, applied to every response. This is a
pure JSON API (no HTML rendered here — the frontends are separate SPAs), so
the policy is deliberately narrow: block MIME-sniffing, block framing, and
stop the browser sending a Referer to third parties.

Implemented as a raw ASGI middleware (not `BaseHTTPMiddleware`) on purpose:
stacking two or more `BaseHTTPMiddleware` subclasses (this one plus
RequestLoggingMiddleware) makes Starlette re-raise an already-handled
exception through `call_next()` even after our own exception handlers
already converted it into a clean response — the response never reaches
CORSMiddleware, and the error result ships with no
Access-Control-Allow-Origin header, which the browser reports as a CORS
failure on top of the real error. Wrapping `send` directly (as done here)
runs outside that task-group machinery entirely, so error responses keep
their headers regardless of where they come from.
"""

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                # Railway serves this API over HTTPS only — HSTS tells browsers to
                # never attempt a plain-HTTP request to this host again, closing off
                # protocol-downgrade attacks. Safe to add unconditionally since there
                # is no HTTP fallback to break.
                headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
                # This origin is a JSON API with no browser-facing UI of its own, so
                # it never needs any of these browser features — denying them all is
                # pure defense-in-depth with no behavioral effect on legitimate use.
                headers["Permissions-Policy"] = (
                    "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
                )
            await send(message)

        await self.app(scope, receive, send_with_headers)
