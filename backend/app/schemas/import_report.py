from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class ImportErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    row_number: Optional[int]
    original_row: Optional[str]
    problem: str
    action_taken: str
    timestamp: datetime

class ImportReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    manager_id: UUID
    created_at: datetime
    accepted_count: int
    rejected_count: int
    merged_count: int
    errors: List[ImportErrorResponse]
