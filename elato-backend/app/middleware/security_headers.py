"""
Baseline security response headers, applied to every response. This is a
pure JSON API (no HTML rendered here — the frontends are separate SPAs), so
the policy is deliberately narrow: block MIME-sniffing, block framing, and
stop the browser sending a Referer to third parties.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Render serves this API over HTTPS only — HSTS tells browsers to
        # never attempt a plain-HTTP request to this host again, closing off
        # protocol-downgrade attacks. Safe to add unconditionally since there
        # is no HTTP fallback to break.
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        # This origin is a JSON API with no browser-facing UI of its own, so
        # it never needs any of these browser features — denying them all is
        # pure defense-in-depth with no behavioral effect on legitimate use.
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
        )
        return response
