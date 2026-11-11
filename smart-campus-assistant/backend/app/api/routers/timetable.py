from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.database.models import Course, StudentProfile, Timetable, User
from app.schemas.academic import TimetableResponse

router = APIRouter(prefix="/timetable", tags=["Examination Timetable"])


@router.get("", response_model=list[TimetableResponse])
def get_timetable(
    department: str | None = None,
    semester: int | None = None,
    exam_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Timetable, Course).join(Course, Timetable.course_id == Course.id)

    if current_user.role != "admin" and department is None and semester is None:
        student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if student:
            query = query.filter(
                Timetable.department == student.department,
                Timetable.semester == student.semester,
            )
    else:
        if department:
            query = query.filter(Timetable.department == department)
        if semester is not None:
            query = query.filter(Timetable.semester == semester)

    if exam_type:
        query = query.filter(Timetable.exam_type == exam_type)

    rows = query.order_by(Timetable.exam_date.asc()).all()
    return [
        TimetableResponse(
            id=tt.id,
            course_id=course.id,
            course_code=course.code,
            course_name=course.name,
            exam_type=tt.exam_type,
            exam_date=tt.exam_date,
            start_time=tt.start_time,
            end_time=tt.end_time,
            room=tt.room,
            department=tt.department,
            semester=tt.semester,
            announcement=tt.announcement,
        )
        for tt, course in rows
    ]

