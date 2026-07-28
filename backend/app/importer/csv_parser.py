from io import StringIO
import csv
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.import_report import ImportReport, ImportError
from app.models.shift import Shift, ShiftRequirement
from app.schemas.import_report import ImportReportResponse, ImportErrorResponse

ROLE_NORMALIZATION_MAP = {
    "dr": "doctor",
    "doctor": "doctor",
    "physician": "doctor",
    "md": "doctor",
    "rn": "nurse",
    "nurse": "nurse",
    "registered nurse": "nurse",
    "recep.": "receptionist",
    "recep": "receptionist",
    "receptionist": "receptionist",
    "reception": "receptionist",
}

def normalize_role(raw_role: str) -> str:
    cleaned = raw_role.strip().lower()
    if cleaned in ROLE_NORMALIZATION_MAP:
        return ROLE_NORMALIZATION_MAP[cleaned]
        
    prefix = cleaned[:3]
    if prefix in ['doc', 'phy', 'md']:
        return 'doctor'
    elif prefix in ['nur', 'rn', 'reg']:
        return 'nurse'
    elif prefix in ['rec']:
        return 'receptionist'
        
    return cleaned

def parse_date(date_str: str) -> str | None:
    date_str = date_str.strip()
    # Try YYYY-MM-DD
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass
    
    # Try DD/MM/YYYY
    try:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Try MM-DD-YYYY
    try:
        dt = datetime.strptime(date_str, "%m-%d-%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None

def parse_time_and_offset(time_str: str) -> tuple[str | None, int]:
    # e.g., "16:00", "10:00+1"
    time_str = time_str.strip()
    if not time_str:
        return None, 0

    days_offset = 0
    if "+1" in time_str:
        time_str = time_str.replace("+1", "")
        days_offset = 1

    try:
        dt = datetime.strptime(time_str, "%H:%M")
        return dt.strftime("%H:%M"), days_offset
    except ValueError:
        return None, 0

def parse_requirements(req_str: str) -> dict[str, int] | None:
    # Example: "nurses=3;doctors=1;receptionists=1"
    # Return dict mapping role to count. Returns None if invalid format.
    req_str = req_str.strip()
    if not req_str:
        return {}

    parsed = {}
    parts = [p.strip() for p in req_str.split(";") if p.strip()]
    
    if not parts:
        return None

    for part in parts:
        if "=" not in part:
            return None
        role, count_str = part.split("=", 1)
        if role.endswith('s'):
            role = role[:-1]
        role = normalize_role(role)
        try:
            count = int(count_str)
            if count > 0:
                # Add to existing count if duplicate role in string
                parsed[role] = parsed.get(role, 0) + count
        except ValueError:
            return None
            
    if not parsed:
        return None
        
    return parsed

async def process_csv_import(db: AsyncSession, csv_text: str, manager_id: UUID) -> ImportReportResponse:
    report = ImportReport(manager_id=manager_id)
    db.add(report)
    await db.flush() # get report.id
    
    f = StringIO(csv_text)
    reader = csv.DictReader(f)
    
    # We will deduplicate before inserting
    # Key: (date, start_time, end_time, days_offset)
    # Value: dict of {role: count}
    shifts_to_create = {}
    
    row_number = 1
    for row in reader:
        row_number += 1
        original_row_str = str(row)
        
        # Expected columns: shift_id,date,start_time,end_time,requirements
        date_raw = row.get("date", "")
        start_raw = row.get("start_time", "")
        end_raw = row.get("end_time", "")
        req_raw = row.get("requirements", "")
        
        parsed_date = parse_date(date_raw)
        parsed_start, start_offset = parse_time_and_offset(start_raw)
        parsed_end, end_offset = parse_time_and_offset(end_raw)
        
        if not parsed_date:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem=f"Invalid Date: {date_raw}", action_taken="Rejected"))
            report.rejected_count += 1
            continue
            
        if not parsed_start or not parsed_end:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem=f"Invalid Time: {start_raw} or {end_raw}", action_taken="Rejected"))
            report.rejected_count += 1
            continue

        parsed_reqs = parse_requirements(req_raw)
        if parsed_reqs is None:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem=f"Unparseable requirements: {req_raw}", action_taken="Rejected"))
            report.rejected_count += 1
            continue
            
        if not parsed_reqs:
            # Skip empty valid requirements
            report.accepted_count += 1
            continue

        key = (parsed_date, parsed_start, parsed_end, end_offset - start_offset)
        
        if key not in shifts_to_create:
            shifts_to_create[key] = {}
            report.accepted_count += 1
        else:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem="Shift with matching times already processed", action_taken="Merged Requirements"))
            report.merged_count += 1
                
        # Merge requirements
        for role, count in parsed_reqs.items():
            shifts_to_create[key][role] = shifts_to_create[key].get(role, 0) + count

    # Now create the actual shifts
    for (date_str, start_str, end_str, day_offset), roles_dict in shifts_to_create.items():
        start_dt = datetime.strptime(f"{date_str} {start_str}", "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(f"{date_str} {end_str}", "%Y-%m-%d %H:%M")
        
        if day_offset > 0:
            end_dt += timedelta(days=day_offset)
        elif end_dt <= start_dt:
            # Implicit overnight shift if end_time < start_time without +1
            end_dt += timedelta(days=1)
            
        shift = Shift(start_time=start_dt, end_time=end_dt, created_by_id=manager_id)
        db.add(shift)
        await db.flush()
        
        for r_name, r_count in roles_dict.items():
            db.add(ShiftRequirement(shift_id=shift.id, role_name=r_name, count_required=r_count))

    await db.commit()
    await db.refresh(report)
    
    err_stmt = select(ImportError).where(ImportError.report_id == report.id)
    err_result = await db.execute(err_stmt)
    errors = err_result.scalars().all()
    
    return ImportReportResponse(
        id=report.id,
        manager_id=report.manager_id,
        created_at=report.created_at,
        accepted_count=report.accepted_count,
        rejected_count=report.rejected_count,
        merged_count=report.merged_count,
        errors=[ImportErrorResponse.model_validate(e) for e in errors]
    )

async def process_staff_csv_import(db: AsyncSession, csv_text: str, manager_id: UUID) -> ImportReportResponse:
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    
    report = ImportReport(manager_id=manager_id)
    db.add(report)
    await db.flush()
    
    f = StringIO(csv_text)
    reader = csv.DictReader(f)
    
    seen_emails = set()
    row_number = 1
    
    for row in reader:
        row_number += 1
        original_row_str = str(row)
        
        email = row.get("email", "").strip()
        if "(at)" in email:
            email = email.replace("(at)", "@")
            
        if not email:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem="Missing email address", action_taken="Rejected"))
            report.rejected_count += 1
            continue
            
        if email in seen_emails:
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem=f"Duplicate email in CSV: {email}", action_taken="Rejected"))
            report.rejected_count += 1
            continue
            
        seen_emails.add(email)
        
        # Check if email already exists in DB
        existing_user = await db.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            db.add(ImportError(report_id=report.id, row_number=row_number, original_row=original_row_str, problem=f"Email already exists in system: {email}", action_taken="Rejected"))
            report.rejected_count += 1
            continue
        
        name = row.get("full_name", "").strip()
        if not name:
            name = "Unknown Staff"
            
        role_raw = row.get("role", "").strip()
        profession = normalize_role(role_raw) if role_raw else None
        
        if profession not in ["doctor", "nurse", "receptionist"]:
            profession = "receptionist"
        
        staff = User(
            email=email,
            name=name,
            profession=profession,
            password_hash=get_password_hash("password123"),
            role=UserRole.staff
        )
        db.add(staff)
        report.accepted_count += 1
        
    await db.commit()
    await db.refresh(report)
    
    err_stmt = select(ImportError).where(ImportError.report_id == report.id)
    err_result = await db.execute(err_stmt)
    errors = err_result.scalars().all()
    
    return ImportReportResponse(
        id=report.id,
        manager_id=report.manager_id,
        created_at=report.created_at,
        accepted_count=report.accepted_count,
        rejected_count=report.rejected_count,
        merged_count=report.merged_count,
        errors=[ImportErrorResponse.model_validate(e) for e in errors]
    )
