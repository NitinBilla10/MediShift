from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.core.db import get_db
from app.models.user import User, UserRole
from app.models.shift import Shift, ShiftRequirement
from app.schemas.shift import ShiftCreate, ShiftResponse, ShiftUpdate
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve shifts.
    """
    # Load requirements and claims as well
    stmt = select(Shift).options(
        selectinload(Shift.requirements),
        selectinload(Shift.claims)
    ).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=ShiftResponse)
async def create_shift(
    *,
    db: AsyncSession = Depends(get_db),
    shift_in: ShiftCreate,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Create new shift. Manager only.
    """
    shift = Shift(
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        created_by_id=current_user.id
    )
    db.add(shift)
    
    for req in shift_in.requirements:
        requirement = ShiftRequirement(
            shift=shift,
            role_name=req.role_name,
            count_required=req.count_required
        )
        db.add(requirement)
        
    await db.commit()
    await db.refresh(shift)
    
    # Needs a reload to populate the relationships properly for response
    stmt = select(Shift).options(
        selectinload(Shift.requirements),
        selectinload(Shift.claims)
    ).where(Shift.id == shift.id)
    result = await db.execute(stmt)
    return result.scalars().first()

@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    *,
    db: AsyncSession = Depends(get_db),
    shift_id: UUID,
    shift_in: ShiftCreate,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Update shift times and requirements. Re-validates existing claims. Manager only.
    """
    from app.services import shift_service
    await shift_service.edit_shift(db, shift_id, shift_in.start_time, shift_in.end_time, shift_in.requirements)
    
    # Reload for response
    stmt = select(Shift).options(
        selectinload(Shift.requirements),
        selectinload(Shift.claims)
    ).where(Shift.id == shift_id)
    result = await db.execute(stmt)
    updated_shift = result.scalars().first()
    if not updated_shift:
        raise HTTPException(status_code=404, detail="Shift not found after update")
    return updated_shift

@router.delete("/{shift_id}")
async def delete_shift(
    *,
    db: AsyncSession = Depends(get_db),
    shift_id: UUID,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Delete a shift. Manager only.
    """
    from app.services import shift_service
    success = await shift_service.delete_shift(db, shift_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Successfully deleted shift"}
