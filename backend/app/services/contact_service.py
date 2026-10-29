from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ContactModel, CallSession
from app.schemas.contact import ContactCreate, ContactUpdate


class ContactService:
    @staticmethod
    async def create_contact(db: AsyncSession, payload: ContactCreate) -> ContactModel:
        contact = ContactModel(
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            email=payload.email.strip() if payload.email else None,
            company=payload.company.strip() if payload.company else None,
            notes=payload.notes.strip() if payload.notes else None,
            status=payload.status,
            consent_status=payload.consent_status,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def get_contact(db: AsyncSession, contact_id: str) -> Optional[ContactModel]:
        query = select(ContactModel).where(ContactModel.id == contact_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_contact(
        db: AsyncSession, contact_id: str, payload: ContactUpdate
    ) -> Optional[ContactModel]:
        contact = await ContactService.get_contact(db, contact_id)
        if not contact:
            return None

        if payload.name is not None:
            contact.name = payload.name.strip()

        if payload.phone is not None:
            contact.phone = payload.phone.strip()

        if payload.email is not None:
            contact.email = payload.email.strip() if payload.email else None

        if payload.company is not None:
            contact.company = payload.company.strip() if payload.company else None

        if payload.notes is not None:
            contact.notes = payload.notes.strip() if payload.notes else None

        if payload.status is not None:
            contact.status = payload.status

        if payload.consent_status is not None:
            contact.consent_status = payload.consent_status

        contact.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def delete_contact(db: AsyncSession, contact_id: str) -> bool:
        contact = await ContactService.get_contact(db, contact_id)
        if not contact:
            return False

        # Safe relationship strategy: set contact_id on associated calls to NULL before deleting contact
        # so historical call sessions and transcripts are preserved without orphan exceptions
        update_calls_stmt = (
            select(CallSession).where(CallSession.contact_id == contact_id)
        )
        associated_calls = (await db.execute(update_calls_stmt)).scalars().all()
        for call in associated_calls:
            call.contact_id = None

        await db.delete(contact)
        await db.commit()
        return True

    @staticmethod
    async def list_contacts(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[ContactModel], int]:
        query = select(ContactModel)
        count_query = select(func.count(ContactModel.id))

        filters = []
        if search and search.strip():
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    ContactModel.name.ilike(term),
                    ContactModel.phone.ilike(term),
                    ContactModel.email.ilike(term),
                    ContactModel.company.ilike(term),
                    ContactModel.notes.ilike(term),
                )
            )

        if status and status.strip() and status.upper() != "ALL":
            filters.append(ContactModel.status == status.strip())

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        query = (
            query.order_by(ContactModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await db.execute(query)
        items = list(result.scalars().all())
        return items, total

