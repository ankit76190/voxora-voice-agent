from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrendsResponse,
    AnalyticsOutcomesResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get Overview Session Metrics",
)
async def get_analytics_overview(
    start_date: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD or ISO 8601)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD or ISO 8601)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated KPIs (total, completed, failed, incomplete, avg duration)
    calculated strictly against real persisted session records.
    """
    start_dt, end_dt = AnalyticsService.parse_date_range(start_date, end_date)
    try:
        return await AnalyticsService.get_overview(
            db=db,
            start_date=start_dt,
            end_date=end_dt,
            start_str=start_date,
            end_str=end_date,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Database failure calculating analytics overview."
        ) from e


@router.get(
    "/call-trends",
    response_model=AnalyticsTrendsResponse,
    summary="Get Daily Session Trends",
)
@router.get(
    "/trends",
    response_model=AnalyticsTrendsResponse,
    include_in_schema=False,
)
async def get_call_trends(
    start_date: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD or ISO 8601)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD or ISO 8601)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily breakdown of total, completed, failed, and incomplete sessions.
    """
    start_dt, end_dt = AnalyticsService.parse_date_range(start_date, end_date)
    try:
        return await AnalyticsService.get_call_trends(
            db=db, start_date=start_dt, end_date=end_dt
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Database failure calculating session trends."
        ) from e


@router.get(
    "/call-outcomes",
    response_model=AnalyticsOutcomesResponse,
    summary="Get Outcome Distribution Breakdown",
)
@router.get(
    "/outcomes",
    response_model=AnalyticsOutcomesResponse,
    include_in_schema=False,
)
async def get_call_outcomes(
    start_date: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD or ISO 8601)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD or ISO 8601)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns percentage and count distribution by call resolution status.
    """
    start_dt, end_dt = AnalyticsService.parse_date_range(start_date, end_date)
    try:
        return await AnalyticsService.get_call_outcomes(
            db=db, start_date=start_dt, end_date=end_dt
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Database failure calculating session outcomes."
        ) from e


@router.get(
    "/export",
    summary="Export Filtered Session Records as CSV",
)
async def export_analytics_csv(
    start_date: Optional[str] = Query(
        None, description="Start date filter (YYYY-MM-DD or ISO 8601)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date filter (YYYY-MM-DD or ISO 8601)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams RFC 4180-compliant CSV of session telemetry records.
    Applies date range filters. Escapes special characters properly.
    """
    start_dt, end_dt = AnalyticsService.parse_date_range(start_date, end_date)
    try:
        csv_content = await AnalyticsService.export_csv(
            db=db, start_date=start_dt, end_date=end_dt
        )
        date_stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"voxora_analytics_export_{date_stamp}.csv"

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Database failure generating CSV export."
        ) from e

