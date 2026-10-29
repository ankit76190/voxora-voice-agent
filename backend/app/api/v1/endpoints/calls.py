import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.call import (
    CallSessionCreate,
    CallSessionUpdate,
    CallSessionResponse,
    PaginatedCallResponse,
)
from app.services.call_service import CallService

router = APIRouter()


@router.post(
    "",
    response_model=CallSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or Initiate Call Session",
)
async def create_call(
    payload: CallSessionCreate,
    db: AsyncSession = Depends(get_db),
) -> CallSessionResponse:
    """
    Creates a new call record in IN_PROGRESS status.
    Called when an operator or inbound connection starts a voice session.
    """
    try:
        session = await CallService.create_call(db, payload)
        return CallSessionResponse.model_validate(session)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create call session: {str(exc)}",
        )


@router.get(
    "",
    response_model=PaginatedCallResponse,
    summary="List Call Sessions with Filters & Pagination",
)
async def list_calls(
    page: int = Query(default=1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search term for contact, phone, or summary"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Status filter (e.g. COMPLETED)"),
    start_date: Optional[datetime] = Query(default=None, description="Filter calls starting on or after this ISO date"),
    end_date: Optional[datetime] = Query(default=None, description="Filter calls starting on or before this ISO date"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCallResponse:
    """
    Retrieves a paginated list of stored call sessions with optional search,
    status, and date window filters.
    """
    try:
        items, total = await CallService.list_calls(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_filter,
            start_date=start_date,
            end_date=end_date,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return PaginatedCallResponse(
            items=[CallSessionResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve call records: {str(exc)}",
        )


@router.get(
    "/{call_id}",
    response_model=CallSessionResponse,
    summary="Get Call Session Details & Transcript",
)
async def get_call(
    call_id: str,
    db: AsyncSession = Depends(get_db),
) -> CallSessionResponse:
    """
    Retrieves complete details for a single call session, including its full
    spoken dialog transcript in chronological order.
    """
    try:
        session = await CallService.get_call(db, call_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Call session with ID '{call_id}' not found.",
            )
        return CallSessionResponse.model_validate(session)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch call session: {str(exc)}",
        )


@router.patch(
    "/{call_id}/complete",
    response_model=CallSessionResponse,
    summary="Complete Call Session and Save Transcripts",
)
async def complete_call(
    call_id: str,
    payload: CallSessionUpdate,
    db: AsyncSession = Depends(get_db),
) -> CallSessionResponse:
    """
    Finalizes an active call session with final duration, outcome status,
    optional conversation summary, and transcript turns.
    """
    try:
        session = await CallService.complete_call(db, call_id, payload)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Call session with ID '{call_id}' not found.",
            )
        return CallSessionResponse.model_validate(session)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize call session: {str(exc)}",
        )

