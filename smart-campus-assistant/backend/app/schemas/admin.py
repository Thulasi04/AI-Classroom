from pydantic import BaseModel


class AdminOverviewResponse(BaseModel):
    total_students: int
    total_courses: int
    average_attendance_percentage: float
    open_tickets: int
    active_placements: int
    total_documents: int
    total_conversations: int


class AdminStudentRow(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    register_number: str
    department: str
    semester: int
    section: str
    cgpa: float
    advisor_name: str

