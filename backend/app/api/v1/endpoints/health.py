from typing import Dict, Any
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Service Health Check")
async def health_check() -> Dict[str, Any]:
    """
    Returns basic service health status, environment mode, and current version.
    Used by container probes and monitoring systems.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

