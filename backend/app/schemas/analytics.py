from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AnalyticsOverviewResponse(BaseModel):
    total_sessions: int = Field(..., description="Total saved voice sessions in period")
    completed_sessions: int = Field(..., description="Sessions that finished successfully")
    failed_sessions: int = Field(..., description="Sessions that failed or errored")
    incomplete_sessions: int = Field(
        ..., description="Sessions that were in progress, busy, or unanswered"
    )
    completion_rate: float = Field(
        ..., description="Percentage of sessions completed successfully (0.0 to 100.0)"
    )
    average_duration_seconds: float = Field(
        ..., description="Average duration of completed sessions in seconds"
    )
    start_date: Optional[str] = Field(default=None, description="Start date filter applied")
    end_date: Optional[str] = Field(default=None, description="End date filter applied")

    model_config = ConfigDict(from_attributes=True)


class TrendDataPoint(BaseModel):
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    total: int = Field(..., description="Total sessions for this day")
    completed: int = Field(..., description="Completed sessions for this day")
    failed: int = Field(..., description="Failed sessions for this day")
    incomplete: int = Field(..., description="Incomplete or dropped sessions for this day")


class AnalyticsTrendsResponse(BaseModel):
    trends: List[TrendDataPoint] = Field(default=[], description="Daily session trend breakdown")
    total_period_sessions: int = Field(..., description="Total sessions in trend series")


class OutcomeItem(BaseModel):
    status: str = Field(..., description="Session status identifier")
    label: str = Field(..., description="Human-readable status label")
    count: int = Field(..., description="Number of sessions with this status")
    percentage: float = Field(..., description="Percentage of total sessions (0.0 to 100.0)")


class AnalyticsOutcomesResponse(BaseModel):
    outcomes: List[OutcomeItem] = Field(default=[], description="Outcome distribution breakdown")
    total_sessions: int = Field(..., description="Total sessions analyzed")

