from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.core.db import get_db
from app.models.user import User
from app.models.shift import Shift, ShiftClaim, ShiftRequirement
from app.schemas.shift import ShiftClaimResponse, ShiftClaimBase
from app.api import deps
from app.services import shift_service

router = APIRouter()

@router.post("/{shift_id}/claim", response_model=ShiftClaimResponse)
async def claim_shift(
    shift_id: UUID,
    claim_in: ShiftClaimBase,
    user_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Claim a shift for a specific role. Managers can optionally assign by providing user_id.
    """
    target_user_id = current_user.id
    if user_id:
        if current_user.role != "manager":
            raise HTTPException(status_code=403, detail="Only managers can assign shifts to other users.")
        target_user_id = user_id

    # This invokes our transaction-safe service logic
    claim = await shift_service.claim_shift(db, shift_id, target_user_id, claim_in.role_name)
    return claim

@router.delete("/{shift_id}/claim")
async def unclaim_shift(
    shift_id: UUID,
    user_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    target_user_id = current_user.id
    if user_id:
        if current_user.role != "manager":
            raise HTTPException(status_code=403, detail="Only managers can unassign shifts for other users.")
        target_user_id = user_id

    success = await shift_service.unclaim_shift(db, shift_id, target_user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not unclaim shift.")
    return {"message": "Successfully unclaimed"}
