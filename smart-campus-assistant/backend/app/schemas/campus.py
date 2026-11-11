from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class PlacementCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=150)
    role_title: str = Field(min_length=2, max_length=150)
    package_lpa: float = Field(gt=0)
    location: str = Field(min_length=2, max_length=120)
    job_type: str = Field(default="Full-Time", max_length=50)
    min_cgpa: float = Field(ge=0, le=10, default=6.5)
    eligible_departments: str = Field(min_length=2)
    max_backlogs: int = Field(ge=0, default=0)
    deadline: date
    description: str = ""
    announcement: str | None = None


class PlacementResponse(BaseModel):
    id: int
    company_name: str
    role_title: str
    package_lpa: float
    location: str
    job_type: str
    min_cgpa: float
    eligible_departments: str
    max_backlogs: int
    deadline: date
    description: str
    announcement: str | None
    is_active: bool
    is_eligible: bool = True
    eligibility_reason: str | None = None
    application_status: str | None = None


class PlacementApplicationResponse(BaseModel):
    id: int
    student_id: int
    opportunity_id: int
    company_name: str
    role_title: str
    status: str
    applied_at: datetime
    student_name: str | None = None
    register_number: str | None = None


class PlacementApplicationStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Applied|Shortlisted|Interview Scheduled|Selected|Rejected)$")


class CampusServiceCreate(BaseModel):
    category: str = Field(pattern="^(library|hostel|transport|canteen|medical|sports)$")
    name: str = Field(min_length=2, max_length=150)
    location: str = Field(min_length=2, max_length=150)
    timings: str = Field(min_length=2, max_length=150)
    contact_info: str = Field(min_length=2, max_length=150)
    status: str = Field(default="Operational", pattern="^(Operational|Limited|Closed)$")
    details: str = ""


class CampusServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    name: str
    location: str
    timings: str
    contact_info: str
    status: str
    details: str
    updated_at: datetime


class SupportTicketCreate(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    subject: str = Field(min_length=4, max_length=200)
    description: str = Field(min_length=10, max_length=3000)
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")


class SupportTicketAdminUpdate(BaseModel):
    status: str = Field(pattern="^(open|in_progress|resolved|closed)$")
    admin_response: str | None = None


class SupportTicketResponse(BaseModel):
    id: int
    ticket_code: str
    student_id: int
    category: str
    subject: str
    description: str
    priority: str
    status: str
    admin_response: str | None
    created_at: datetime
    updated_at: datetime
    student_name: str | None = None
    register_number: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uploaded_by_user_id: int
    title: str
    filename: str
    file_type: str
    file_size: int
    category: str
    visibility: str
    is_indexed: bool
    chunk_count: int
    extracted_summary: str | None
    created_at: datetime


class NotificationCreate(BaseModel):
    user_id: int | None = None
    title: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=2000)
    category: str = Field(default="academic", max_length=40)


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

