import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class ImportReport(Base):
    __tablename__ = "import_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    accepted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rejected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    merged_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    manager = relationship("User")
    errors = relationship("ImportError", back_populates="report", cascade="all, delete-orphan")

class ImportError(Base):
    __tablename__ = "import_errors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("import_reports.id", ondelete="CASCADE"), nullable=False)
    
    row_number: Mapped[int] = mapped_column(Integer, nullable=True)
    original_row: Mapped[str] = mapped_column(Text, nullable=True)
    problem: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    report = relationship("ImportReport", back_populates="errors")
