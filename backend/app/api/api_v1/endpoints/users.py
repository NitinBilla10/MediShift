from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID

from app.core.db import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.api import deps
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_staff(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Retrieve all staff members.
    """
    stmt = select(User).where(User.role == UserRole.staff)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=UserResponse)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Create new staff user.
    """
    # Check if email exists
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        profession=user_in.profession,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Update a staff user.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.email:
        stmt = select(User).where(User.email == user_in.email)
        result = await db.execute(stmt)
        existing = result.scalars().first()
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_in.email
        
    if user_in.name is not None:
        user.name = user_in.name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.profession is not None:
        user.profession = user_in.profession
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)
        
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: UUID,
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Delete a staff user.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}
