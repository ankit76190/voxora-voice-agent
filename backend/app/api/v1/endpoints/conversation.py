from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db import get_db
from app.schemas.conversation import ConversationRequest, ConversationResponse
from app.services.settings_service import SettingsService
from app.services.gemini_service import (
    generate_conversation_reply,
    compose_system_instruction,
    GeminiConfigError,
    GeminiTimeoutError,
    GeminiRateLimitError,
    GeminiUpstreamError,
)

router = APIRouter()


@router.get("/conversation/status", summary="Gemini Integration Status")
async def get_conversation_status():
    """
    Returns public non-sensitive status of the backend Gemini integration.
    Never exposes API credentials.
    """
    return {
        "gemini_configured": settings.is_gemini_configured(),
        "model": settings.GEMINI_MODEL,
        "timeout_seconds": settings.GEMINI_TIMEOUT_SECONDS,
    }


@router.post(
    "/conversation",
    response_model=ConversationResponse,
    summary="Process Conversational Voice Turn",
    status_code=status.HTTP_200_OK,
)
async def process_conversation(
    request: ConversationRequest,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """
    Receives current user message and bounded conversational history,
    applies persisted AI agent persona configuration and server safety controls,
    calls Gemini API securely on the server side, and returns the response.
    """
    try:
        # Load active system persona settings
        active_settings = await SettingsService.get_settings(db)

        if request.system_instruction:
            instruction = request.system_instruction
        else:
            instruction = compose_system_instruction(
                agent_name=active_settings.agent_name,
                response_style=active_settings.response_style,
                language=active_settings.language,
                custom_instructions=active_settings.custom_instructions,
            )

        temp = (
            request.temperature
            if request.temperature is not None
            else active_settings.temperature
        )
        max_turns = active_settings.max_history_turns

        reply = await generate_conversation_reply(
            message=request.message,
            history=request.history,
            system_instruction=instruction,
            temperature=temp,
            max_history_turns=max_turns,
        )
        return reply

    except GeminiConfigError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(err),
        )

    except GeminiRateLimitError as err:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(err),
        )

    except GeminiTimeoutError as err:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(err),
        )

    except GeminiUpstreamError as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(err),
        )

    except Exception:
        # Never leak raw stack traces or internals
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the conversation.",
        )

