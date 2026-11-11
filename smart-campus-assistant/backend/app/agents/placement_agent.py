from app.agents.state import CampusAgentState
from app.database.database import SessionLocal
from app.database.models import StudentProfile
from app.middleware.guardrails import sanitize_output_pii
from app.services.academic_service import list_placements_for_student
from app.services.llm_service import synthesize_grounded_response


def placement_node(state: CampusAgentState) -> dict:
    student_id = state.get("student_id")
    query = state.get("query", "")
    trace = list(state.get("agent_trace") or [])
    trace.append("Placement Agent")

    db = SessionLocal()
    try:
        student = (
            db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
            if student_id
            else None
        )
        opps = list_placements_for_student(db, student)

        if not opps:
            return {
                "agent_used": "Placement Agent",
                "agent_trace": trace,
                "citations": [],
                "final_response": "There are currently no active campus placement drives.",
            }

        lines = []
        for o in opps:
            elig_text = "Eligible" if o["is_eligible"] else f"Not Eligible ({o['eligibility_reason']})"
            app_text = f" | Application: {o['application_status']}" if o["application_status"] else ""
            ann_text = f" | Note: {o['announcement']}" if o["announcement"] else ""
            lines.append(
                f"- {o['company_name']} — {o['role_title']} ({o['package_lpa']} LPA, {o['location']}, "
                f"Min CGPA {o['min_cgpa']}, Deadline {o['deadline']}) -> {elig_text}{app_text}{ann_text}"
            )

        profile_header = (
            f"Student CGPA: {student.cgpa:.2f} | Department: {student.department}"
            if student
            else "Viewing all active placement drives"
        )
        grounded_context = f"{profile_header}\n\nActive Placement Drives:\n" + "\n".join(lines)

        eligible_count = sum(1 for o in opps if o["is_eligible"])
        fallback = (
            f"**Campus Placement Opportunities ({eligible_count}/{len(opps)} eligible for your profile)**\n"
            + f"{profile_header}\n\n"
            + "\n".join(lines)
        )

        citations = [
            {
                "source_type": "sqlite",
                "title": "Placement Opportunities & Eligibility DB",
                "source": "SQLite placement_opportunities & placement_applications",
                "snippet": f"{len(opps)} active drives evaluated against student profile",
            }
        ]

        system_prompt = (
            "You are the Smart Campus Placement Agent. Answer the student's question accurately "
            "using ONLY the placement drives, eligibility evaluation, deadlines, and application statuses below."
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
            "agent_used": "Placement Agent",
            "agent_trace": trace,
            "final_response": sanitize_output_pii(answer),
        }
    finally:
        db.close()

