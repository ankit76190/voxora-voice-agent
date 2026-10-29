import csv
import io
from collections import defaultdict
from datetime import datetime, timezone, time
from typing import Optional, Tuple, List
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CallSession
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrendsResponse,
    TrendDataPoint,
    AnalyticsOutcomesResponse,
    OutcomeItem,
)


class AnalyticsService:
    @staticmethod
    def parse_date_range(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        """
        Parses and validates optional start_date and end_date query strings.
        Accepts YYYY-MM-DD or ISO 8601 strings.
        Returns timezone-aware UTC datetimes.
        """
        parsed_start: Optional[datetime] = None
        parsed_end: Optional[datetime] = None

        if start_date and start_date.strip():
            s = start_date.strip()
            try:
                if len(s) == 10:  # YYYY-MM-DD
                    d = datetime.strptime(s, "%Y-%m-%d")
                    parsed_start = datetime.combine(d.date(), time.min).replace(
                        tzinfo=timezone.utc
                    )
                else:
                    # ISO 8601 with or without Z
                    s_clean = s.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(s_clean)
                    parsed_start = (
                        dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid start_date format '{start_date}'. Expected YYYY-MM-DD or ISO 8601.",
                ) from e

        if end_date and end_date.strip():
            e_str = end_date.strip()
            try:
                if len(e_str) == 10:  # YYYY-MM-DD
                    d = datetime.strptime(e_str, "%Y-%m-%d")
                    parsed_end = datetime.combine(d.date(), time.max).replace(
                        tzinfo=timezone.utc
                    )
                else:
                    e_clean = e_str.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(e_clean)
                    parsed_end = (
                        dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid end_date format '{end_date}'. Expected YYYY-MM-DD or ISO 8601.",
                ) from e

        if parsed_start and parsed_end and parsed_start > parsed_end:
            raise HTTPException(
                status_code=422,
                detail="start_date cannot be after end_date.",
            )

        return parsed_start, parsed_end

    @staticmethod
    async def get_overview(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        start_str: Optional[str] = None,
        end_str: Optional[str] = None,
    ) -> AnalyticsOverviewResponse:
        """
        Calculates high-level voice session KPIs from actual saved records.
        Does not query transcripts, protecting user privacy and performance.
        """
        query = select(CallSession.status, CallSession.duration_seconds)
        if start_date:
            query = query.where(CallSession.started_at >= start_date)
        if end_date:
            query = query.where(CallSession.started_at <= end_date)

        result = await db.execute(query)
        rows = result.all()

        total = len(rows)
        if total == 0:
            return AnalyticsOverviewResponse(
                total_sessions=0,
                completed_sessions=0,
                failed_sessions=0,
                incomplete_sessions=0,
                completion_rate=0.0,
                average_duration_seconds=0.0,
                start_date=start_str,
                end_date=end_str,
            )

        completed = 0
        failed = 0
        incomplete = 0
        completed_durations: List[int] = []

        for row in rows:
            st = (row.status or "").upper()
            dur = row.duration_seconds or 0

            if st == "COMPLETED":
                completed += 1
                if dur > 0:
                    completed_durations.append(dur)
            elif st == "FAILED":
                failed += 1
            else:
                # IN_PROGRESS, BUSY, NO_ANSWER, or dropped
                incomplete += 1

        avg_duration = (
            round(sum(completed_durations) / len(completed_durations), 1)
            if completed_durations
            else 0.0
        )
        completion_rate = round((completed / total) * 100, 1)

        return AnalyticsOverviewResponse(
            total_sessions=total,
            completed_sessions=completed,
            failed_sessions=failed,
            incomplete_sessions=incomplete,
            completion_rate=completion_rate,
            average_duration_seconds=avg_duration,
            start_date=start_str,
            end_date=end_str,
        )

    @staticmethod
    async def get_call_trends(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> AnalyticsTrendsResponse:
        """
        Aggregates session counts by day for the requested date window.
        Returns daily total, completed, failed, and incomplete counts.
        """
        query = select(CallSession.started_at, CallSession.status)
        if start_date:
            query = query.where(CallSession.started_at >= start_date)
        if end_date:
            query = query.where(CallSession.started_at <= end_date)

        result = await db.execute(query)
        rows = result.all()

        if not rows:
            return AnalyticsTrendsResponse(trends=[], total_period_sessions=0)

        # Group by day YYYY-MM-DD
        day_map = defaultdict(lambda: {"total": 0, "completed": 0, "failed": 0, "incomplete": 0})

        for row in rows:
            started = row.started_at
            if started:
                day_key = started.strftime("%Y-%m-%d")
            else:
                day_key = "Unknown"

            st = (row.status or "").upper()
            day_map[day_key]["total"] += 1
            if st == "COMPLETED":
                day_map[day_key]["completed"] += 1
            elif st == "FAILED":
                day_map[day_key]["failed"] += 1
            else:
                day_map[day_key]["incomplete"] += 1

        trends: List[TrendDataPoint] = [
            TrendDataPoint(
                date=k,
                total=v["total"],
                completed=v["completed"],
                failed=v["failed"],
                incomplete=v["incomplete"],
            )
            for k, v in sorted(day_map.items())
        ]

        return AnalyticsTrendsResponse(
            trends=trends,
            total_period_sessions=len(rows),
        )

    @staticmethod
    async def get_call_outcomes(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> AnalyticsOutcomesResponse:
        """
        Calculates distribution of session statuses and completion outcomes.
        """
        query = select(CallSession.status)
        if start_date:
            query = query.where(CallSession.started_at >= start_date)
        if end_date:
            query = query.where(CallSession.started_at <= end_date)

        result = await db.execute(query)
        rows = result.all()
        total = len(rows)

        if total == 0:
            return AnalyticsOutcomesResponse(outcomes=[], total_sessions=0)

        counts = defaultdict(int)
        for row in rows:
            st = (row.status or "UNKNOWN").upper()
            counts[st] += 1

        label_map = {
            "COMPLETED": "Completed Successfully",
            "FAILED": "Call Failed / Error",
            "IN_PROGRESS": "Active / In Progress",
            "BUSY": "Line Busy",
            "NO_ANSWER": "No Answer / Unreachable",
            "UNKNOWN": "Unknown Outcome",
        }

        # Defined ordering for predictable chart visualization
        canonical_order = ["COMPLETED", "IN_PROGRESS", "FAILED", "BUSY", "NO_ANSWER"]
        seen_statuses = set(counts.keys())
        all_ordered = canonical_order + [s for s in sorted(seen_statuses) if s not in canonical_order]

        outcomes: List[OutcomeItem] = []
        for status_key in all_ordered:
            count = counts.get(status_key, 0)
            if count > 0:
                pct = round((count / total) * 100, 1)
                outcomes.append(
                    OutcomeItem(
                        status=status_key,
                        label=label_map.get(status_key, status_key.replace("_", " ").title()),
                        count=count,
                        percentage=pct,
                    )
                )

        return AnalyticsOutcomesResponse(
            outcomes=outcomes,
            total_sessions=total,
        )

    @staticmethod
    async def export_csv(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> str:
        """
        Generates RFC 4180-compliant CSV of filtered sessions.
        Escapes commas, quotation marks, and line breaks safely.
        Excludes sensitive internal secrets, tokens, and raw transcript text.
        """
        query = select(CallSession).order_by(CallSession.started_at.desc())
        if start_date:
            query = query.where(CallSession.started_at >= start_date)
        if end_date:
            query = query.where(CallSession.started_at <= end_date)

        result = await db.execute(query)
        sessions = result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Header row
        writer.writerow(
            [
                "Session ID",
                "Contact Name",
                "Phone / Audio Source",
                "Direction",
                "Status",
                "Duration (Seconds)",
                "Started At (UTC)",
                "Ended At (UTC)",
                "Agent Name",
                "Summary",
            ]
        )

        for s in sessions:
            writer.writerow(
                [
                    s.id,
                    s.contact_name or "Web Client",
                    s.phone_number or "Browser Audio",
                    s.direction or "BROWSER",
                    s.status or "IN_PROGRESS",
                    s.duration_seconds if s.duration_seconds is not None else 0,
                    s.started_at.isoformat() if s.started_at else "",
                    s.ended_at.isoformat() if s.ended_at else "",
                    s.agent_name or "Voxora Concierge",
                    (s.summary or "").strip(),
                ]
            )

        return output.getvalue()

