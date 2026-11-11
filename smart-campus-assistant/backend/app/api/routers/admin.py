from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.routers.documents import ingest_document_record
from app.core.config import get_settings
from app.core.dependencies import get_db, require_admin
from app.database.models import (
    Attendance,
    CampusService,
    ChatConversation,
    Course,
    Document,
    InternalMark,
    Notification,
    PlacementApplication,
    PlacementOpportunity,
    StudentProfile,
    SupportTicket,
    Timetable,
    User,
)
from app.rag.document_processor import save_and_validate_upload
from app.rag.vector_store import get_vector_store
from app.schemas.academic import (
    AttendanceCreate,
    CourseCreate,
    CourseResponse,
    InternalMarkCreate,
    TimetableCreate,
    TimetableResponse,
)
from app.schemas.admin import AdminOverviewResponse, AdminStudentRow
from app.schemas.campus import (
    CampusServiceCreate,
    CampusServiceResponse,
    DocumentResponse,
    NotificationCreate,
    NotificationResponse,
    PlacementApplicationResponse,
    PlacementApplicationStatusUpdate,
    PlacementCreate,
    PlacementResponse,
    SupportTicketAdminUpdate,
    SupportTicketResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/overview", response_model=AdminOverviewResponse)
def get_admin_overview(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_students = db.query(StudentProfile).count()
    total_courses = db.query(Course).count()
    all_att = db.query(Attendance).all()
    if all_att:
        attended = sum(1 for a in all_att if a.status in {"present", "late"})
        avg_att = round((attended / len(all_att)) * 100, 1)
    else:
        avg_att = 0.0

    open_tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.status.in_(["open", "in_progress"]))
        .count()
    )
    active_placements = (
        db.query(PlacementOpportunity).filter(PlacementOpportunity.is_active.is_(True)).count()
    )
    total_documents = db.query(Document).count()
    total_conversations = db.query(ChatConversation).count()

    return AdminOverviewResponse(
        total_students=total_students,
        total_courses=total_courses,
        average_attendance_percentage=avg_att,
        open_tickets=open_tickets,
        active_placements=active_placements,
        total_documents=total_documents,
        total_conversations=total_conversations,
    )


@router.get("/students", response_model=list[AdminStudentRow])
def list_all_students(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(StudentProfile, User)
        .join(User, StudentProfile.user_id == User.id)
        .order_by(StudentProfile.register_number.asc())
        .all()
    )
    return [
        AdminStudentRow(
            id=sp.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            register_number=sp.register_number,
            department=sp.department,
            semester=sp.semester,
            section=sp.section,
            cgpa=sp.cgpa,
            advisor_name=sp.advisor_name,
        )
        for sp, u in rows
    ]


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    code_norm = payload.code.strip().upper()
    if db.query(Course).filter(Course.code == code_norm).first():
        raise HTTPException(status_code=400, detail=f"Course code '{code_norm}' already exists")
    course = Course(**payload.model_dump(exclude={"code"}), code=code_norm)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}")
def delete_course(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


@router.post("/attendance", status_code=status.HTTP_201_CREATED)
def record_attendance(
    payload: AttendanceCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not db.query(StudentProfile).filter(StudentProfile.id == payload.student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")
    if not db.query(Course).filter(Course.id == payload.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")

    record = Attendance(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "message": "Attendance recorded"}


@router.post("/marks", status_code=status.HTTP_201_CREATED)
def upsert_internal_mark(
    payload: InternalMarkCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.marks_obtained > payload.max_marks:
        raise HTTPException(status_code=400, detail="Marks obtained cannot exceed max marks")
    if not db.query(StudentProfile).filter(StudentProfile.id == payload.student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")
    if not db.query(Course).filter(Course.id == payload.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")

    existing = (
        db.query(InternalMark)
        .filter(
            InternalMark.student_id == payload.student_id,
            InternalMark.course_id == payload.course_id,
            InternalMark.assessment_name == payload.assessment_name,
        )
        .first()
    )
    if existing:
        existing.marks_obtained = payload.marks_obtained
        existing.max_marks = payload.max_marks
        existing.grade = payload.grade
        existing.remarks = payload.remarks
        db.commit()
        return {"id": existing.id, "message": "Internal mark updated"}

    mark = InternalMark(**payload.model_dump())
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return {"id": mark.id, "message": "Internal mark created"}


@router.post("/timetable", response_model=TimetableResponse, status_code=status.HTTP_201_CREATED)
def create_timetable_entry(
    payload: TimetableCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    tt = Timetable(**payload.model_dump())
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return TimetableResponse(
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


@router.delete("/timetable/{entry_id}")
def delete_timetable_entry(
    entry_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(Timetable).filter(Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Timetable entry deleted"}


@router.post("/placements", response_model=PlacementResponse, status_code=status.HTTP_201_CREATED)
def create_placement(
    payload: PlacementCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    opp = PlacementOpportunity(**payload.model_dump(), is_active=True)
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return PlacementResponse(
        id=opp.id,
        company_name=opp.company_name,
        role_title=opp.role_title,
        package_lpa=opp.package_lpa,
        location=opp.location,
        job_type=opp.job_type,
        min_cgpa=opp.min_cgpa,
        eligible_departments=opp.eligible_departments,
        max_backlogs=opp.max_backlogs,
        deadline=opp.deadline,
        description=opp.description,
        announcement=opp.announcement,
        is_active=opp.is_active,
        is_eligible=True,
    )


@router.get("/placements/applications", response_model=list[PlacementApplicationResponse])
def list_all_placement_applications(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(PlacementApplication, PlacementOpportunity, StudentProfile, User)
        .join(PlacementOpportunity, PlacementApplication.opportunity_id == PlacementOpportunity.id)
        .join(StudentProfile, PlacementApplication.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .order_by(PlacementApplication.applied_at.desc())
        .all()
    )
    return [
        PlacementApplicationResponse(
            id=app.id,
            student_id=app.student_id,
            opportunity_id=app.opportunity_id,
            company_name=opp.company_name,
            role_title=opp.role_title,
            status=app.status,
            applied_at=app.applied_at,
            student_name=u.full_name,
            register_number=sp.register_number,
        )
        for app, opp, sp, u in rows
    ]


@router.patch("/placements/applications/{app_id}", response_model=PlacementApplicationResponse)
def update_placement_application(
    app_id: int,
    payload: PlacementApplicationStatusUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    app = db.query(PlacementApplication).filter(PlacementApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = payload.status
    db.commit()
    db.refresh(app)
    opp = db.query(PlacementOpportunity).filter(PlacementOpportunity.id == app.opportunity_id).first()
    sp = db.query(StudentProfile).filter(StudentProfile.id == app.student_id).first()
    u = db.query(User).filter(User.id == sp.user_id).first() if sp else None
    return PlacementApplicationResponse(
        id=app.id,
        student_id=app.student_id,
        opportunity_id=app.opportunity_id,
        company_name=opp.company_name if opp else "",
        role_title=opp.role_title if opp else "",
        status=app.status,
        applied_at=app.applied_at,
        student_name=u.full_name if u else None,
        register_number=sp.register_number if sp else None,
    )


@router.get("/tickets", response_model=list[SupportTicketResponse])
def list_all_tickets(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SupportTicket, StudentProfile, User)
        .join(StudentProfile, SupportTicket.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [
        SupportTicketResponse(
            id=t.id,
            ticket_code=t.ticket_code,
            student_id=t.student_id,
            category=t.category,
            subject=t.subject,
            description=t.description,
            priority=t.priority,
            status=t.status,
            admin_response=t.admin_response,
            created_at=t.created_at,
            updated_at=t.updated_at,
            student_name=u.full_name,
            register_number=sp.register_number,
        )
        for t, sp, u in rows
    ]


@router.patch("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def update_support_ticket(
    ticket_id: int,
    payload: SupportTicketAdminUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = payload.status
    if payload.admin_response is not None:
        ticket.admin_response = payload.admin_response.strip() or None
    db.commit()
    db.refresh(ticket)

    sp = db.query(StudentProfile).filter(StudentProfile.id == ticket.student_id).first()
    u = db.query(User).filter(User.id == sp.user_id).first() if sp else None
    return SupportTicketResponse(
        id=ticket.id,
        ticket_code=ticket.ticket_code,
        student_id=ticket.student_id,
        category=ticket.category,
        subject=ticket.subject,
        description=ticket.description,
        priority=ticket.priority,
        status=ticket.status,
        admin_response=ticket.admin_response,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        student_name=u.full_name if u else None,
        register_number=sp.register_number if sp else None,
    )


@router.post("/campus-services", response_model=CampusServiceResponse, status_code=status.HTTP_201_CREATED)
def create_campus_service(
    payload: CampusServiceCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    svc = CampusService(**payload.model_dump())
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.get("/documents", response_model=list[DocumentResponse])
def list_all_documents(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Document).order_by(Document.created_at.desc()).all()


@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_public_document(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    category: str = Form(default="handbook"),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    original_name, stored_filename, ext, total_size, content = await save_and_validate_upload(file)
    return ingest_document_record(
        db=db,
        user=admin_user,
        original_name=original_name,
        stored_filename=stored_filename,
        ext=ext,
        total_size=total_size,
        content=content,
        title=title,
        category=category,
        visibility="public",
    )


@router.delete("/documents/{doc_id}")
def delete_any_document(
    doc_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    settings = get_settings()
    file_path = (settings.UPLOAD_DIR / doc.stored_filename).resolve()
    if settings.UPLOAD_DIR.resolve() in file_path.parents and file_path.exists():
        file_path.unlink(missing_ok=True)
    get_vector_store().delete_document_vectors(doc.id)
    db.delete(doc)
    db.commit()
    return {"message": "Document removed"}


@router.post("/notifications", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notif = Notification(**payload.model_dump(), is_read=False)
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

