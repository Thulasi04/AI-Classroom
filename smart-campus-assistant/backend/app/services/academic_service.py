from collections import defaultdict
from sqlalchemy.orm import Session

from app.database.models import (
    Attendance,
    Course,
    InternalMark,
    PlacementApplication,
    PlacementOpportunity,
    StudentProfile,
)


def compute_student_attendance(
    db: Session,
    student_id: int,
    course_id: int | None = None,
    status_filter: str | None = None,
) -> dict:
    query = (
        db.query(Attendance, Course)
        .join(Course, Attendance.course_id == Course.id)
        .filter(Attendance.student_id == student_id)
    )
    all_rows = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    total_classes = len(all_rows)
    present_count = sum(1 for att, _ in all_rows if att.status == "present")
    late_count = sum(1 for att, _ in all_rows if att.status == "late")
    absent_count = sum(1 for att, _ in all_rows if att.status == "absent")
    attended_total = present_count + late_count
    overall_pct = round((attended_total / total_classes) * 100, 1) if total_classes else 0.0

    grouped: dict[int, dict] = {}
    for att, course in all_rows:
        entry = grouped.setdefault(
            course.id,
            {
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "faculty_name": course.faculty_name,
                "total_classes": 0,
                "attended_classes": 0,
                "absent_count": 0,
            },
        )
        entry["total_classes"] += 1
        if att.status in {"present", "late"}:
            entry["attended_classes"] += 1
        else:
            entry["absent_count"] += 1

    by_course = []
    for entry in grouped.values():
        total = entry["total_classes"]
        pct = round((entry["attended_classes"] / total) * 100, 1) if total else 0.0
        by_course.append({**entry, "percentage": pct})
    by_course.sort(key=lambda x: x["course_code"])

    history = []
    for att, course in all_rows:
        if course_id is not None and att.course_id != course_id:
            continue
        if status_filter and att.status != status_filter:
            continue
        history.append(
            {
                "id": att.id,
                "date": att.date,
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "status": att.status,
                "remarks": att.remarks,
            }
        )

    return {
        "overall": {
            "total_classes": total_classes,
            "present_count": present_count,
            "late_count": late_count,
            "absent_count": absent_count,
            "percentage": overall_pct,
        },
        "by_course": by_course,
        "history": history,
    }


def _percentage_to_grade(pct: float) -> str:
    if pct >= 90:
        return "O"
    if pct >= 80:
        return "A+"
    if pct >= 70:
        return "A"
    if pct >= 60:
        return "B+"
    if pct >= 50:
        return "B"
    return "C"


def compute_student_marks(db: Session, student_id: int) -> dict:
    rows = (
        db.query(InternalMark, Course)
        .join(Course, InternalMark.course_id == Course.id)
        .filter(InternalMark.student_id == student_id)
        .order_by(Course.code.asc(), InternalMark.recorded_at.asc())
        .all()
    )

    by_course_map: dict[int, dict] = defaultdict(dict)
    records = []
    for mark, course in rows:
        records.append(
            {
                "id": mark.id,
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "assessment_name": mark.assessment_name,
                "marks_obtained": mark.marks_obtained,
                "max_marks": mark.max_marks,
                "grade": mark.grade,
                "remarks": mark.remarks,
                "recorded_at": mark.recorded_at,
            }
        )
        if course.id not in by_course_map:
            by_course_map[course.id] = {
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "assessments": [],
                "total_obtained": 0.0,
                "total_max": 0.0,
            }
        bucket = by_course_map[course.id]
        bucket["assessments"].append(
            {
                "assessment_name": mark.assessment_name,
                "marks_obtained": mark.marks_obtained,
                "max_marks": mark.max_marks,
                "grade": mark.grade,
            }
        )
        bucket["total_obtained"] += mark.marks_obtained
        bucket["total_max"] += mark.max_marks

    by_course = []
    total_scored = 0.0
    total_possible = 0.0
    for bucket in by_course_map.values():
        obt = round(bucket["total_obtained"], 1)
        mx = round(bucket["total_max"], 1)
        pct = round((obt / mx) * 100, 1) if mx else 0.0
        total_scored += obt
        total_possible += mx
        by_course.append(
            {
                "course_id": bucket["course_id"],
                "course_code": bucket["course_code"],
                "course_name": bucket["course_name"],
                "assessments": bucket["assessments"],
                "total_obtained": obt,
                "total_max": mx,
                "percentage": pct,
                "grade": _percentage_to_grade(pct),
            }
        )

    overall_avg = round((total_scored / total_possible) * 100, 1) if total_possible else 0.0
    return {
        "overall_average_percentage": overall_avg,
        "total_scored": round(total_scored, 1),
        "total_max": round(total_possible, 1),
        "by_course": by_course,
        "records": records,
    }


def evaluate_placement_eligibility(
    student: StudentProfile | None,
    opportunity: PlacementOpportunity,
) -> tuple[bool, str | None]:
    if student is None:
        return True, None

    reasons: list[str] = []
    if student.cgpa < opportunity.min_cgpa:
        reasons.append(f"Minimum CGPA required is {opportunity.min_cgpa} (yours: {student.cgpa:.2f})")

    allowed_depts = [
        d.strip().lower() for d in opportunity.eligible_departments.split(",") if d.strip()
    ]
    if allowed_depts and "all" not in allowed_depts:
        if student.department.strip().lower() not in allowed_depts:
            reasons.append(f"Open to: {opportunity.eligible_departments}")

    if reasons:
        return False, "; ".join(reasons)
    return True, None


def list_placements_for_student(db: Session, student: StudentProfile | None) -> list[dict]:
    opps = (
        db.query(PlacementOpportunity)
        .filter(PlacementOpportunity.is_active.is_(True))
        .order_by(PlacementOpportunity.deadline.asc())
        .all()
    )

    app_status_map: dict[int, str] = {}
    if student is not None:
        apps = (
            db.query(PlacementApplication)
            .filter(PlacementApplication.student_id == student.id)
            .all()
        )
        app_status_map = {a.opportunity_id: a.status for a in apps}

    result = []
    for opp in opps:
        eligible, reason = evaluate_placement_eligibility(student, opp)
        result.append(
            {
                "id": opp.id,
                "company_name": opp.company_name,
                "role_title": opp.role_title,
                "package_lpa": opp.package_lpa,
                "location": opp.location,
                "job_type": opp.job_type,
                "min_cgpa": opp.min_cgpa,
                "eligible_departments": opp.eligible_departments,
                "max_backlogs": opp.max_backlogs,
                "deadline": opp.deadline,
                "description": opp.description,
                "announcement": opp.announcement,
                "is_active": opp.is_active,
                "is_eligible": eligible,
                "eligibility_reason": reason,
                "application_status": app_status_map.get(opp.id),
            }
        )
    return result

