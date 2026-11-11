from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    department: str
    semester: int
    credits: int
    faculty_name: str
    faculty_email: str | None
    description: str
    announcement: str | None


class CourseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=150)
    department: str = Field(min_length=2, max_length=120)
    semester: int = Field(ge=1, le=8)
    credits: int = Field(ge=1, le=10, default=4)
    faculty_name: str = Field(min_length=2, max_length=120)
    faculty_email: str | None = Field(default=None, max_length=255)
    description: str = ""
    announcement: str | None = None


class AttendanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    status: str = Field(pattern="^(present|absent|late)$")
    remarks: str | None = Field(default=None, max_length=255)


class AttendanceHistoryItem(BaseModel):
    id: int
    date: date
    course_id: int
    course_code: str
    course_name: str
    status: str
    remarks: str | None


class CourseAttendanceSummary(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    faculty_name: str
    total_classes: int
    attended_classes: int
    absent_count: int
    percentage: float


class OverallAttendanceSummary(BaseModel):
    total_classes: int
    present_count: int
    late_count: int
    absent_count: int
    percentage: float


class AttendanceMeResponse(BaseModel):
    overall: OverallAttendanceSummary
    by_course: list[CourseAttendanceSummary]
    history: list[AttendanceHistoryItem]


class InternalMarkCreate(BaseModel):
    student_id: int
    course_id: int
    assessment_name: str = Field(min_length=2, max_length=100)
    marks_obtained: float = Field(ge=0)
    max_marks: float = Field(gt=0, default=25.0)
    grade: str = Field(default="A", max_length=10)
    remarks: str | None = None


class MarkRecordItem(BaseModel):
    id: int
    course_id: int
    course_code: str
    course_name: str
    assessment_name: str
    marks_obtained: float
    max_marks: float
    grade: str
    remarks: str | None
    recorded_at: datetime


class AssessmentComponent(BaseModel):
    assessment_name: str
    marks_obtained: float
    max_marks: float
    grade: str


class CourseMarksSummary(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    assessments: list[AssessmentComponent]
    total_obtained: float
    total_max: float
    percentage: float
    grade: str


class MarksMeResponse(BaseModel):
    overall_average_percentage: float
    by_course: list[CourseMarksSummary]
    records: list[MarkRecordItem]


class TimetableCreate(BaseModel):
    course_id: int
    exam_type: str = Field(min_length=2, max_length=60)
    exam_date: date
    start_time: str = Field(min_length=2, max_length=30)
    end_time: str = Field(min_length=2, max_length=30)
    room: str = Field(min_length=2, max_length=80)
    department: str = Field(min_length=2, max_length=120)
    semester: int = Field(ge=1, le=8)
    announcement: str | None = None


class TimetableResponse(BaseModel):
    id: int
    course_id: int
    course_code: str
    course_name: str
    exam_type: str
    exam_date: date
    start_time: str
    end_time: str
    room: str
    department: str
    semester: int
    announcement: str | None

