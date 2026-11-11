from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    portal: str | None = Field(default=None, pattern="^(student|admin)$")


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    register_number: str = Field(min_length=4, max_length=40)
    department: str = Field(min_length=2, max_length=120)
    semester: int = Field(ge=1, le=8)
    section: str = Field(default="A", max_length=10)
    batch_year: str = Field(default="2022-2026", max_length=20)
    phone: str | None = Field(default=None, max_length=30)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    register_number: str
    department: str
    semester: int
    section: str
    batch_year: str
    cgpa: float
    phone: str | None
    hostel_resident: bool
    advisor_name: str


class StudentProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    hostel_resident: bool | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    student_profile: StudentProfileResponse | None = None


class MeResponse(BaseModel):
    user: UserResponse
    student_profile: StudentProfileResponse | None = None

