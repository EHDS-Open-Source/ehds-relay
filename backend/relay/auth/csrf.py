"""Cross-site request forgery protection for the cookie-authenticated API.

Every state-changing request under /api/ must carry a fixed custom header. Browsers only send
custom headers cross-site after a CORS preflight, which is never granted to other origins, so
a forged form post or image tag cannot pass. Kept as middleware so the header does not show up
as a parameter in the OpenAPI spec and the generated client.
"""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

CSRF_HEADER = "X-Requested-By"
CSRF_HEADER_VALUE = "ehds-relay"

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
_HEADER_KEY = CSRF_HEADER.lower().encode()
_HEADER_VALUE = CSRF_HEADER_VALUE.encode()


class CSRFMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] == "http"
            and scope["method"] in UNSAFE_METHODS
            and scope["path"].startswith("/api/")
            and (_HEADER_KEY, _HEADER_VALUE) not in scope["headers"]
        ):
            response = JSONResponse({"detail": f"missing {CSRF_HEADER} header"}, status_code=403)
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
