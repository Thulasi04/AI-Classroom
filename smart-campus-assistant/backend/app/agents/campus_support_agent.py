from app.agents.state import CampusAgentState
from app.database.database import SessionLocal
from app.database.models import CampusService, SupportTicket
from app.middleware.guardrails import sanitize_output_pii
from app.services.llm_service import synthesize_grounded_response


def campus_support_node(state: CampusAgentState) -> dict:
    student_id = state.get("student_id")
    query = state.get("query", "")
    trace = list(state.get("agent_trace") or [])
    trace.append("Campus Support Agent")

    db = SessionLocal()
    try:
        services = db.query(CampusService).order_by(CampusService.category.asc()).all()
        tickets = (
            db.query(SupportTicket)
            .filter(SupportTicket.student_id == student_id)
            .order_by(SupportTicket.created_at.desc())
            .all()
            if student_id
            else []
        )

        svc_lines = [
            f"- [{s.category.upper()}] {s.name} ({s.status}): {s.location} | Timings: {s.timings} | "
            f"Contact: {s.contact_info} | Details: {s.details}"
            for s in services
        ]
        ticket_lines = [
            f"- {t.ticket_code}: {t.subject} [{t.status}, priority={t.priority}]"
            + (f" — Admin Reply: {t.admin_response}" if t.admin_response else "")
            for t in tickets
        ]

        grounded_context = (
            "Campus Facilities & Services Directory:\n"
            + ("\n".join(svc_lines) or "No campus services listed.")
            + "\n\nYour Support Tickets:\n"
            + ("\n".join(ticket_lines) or "No support tickets submitted.")
        )

        fallback_parts = ["**Campus Services & Support Directory**"]
        if svc_lines:
            fallback_parts.append("\n".join(svc_lines))
        if ticket_lines:
            fallback_parts.append("\n**Your Support Tickets:**\n" + "\n".join(ticket_lines))
        else:
            fallback_parts.append("\nYou have no open support tickets. Visit the Support Tickets page to create one.")
        fallback = "\n".join(fallback_parts)

        citations = [
            {
                "source_type": "sqlite",
                "title": "Campus Facilities & Support Tickets DB",
                "source": "SQLite campus_services & support_tickets",
                "snippet": f"{len(services)} facilities and {len(tickets)} personal support tickets",
            }
        ]

        system_prompt = (
            "You are the Smart Campus Support Agent. Answer questions about library, hostel, "
            "transport, canteen, medical facilities, and the student's support tickets using ONLY the facts below."
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
            "agent_used": "Campus Support Agent",
            "agent_trace": trace,
            "final_response": sanitize_output_pii(answer),
        }
    finally:
        db.close()

