from datetime import date
from app.agents.state import CampusAgentState
from app.database.database import SessionLocal
from app.database.models import Course, StudentProfile, Timetable
from app.middleware.guardrails import sanitize_output_pii
from app.services.academic_service import compute_student_attendance, compute_student_marks
from app.services.llm_service import synthesize_grounded_response


def student_info_node(state: CampusAgentState) -> dict:
    student_id = state.get("student_id")
    query = state.get("query", "")
    trace = list(state.get("agent_trace") or [])
    trace.append("Student Info Agent")

    if not student_id:
        return {
            "agent_used": "Student Information Agent",
            "agent_trace": trace,
            "citations": [],
            "final_response": (
                "Your account is an Administrator account without an enrolled student profile. "
                "Use the Admin Console to inspect campus-wide student records."
            ),
        }

    db = SessionLocal()
    try:
        profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if not profile:
            return {
                "agent_used": "Student Information Agent",
                "agent_trace": trace,
                "citations": [],
                "final_response": "No student profile found for your authenticated session.",
            }

        att = compute_student_attendance(db, student_id)
        marks = compute_student_marks(db, student_id)
        courses = (
            db.query(Course)
            .filter(
                Course.department == profile.department,
                Course.semester == profile.semester,
            )
            .order_by(Course.code.asc())
            .all()
        )
        exams = (
            db.query(Timetable, Course)
            .join(Course, Timetable.course_id == Course.id)
            .filter(
                Timetable.department == profile.department,
                Timetable.semester == profile.semester,
                Timetable.exam_date >= date.today(),
            )
            .order_by(Timetable.exam_date.asc())
            .all()
        )

        att_lines = [
            f"- {c['course_code']} ({c['course_name']}): {c['attended_classes']}/{c['total_classes']} ({c['percentage']}%)"
            for c in att["by_course"]
        ]
        marks_lines = [
            f"- {c['course_code']} ({c['course_name']}): {c['total_obtained']}/{c['total_max']} ({c['percentage']}%, Grade {c['grade']})"
            for c in marks["by_course"]
        ]
        exam_lines = [
            f"- {course.code} {course.name} | {tt.exam_type} | {tt.exam_date} | {tt.start_time}-{tt.end_time} | {tt.room}"
            for tt, course in exams
        ]
        course_lines = [
            f"- {c.code}: {c.name} (Faculty: {c.faculty_name}, Credits: {c.credits})"
            for c in courses
        ]

        grounded_context = (
            f"Authenticated Student Profile:\n"
            f"Name: {state.get('full_name')} | Reg No: {profile.register_number} | "
            f"Dept: {profile.department} | Semester: {profile.semester} | CGPA: {profile.cgpa:.2f} | "
            f"Advisor: {profile.advisor_name}\n\n"
            f"Attendance Summary (Overall {att['overall']['percentage']}%, "
            f"{att['overall']['present_count'] + att['overall']['late_count']}/{att['overall']['total_classes']} classes):\n"
            + ("\n".join(att_lines) or "No attendance records.")
            + f"\n\nInternal Marks (Overall Average {marks['overall_average_percentage']}%):\n"
            + ("\n".join(marks_lines) or "No internal marks recorded.")
            + "\n\nUpcoming Exam Timetable:\n"
            + ("\n".join(exam_lines) or "No upcoming exams scheduled.")
            + "\n\nRegistered Courses:\n"
            + ("\n".join(course_lines) or "No courses found.")
        )

        low_att = [c for c in att["by_course"] if c["percentage"] < 75.0]
        fallback_parts = [
            f"**Student Record ({profile.register_number} — {profile.department}, Sem {profile.semester}, CGPA {profile.cgpa:.2f})**",
            f"• **Overall Attendance:** {att['overall']['percentage']}% ({att['overall']['present_count'] + att['overall']['late_count']}/{att['overall']['total_classes']} sessions)",
        ]
        if low_att:
            low_str = ", ".join(f"{c['course_code']} ({c['percentage']}%)" for c in low_att)
            fallback_parts.append(f"• **Attendance Alert (<75%):** {low_str}")
        if att_lines:
            fallback_parts.append("\n**Subject-wise Attendance:**\n" + "\n".join(att_lines))
        if marks_lines:
            fallback_parts.append(
                f"\n**Internal Marks (Average {marks['overall_average_percentage']}%):**\n"
                + "\n".join(marks_lines)
            )
        if exam_lines:
            fallback_parts.append("\n**Upcoming Examinations:**\n" + "\n".join(exam_lines))
        fallback = "\n".join(fallback_parts)

        citations = [
            {
                "source_type": "sqlite",
                "title": "Student Attendance Ledger",
                "source": f"SQLite attendance ({profile.register_number})",
                "snippet": f"Overall {att['overall']['percentage']}% across {len(att['by_course'])} courses",
            },
            {
                "source_type": "sqlite",
                "title": "Internal Marks & Exam Timetable",
                "source": f"SQLite internal_marks & timetable ({profile.register_number})",
                "snippet": f"Marks avg {marks['overall_average_percentage']}%, {len(exams)} upcoming exams",
            },
        ]

        system_prompt = (
            "You are the Smart Campus Student Information Agent. Answer the authenticated student's "
            "question strictly using their verified SQLite academic records provided below. "
            "Highlight any subject below 75% attendance as a helpful warning."
        )
        answer = synthesize_grounded_response(
            system_prompt=system_prompt,
            user_query=query,
            grounded_context=grounded_context,
            history=state.get("conversation_history"),
            fallback_summary=fallback,
        )

        return {
            "retrieved_context": grounded_context,
            "citations": citations,
            "agent_used": "Student Information Agent",
            "agent_trace": trace,
            "final_response": sanitize_output_pii(answer),
        }
    finally:
        db.close()

