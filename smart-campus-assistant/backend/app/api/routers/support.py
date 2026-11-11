import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_db
from app.database.models import StudentProfile, SupportTicket
from app.schemas.campus import SupportTicketCreate, SupportTicketResponse

router = APIRouter(prefix="/support", tags=["Support Tickets"])


@router.get("/tickets", response_model=list[SupportTicketResponse])
def list_my_tickets(
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.student_id == student.id)
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
        )
        for t in tickets
    ]


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: SupportTicketCreate,
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    code = f"TKT-{uuid.uuid4().hex[:6].upper()}"
    ticket = SupportTicket(
        ticket_code=code,
        student_id=student.id,
        category=payload.category.strip(),
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        priority=payload.priority,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
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
    )


@router.get("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def get_ticket(
    ticket_id: int,
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket or ticket.student_id != student.id:
        raise HTTPException(status_code=404, detail="Support ticket not found")
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
    )

