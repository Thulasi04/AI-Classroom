from datetime import datetime, timezone
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database.models import Notification, RefreshToken, StudentProfile, User
from app.middleware.rate_limit import rate_limit_auth
from app.schemas.auth import AuthResponse, LoginRequest, MeResponse, RegisterRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )


def _issue_session(db: Session, response: Response, user: User) -> AuthResponse:
    access_token = create_access_token(user.id, user.role)
    refresh_token, jti, expires_at = create_refresh_token(user.id, user.role)
    db.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at))
    db.commit()

    _set_refresh_cookie(response, refresh_token)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    return AuthResponse(
        access_token=access_token,
        user=user,
        student_profile=profile,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_student(
    payload: RegisterRequest,
    response: Response,
    _: None = Depends(rate_limit_auth),
    db: Session = Depends(get_db),
):
    email_norm = payload.email.strip().lower()
    reg_norm = payload.register_number.strip().upper()

    if db.query(User).filter(User.email == email_norm).first():
        raise HTTPException(status_code=400, detail="Email address is already registered.")
    if db.query(StudentProfile).filter(StudentProfile.register_number == reg_norm).first():
        raise HTTPException(status_code=400, detail="Register number is already registered.")

    user = User(
        email=email_norm,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="student",
        is_active=True,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(
        user_id=user.id,
        register_number=reg_norm,
        department=payload.department.strip(),
        semester=payload.semester,
        section=payload.section.strip().upper() or "A",
        batch_year=payload.batch_year.strip(),
        cgpa=8.0,
        phone=payload.phone,
        hostel_resident=False,
        advisor_name="Dr. Kavitha Nair",
    )
    db.add(profile)
    db.add(
        Notification(
            user_id=user.id,
            title="Welcome to Smart Campus Assistant",
            message=f"Your student portal account ({reg_norm}) is ready.",
            category="academic",
            is_read=False,
        )
    )
    db.commit()
    db.refresh(user)

    return _issue_session(db, response, user)


@router.post("/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    response: Response,
    _: None = Depends(rate_limit_auth),
    db: Session = Depends(get_db),
):
    email_norm = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_norm).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    if payload.portal == "admin" and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required for Admin portal.",
        )

    return _issue_session(db, response, user)


@router.post("/refresh", response_model=AuthResponse)
def refresh_access_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
        )

    payload = decode_token(refresh_token, expected_type="refresh")
    jti = payload.get("jti")
    user_id = int(payload["sub"])

    stored = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not stored or stored.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked.",
        )

    now = datetime.now(timezone.utc)
    exp = stored.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired.",
        )

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    stored.revoked = True
    db.flush()
    return _issue_session(db, response, user)


@router.post("/logout")
def logout_user(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
            jti = payload.get("jti")
            if jti:
                stored = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
                if stored:
                    stored.revoked = True
                    db.commit()
        except HTTPException:
            pass

    response.delete_cookie(key="refresh_token", path="/api/auth")
    return {"message": "Logged out securely"}


@router.get("/me", response_model=MeResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    return MeResponse(user=current_user, student_profile=profile)

