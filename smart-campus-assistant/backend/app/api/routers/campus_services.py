from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.database.models import CampusService, User
from app.schemas.campus import CampusServiceResponse

router = APIRouter(prefix="/campus-services", tags=["Campus Services"])


@router.get("", response_model=list[CampusServiceResponse])
def list_campus_services(
    category: str | None = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CampusService)
    if category:
        query = query.filter(CampusService.category == category.strip().lower())
    return query.order_by(CampusService.category.asc(), CampusService.name.asc()).all()

