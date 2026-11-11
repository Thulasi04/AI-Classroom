from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_db
from app.database.models import StudentProfile
from app.schemas.academic import AttendanceMeResponse
from app.services.academic_service import compute_student_attendance

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/me", response_model=AttendanceMeResponse)
def get_my_attendance(
    course_id: int | None = None,
    status: str | None = Query(default=None, pattern="^(present|absent|late)$"),
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return compute_student_attendance(db, student.id, course_id=course_id, status_filter=status)

