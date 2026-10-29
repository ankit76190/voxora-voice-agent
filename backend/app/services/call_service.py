import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import CallSession, TranscriptItemModel
from app.schemas.call import CallSessionCreate, CallSessionUpdate, TranscriptItemCreate


class CallService:
    @staticmethod
    async def create_call(db: AsyncSession, payload: CallSessionCreate) -> CallSession:
        session = CallSession(
            contact_id=payload.contact_id,
            contact_name=payload.contact_name,
            phone_number=payload.phone_number,
            direction=payload.direction,
            agent_name=payload.agent_name or "Voxora Concierge",
            status="IN_PROGRESS",
            started_at=datetime.now(timezone.utc),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_call(db: AsyncSession, call_id: str) -> Optional[CallSession]:
        query = select(CallSession).where(CallSession.id == call_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def complete_call(
        db: AsyncSession, call_id: str, payload: CallSessionUpdate
    ) -> Optional[CallSession]:
        session = await CallService.get_call(db, call_id)
        if not session:
            return None

        if payload.status:
            session.status = payload.status
        else:
            session.status = "COMPLETED"

        if payload.duration_seconds is not None:
            session.duration_seconds = payload.duration_seconds

        if payload.summary is not None:
            session.summary = payload.summary

        if payload.sentiment is not None:
            session.sentiment = payload.sentiment

        session.ended_at = payload.ended_at or datetime.now(timezone.utc)

        # Append any transcript items passed during completion
        if payload.transcripts:
            for item in payload.transcripts:
                turn = TranscriptItemModel(
                    call_id=session.id,
                    role=item.role,
                    content=item.content,
                    timestamp=item.timestamp,
                    sequence=item.sequence,
                )
                db.add(turn)

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def list_calls(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[CallSession], int]:
        query = select(CallSession)
        count_query = select(func.count(CallSession.id))

        filters = []
        if search and search.strip():
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    CallSession.contact_name.ilike(term),
                    CallSession.phone_number.ilike(term),
                    CallSession.summary.ilike(term),
                    CallSession.agent_name.ilike(term),
                )
            )

        if status and status.strip() and status.upper() != "ALL":
            filters.append(CallSession.status == status.strip().upper())

        if start_date:
            filters.append(CallSession.started_at >= start_date)

        if end_date:
            filters.append(CallSession.started_at <= end_date)

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        # Get total count
        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        # Order and paginate
        query = (
            query.order_by(CallSession.started_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await db.execute(query)
        items = list(result.scalars().all())
        return items, total

