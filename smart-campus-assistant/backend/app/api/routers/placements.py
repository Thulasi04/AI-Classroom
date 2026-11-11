from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student, get_current_user, get_db
from app.database.models import PlacementApplication, PlacementOpportunity, StudentProfile, User
from app.schemas.campus import PlacementApplicationResponse, PlacementResponse
from app.services.academic_service import evaluate_placement_eligibility, list_placements_for_student

router = APIRouter(prefix="/placements", tags=["Placements"])


@router.get("", response_model=list[PlacementResponse])
def get_placements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    return list_placements_for_student(db, student)


@router.get("/applications/me", response_model=list[PlacementApplicationResponse])
def get_my_applications(
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(PlacementApplication, PlacementOpportunity)
        .join(PlacementOpportunity, PlacementApplication.opportunity_id == PlacementOpportunity.id)
        .filter(PlacementApplication.student_id == student.id)
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
        )
        for app, opp in rows
    ]


@router.post("/{opportunity_id}/apply", response_model=PlacementApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_opportunity(
    opportunity_id: int,
    student: StudentProfile = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    opp = (
        db.query(PlacementOpportunity)
        .filter(PlacementOpportunity.id == opportunity_id, PlacementOpportunity.is_active.is_(True))
        .first()
    )
    if not opp:
        raise HTTPException(status_code=404, detail="Placement opportunity not found")

    eligible, reason = evaluate_placement_eligibility(student, opp)
    if not eligible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not eligible for {opp.company_name}: {reason}",
        )

    existing = (
        db.query(PlacementApplication)
        .filter(
            PlacementApplication.student_id == student.id,
            PlacementApplication.opportunity_id == opp.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this drive.")

    app = PlacementApplication(
        student_id=student.id,
        opportunity_id=opp.id,
        status="Applied",
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    return PlacementApplicationResponse(
        id=app.id,
        student_id=app.student_id,
        opportunity_id=app.opportunity_id,
        company_name=opp.company_name,
        role_title=opp.role_title,
        status=app.status,
        applied_at=app.applied_at,
    )

