import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactDetailResponse,
    PaginatedContactResponse,
)
from app.schemas.call import CallSessionResponse
from app.services.contact_service import ContactService

router = APIRouter()


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Enterprise Contact",
)
async def create_contact(
    payload: ContactCreate,
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    """
    Creates a new contact record with phone number normalization
    and calling consent tracking.
    """
    try:
        contact = await ContactService.create_contact(db, payload)
        return ContactResponse(
            id=contact.id,
            name=contact.name,
            phone=contact.phone,
            email=contact.email,
            company=contact.company,
            notes=contact.notes,
            status=contact.status,
            consent_status=contact.consent_status,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
            call_count=0,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create contact: {str(exc)}",
        )


@router.get(
    "",
    response_model=PaginatedContactResponse,
    summary="List Contacts with Search & Filters",
)
async def list_contacts(
    page: int = Query(default=1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search term for name, phone, email, or company"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Status filter (Active, Prospect, Inactive)"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedContactResponse:
    """
    Returns a paginated list of enterprise contacts matching optional search queries and status filters.
    """
    try:
        items, total = await ContactService.list_contacts(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_filter,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        response_items = []
        for item in items:
            call_count = len(item.calls) if item.calls else 0
            response_items.append(
                ContactResponse(
                    id=item.id,
                    name=item.name,
                    phone=item.phone,
                    email=item.email,
                    company=item.company,
                    notes=item.notes,
                    status=item.status,
                    consent_status=item.consent_status,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                    call_count=call_count,
                )
            )

        return PaginatedContactResponse(
            items=response_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve contacts: {str(exc)}",
        )


@router.get(
    "/{contact_id}",
    response_model=ContactDetailResponse,
    summary="Get Contact Details with Linked Call History",
)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
) -> ContactDetailResponse:
    """
    Retrieves full contact profile information along with all historical call sessions
    associated with this contact.
    """
    try:
        contact = await ContactService.get_contact(db, contact_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with ID '{contact_id}' not found.",
            )

        linked_calls = [
            CallSessionResponse.model_validate(c) for c in (contact.calls or [])
        ]

        return ContactDetailResponse(
            id=contact.id,
            name=contact.name,
            phone=contact.phone,
            email=contact.email,
            company=contact.company,
            notes=contact.notes,
            status=contact.status,
            consent_status=contact.consent_status,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
            call_count=len(linked_calls),
            calls=linked_calls,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contact details: {str(exc)}",
        )


@router.patch(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Update Contact Details",
)
@router.put(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Update Contact Details (PUT)",
)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    """
    Updates mutable contact attributes (name, phone, email, company, notes, status, consent).
    """
    try:
        contact = await ContactService.update_contact(db, contact_id, payload)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with ID '{contact_id}' not found.",
            )

        call_count = len(contact.calls) if contact.calls else 0
        return ContactResponse(
            id=contact.id,
            name=contact.name,
            phone=contact.phone,
            email=contact.email,
            company=contact.company,
            notes=contact.notes,
            status=contact.status,
            consent_status=contact.consent_status,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
            call_count=call_count,
        )
    except HTTPException:
        raise
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update contact: {str(exc)}",
        )


@router.delete(
    "/{contact_id}",
    summary="Delete Contact",
    status_code=status.HTTP_200_OK,
)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Safely deletes a contact. Any associated call sessions remain preserved in the call history
    with their foreign key safely set to NULL to prevent data loss.
    """
    try:
        success = await ContactService.delete_contact(db, contact_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with ID '{contact_id}' not found.",
            )
        return {
            "message": "Contact deleted successfully. Historical call sessions preserved.",
            "id": contact_id,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete contact: {str(exc)}",
        )

