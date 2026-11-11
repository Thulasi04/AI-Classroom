from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.database.models import Course, User
from app.schemas.academic import CourseResponse

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=list[CourseResponse])
def list_courses(
    department: str | None = None,
    semester: int | None = None,
    search: str | None = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Course)
    if department:
        query = query.filter(Course.department.ilike(f"%{department.strip()}%"))
    if semester is not None:
        query = query.filter(Course.semester == semester)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Course.code.ilike(term),
                Course.name.ilike(term),
                Course.faculty_name.ilike(term),
            )
        )
    return query.order_by(Course.semester.asc(), Course.code.asc()).all()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

