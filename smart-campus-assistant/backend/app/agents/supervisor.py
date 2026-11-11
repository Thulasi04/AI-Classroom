from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.state import CampusAgentState
from app.middleware.guardrails import check_input_guardrails
from app.services.llm_service import get_groq_llm


VALID_ROUTES = {
    "academic_rag",
    "student_info",
    "placement",
    "campus_support",
    "multimodal",
}

ROUTE_KEYWORDS = {
    "student_info": [
        "my attendance",
        "attendance",
        "my marks",
        "internal mark",
        "marks",
        "score",
        "cgpa",
        "timetable",
        "exam schedule",
        "upcoming exam",
        "my courses",
        "my profile",
        "register number",
        "advisor",
    ],
    "placement": [
        "placement",
        "company",
        "companies",
        "job",
        "internship",
        "package",
        "lpa",
        "eligible",
        "eligibility",
        "recruit",
        "application status",
        "drive",
        "career",
    ],
    "campus_support": [
        "library",
        "hostel",
        "transport",
        "bus",
        "shuttle",
        "canteen",
        "food",
        "dining",
        "medical",
        "health",
        "support ticket",
        "ticket",
        "wifi",
        "facility",
        "facilities",
        "campus service",
    ],
    "academic_rag": [
        "policy",
        "regulation",
        "rule",
        "syllabus",
        "handbook",
        "condonation",
        "grading scale",
        "curriculum",
        "document",
        "pdf",
        "notes",
        "circular",
        "hall ticket",
        "credit",
    ],
}


def _heuristic_route(query: str, has_attachment: bool) -> str:
    if has_attachment:
        return "multimodal"

    lowered = query.lower()
    scores = {route: 0 for route in ROUTE_KEYWORDS}
    for route, kws in ROUTE_KEYWORDS.items():
        for kw in kws:
            if kw in lowered:
                scores[route] += 2 if " " in kw else 1

    best_route = max(scores, key=lambda r: scores[r])
    if scores[best_route] > 0:
        return best_route
    return "academic_rag"


def _llm_classify_route(query: str, has_attachment: bool) -> str | None:
    if has_attachment:
        return "multimodal"
    llm = get_groq_llm(temperature=0.0, vision=False)
    if llm is None:
        return None

    prompt = (
        "Classify the university student's query into EXACTLY ONE of these agent routes:\n"
        "- student_info (personal attendance, internal marks, CGPA, exam timetable, personal profile)\n"
        "- academic_rag (university rules, syllabus, handbook, academic policies, uploaded PDFs/notes)\n"
        "- placement (company drives, job eligibility, packages, placement applications)\n"
        "- campus_support (library, hostel, transport, canteen, medical center, support tickets)\n\n"
        "Respond with ONLY the route identifier word and nothing else."
    )
    try:
        resp = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=query)])
        candidate = (resp.content or "").strip().lower().split()[0].strip(".,:;\"'`")
        if candidate in VALID_ROUTES:
            return candidate
    except Exception:
        return None
    return None


def supervisor_node(state: CampusAgentState) -> dict:
    query = state.get("query", "")
    role = state.get("role", "student")
    reg_no = state.get("register_number")
    has_attachment = bool(state.get("attachment"))
    trace = list(state.get("agent_trace") or [])
    trace.append("Supervisor Agent")

    guard = check_input_guardrails(query, user_role=role, own_register_number=reg_no)
    if not guard.allowed:
        return {
            "route": "blocked",
            "guardrail_blocked": True,
            "guardrail_reason": guard.reason,
            "agent_used": "Guardrail Shield",
            "agent_trace": trace,
            "citations": [],
            "final_response": guard.reason,
        }

    route = _llm_classify_route(query, has_attachment) or _heuristic_route(query, has_attachment)
    return {
        "route": route,
        "guardrail_blocked": False,
        "guardrail_reason": "",
        "agent_trace": trace,
    }

