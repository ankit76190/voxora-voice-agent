from fastapi import APIRouter
from app.api.v1.endpoints import health, conversation, calls, contacts, analytics, settings, telephony

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(conversation.router, tags=["Conversation"])
api_router.include_router(calls.router, prefix="/calls", tags=["Calls"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(telephony.router, prefix="/telephony", tags=["Telephony"])
