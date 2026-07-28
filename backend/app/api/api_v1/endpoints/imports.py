from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.core.db import get_db
from app.models.user import User
from app.api import deps
from app.schemas.import_report import ImportReportResponse
from app.importer.csv_parser import process_csv_import

router = APIRouter()

@router.post("/upload", response_model=ImportReportResponse)
async def upload_shifts_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Upload a CSV file of shifts to import.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    content = await file.read()
    # Decode keeping it robust for pandas or standard csv module
    text_content = content.decode('utf-8')
    
    report = await process_csv_import(db, text_content, current_user.id)
    return report

@router.post("/staff", response_model=ImportReportResponse)
async def upload_staff_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_manager)
) -> Any:
    """
    Upload a CSV file of staff to import.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    content = await file.read()
    text_content = content.decode('utf-8')
    
    from app.importer.csv_parser import process_staff_csv_import
    report = await process_staff_csv_import(db, text_content, current_user.id)
    return report
