from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_current_user, get_db
from app.database.models import Course, Notification, StudentProfile, SupportTicket, Timetable, User
from app.schemas.auth import StudentProfileResponse, StudentProfileUpdate
from app.schemas.campus import NotificationResponse
from app.services.academic_service import (
    compute_student_attendance,
    compute_student_marks,
    list_placements_for_student,
)

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentProfileResponse)
def get_my_student_profile(student: StudentProfile = Depends(get_current_student)):
    return student


@router.put("/me", response_model=StudentProfileResponse)
def update_my_student_profile(
    payload: StudentProfileUpdate,
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if payload.phone is not None:
        student.phone = payload.phone.strip() or None
    if payload.hostel_resident is not None:
        student.hostel_resident = payload.hostel_resident
    db.commit()
    db.refresh(student)
    return student


@router.get("/me/dashboard")
def get_my_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    if student is not None:
        att_data = compute_student_attendance(db, student.id)
        marks_data = compute_student_marks(db, student.id)
        low_att_count = sum(1 for c in att_data["by_course"] if c["percentage"] < 75.0)
        attendance_summary = {
            "overall_percentage": att_data["overall"]["percentage"],
            "total_classes": att_data["overall"]["total_classes"],
            "attended_classes": att_data["overall"]["present_count"] + att_data["overall"]["late_count"],
            "low_attendance_subjects": low_att_count,
        }
        marks_summary = {
            "average_percentage": marks_data["overall_average_percentage"],
            "total_scored": marks_data["total_scored"],
            "total_max": marks_data["total_max"],
            "subject_count": len(marks_data["by_course"]),
        }
        exam_rows = (
            db.query(Timetable, Course)
            .join(Course, Timetable.course_id == Course.id)
            .filter(
                Timetable.department == student.department,
                Timetable.semester == student.semester,
                Timetable.exam_date >= date.today(),
            )
            .order_by(Timetable.exam_date.asc())
            .limit(4)
            .all()
        )
        open_tickets_count = (
            db.query(SupportTicket)
            .filter(
                SupportTicket.student_id == student.id,
                SupportTicket.status.in_(["open", "in_progress"]),
            )
            .count()
        )
    else:
        attendance_summary = {
            "overall_percentage": 0.0,
            "total_classes": 0,
            "attended_classes": 0,
            "low_attendance_subjects": 0,
        }
        marks_summary = {
            "average_percentage": 0.0,
            "total_scored": 0.0,
            "total_max": 0.0,
            "subject_count": 0,
        }
        exam_rows = (
            db.query(Timetable, Course)
            .join(Course, Timetable.course_id == Course.id)
            .order_by(Timetable.exam_date.asc())
            .limit(4)
            .all()
        )
        open_tickets_count = 0

    upcoming_exams = [
        {
            "id": tt.id,
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,
            "exam_type": tt.exam_type,
            "exam_date": tt.exam_date,
            "start_time": tt.start_time,
            "end_time": tt.end_time,
            "room": tt.room,
        }
        for tt, course in exam_rows
    ]

    placement_updates = list_placements_for_student(db, student)[:4]

    notifications = (
        db.query(Notification)
        .filter(or_(Notification.user_id == current_user.id, Notification.user_id.is_(None)))
        .order_by(Notification.created_at.desc())
        .limit(6)
        .all()
    )

    return {
        "profile": StudentProfileResponse.model_validate(student) if student else None,
        "attendance_summary": attendance_summary,
        "marks_summary": marks_summary,
        "upcoming_exams": upcoming_exams,
        "placement_updates": placement_updates,
        "notifications": [NotificationResponse.model_validate(n) for n in notifications],
        "open_tickets_count": open_tickets_count,
    }


@router.get("/notifications", response_model=list[NotificationResponse])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(or_(Notification.user_id == current_user.id, Notification.user_id.is_(None)))
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found for user")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

