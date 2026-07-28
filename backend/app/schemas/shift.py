from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class ShiftRequirementBase(BaseModel):
    role_name: str
    count_required: int

class ShiftRequirementCreate(ShiftRequirementBase):
    pass

class ShiftRequirementResponse(ShiftRequirementBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    shift_id: UUID

class ShiftClaimBase(BaseModel):
    role_name: str

class ShiftClaimResponse(ShiftClaimBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    shift_id: UUID
    user_id: UUID
    claimed_at: datetime

class ShiftBase(BaseModel):
    start_time: datetime
    end_time: datetime

class ShiftCreate(ShiftBase):
    requirements: List[ShiftRequirementCreate]

class ShiftUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    requirements: Optional[List[ShiftRequirementCreate]] = None

class ShiftResponse(ShiftBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    requirements: List[ShiftRequirementResponse]
    claims: List[ShiftClaimResponse]
