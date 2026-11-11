from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_db
from app.database.models import StudentProfile
from app.schemas.academic import MarksMeResponse
from app.services.academic_service import compute_student_marks

router = APIRouter(prefix="/marks", tags=["Internal Marks"])


@router.get("/me", response_model=MarksMeResponse)
def get_my_marks(
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return compute_student_marks(db, student.id)

