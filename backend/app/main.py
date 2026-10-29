import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.api.v1.endpoints import calls, contacts, analytics, settings as settings_endpoint, telephony
from app.db import init_db

logger = logging.getLogger("voxora.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI Voice Calling Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc, exc_info=settings.DEBUG)
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the platform administrator."},
    )


# API Routers
app.include_router(api_router, prefix="/api/v1")

# Direct aliases for /api/calls, /api/contacts, /api/analytics, /api/settings, /api/telephony
app.include_router(calls.router, prefix="/api/calls", tags=["Calls"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(settings_endpoint.router, prefix="/api/settings", tags=["Settings"])
app.include_router(telephony.router, prefix="/api/telephony", tags=["Telephony"])
app.include_router(telephony.router, prefix="/api/webhooks/telephony", tags=["Telephony Webhooks"])


@app.get("/", summary="Root Endpoint", tags=["System"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
    }


@app.get("/health", summary="Top-Level Service Health Probe", tags=["System"])
async def top_level_health():
    """
    Standard top-level health probe for container orchestrators and load balancers.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

