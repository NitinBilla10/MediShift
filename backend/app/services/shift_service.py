from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete
from datetime import datetime

from app.models.shift import Shift, ShiftRequirement, ShiftClaim
from app.models.user import User, UserRole

async def check_overlap(db: AsyncSession, user_id: UUID, new_start: datetime, new_end: datetime, exclude_shift_id: UUID = None) -> bool:
    """
    Check if the user already has a shift that overlaps with the given time range.
    """
    stmt = select(Shift).join(ShiftClaim).where(
        ShiftClaim.user_id == user_id,
        Shift.start_time < new_end,
        Shift.end_time > new_start
    )
    if exclude_shift_id:
        stmt = stmt.where(Shift.id != exclude_shift_id)
        
    result = await db.execute(stmt)
    return result.first() is not None

async def claim_shift(db: AsyncSession, shift_id: UUID, user_id: UUID, role_name: str) -> ShiftClaim:
    """
    Transactionally claim a shift, preventing race conditions.
    """
    # Enforce profession
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role != UserRole.manager:
        if user.profession != role_name:
            raise HTTPException(status_code=400, detail=f"Cannot claim role '{role_name}'. Your profession is '{user.profession}'.")

    async with db.begin_nested():
        # Lock the shift row
        stmt = select(Shift).where(Shift.id == shift_id).with_for_update()
        result = await db.execute(stmt)
        shift = result.scalars().first()
        
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
            
        # Recalculate availability
        req_stmt = select(ShiftRequirement).where(
            ShiftRequirement.shift_id == shift_id,
            ShiftRequirement.role_name == role_name
        )
        req_result = await db.execute(req_stmt)
        requirement = req_result.scalars().first()
        
        if not requirement:
            raise HTTPException(status_code=400, detail=f"Role '{role_name}' is not required for this shift")
            
        claim_stmt = select(ShiftClaim).where(
            ShiftClaim.shift_id == shift_id,
            ShiftClaim.role_name == role_name
        )
        claim_result = await db.execute(claim_stmt)
        existing_claims = claim_result.scalars().all()
        
        # Check if already claimed by this user for ANY role on this shift
        # Note: We must check all claims for this user on this shift, not just for this role.
        all_claims_stmt = select(ShiftClaim).where(ShiftClaim.shift_id == shift_id)
        all_claims_result = await db.execute(all_claims_stmt)
        all_claims = all_claims_result.scalars().all()
        
        if any(c.user_id == user_id for c in all_claims):
             raise HTTPException(status_code=400, detail="You have already claimed this shift")
             
        if len(existing_claims) >= requirement.count_required:
            raise HTTPException(status_code=400, detail=f"Shift already fully staffed for role '{role_name}'")
            
        # Check overlap
        has_overlap = await check_overlap(db, user_id, shift.start_time, shift.end_time)
        if has_overlap:
            raise HTTPException(status_code=400, detail="User already has an overlapping shift")
            
        # Create claim
        claim = ShiftClaim(
            shift_id=shift_id,
            user_id=user_id,
            role_name=role_name
        )
        db.add(claim)
        await db.flush()
        
    await db.commit()
    await db.refresh(claim)
    return claim

async def unclaim_shift(db: AsyncSession, shift_id: UUID, user_id: UUID) -> bool:
    stmt = delete(ShiftClaim).where(
        ShiftClaim.shift_id == shift_id,
        ShiftClaim.user_id == user_id
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0

async def edit_shift(db: AsyncSession, shift_id: UUID, start_time: datetime, end_time: datetime, requirements: list) -> Shift:
    async with db.begin_nested():
        stmt = select(Shift).where(Shift.id == shift_id).with_for_update()
        result = await db.execute(stmt)
        shift = result.scalars().first()
        
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
            
        shift.start_time = start_time
        shift.end_time = end_time
        
        # Update requirements
        await db.execute(delete(ShiftRequirement).where(ShiftRequirement.shift_id == shift_id))
        
        req_map = {}
        for req in requirements:
            req_map[req.role_name] = req.count_required
            db.add(ShiftRequirement(shift_id=shift_id, role_name=req.role_name, count_required=req.count_required))
            
        await db.flush()
        
        # Re-validate all existing claims
        claims_result = await db.execute(select(ShiftClaim).where(ShiftClaim.shift_id == shift_id).order_by(ShiftClaim.created_at))
        existing_claims = claims_result.scalars().all()
        
        role_counts = {role: 0 for role in req_map.keys()}
        
        for claim in existing_claims:
            drop_claim = False
            
            # Check if role still required
            if claim.role_name not in req_map:
                drop_claim = True
            else:
                # Check if we exceeded the new capacity for this role
                if role_counts[claim.role_name] >= req_map[claim.role_name]:
                    drop_claim = True
                else:
                    # Check overlap with user's OTHER shifts given the new shift times
                    has_overlap = await check_overlap(db, claim.user_id, start_time, end_time, exclude_shift_id=shift_id)
                    if has_overlap:
                        drop_claim = True
                        
            if drop_claim:
                await db.delete(claim)
            else:
                role_counts[claim.role_name] += 1
                
        await db.flush()
        
    await db.commit()
    return shift

async def delete_shift(db: AsyncSession, shift_id: UUID) -> bool:
    stmt = delete(Shift).where(Shift.id == shift_id)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0
