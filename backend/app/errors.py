"""Yagona xato formati: {"xato": "...", "maydonlar": {...}}."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, xato: str, maydonlar: dict[str, str] | None = None):
        self.status = status
        self.xato = xato
        self.maydonlar = maydonlar or {}


class ValidationFailed(ApiError):
    def __init__(self, maydonlar: dict[str, str], xato: str = "Ma'lumotlarda xato bor"):
        super().__init__(422, xato, maydonlar)


def _body(xato: str, maydonlar: dict | None = None) -> dict:
    return {"xato": xato, "maydonlar": maydonlar or {}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return JSONResponse(_body(exc.xato, exc.maydonlar), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def request_validation(_: Request, exc: RequestValidationError):
        maydonlar = {}
        for err in exc.errors():
            loc = [str(p) for p in err["loc"] if p not in ("body", "query", "path", "header")]
            maydonlar[".".join(loc) or "so'rov"] = err["msg"]
        return JSONResponse(_body("So'rov noto'g'ri", maydonlar), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        return JSONResponse(_body(str(exc.detail)), status_code=exc.status_code)
