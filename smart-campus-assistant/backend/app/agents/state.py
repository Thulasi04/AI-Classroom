from typing import Any, TypedDict


class CampusAgentState(TypedDict, total=False):
    user_id: int
    student_id: int | None
    role: str
    register_number: str | None
    department: str | None
    semester: int | None
    full_name: str

    query: str
    conversation_id: int
    conversation_history: list[dict[str, Any]]
    attachment: dict[str, Any] | None

    route: str
    guardrail_blocked: bool
    guardrail_reason: str

    extracted_attachment_text: str
    needs_rag_followup: bool

    retrieved_context: str
    citations: list[dict[str, Any]]
    agent_used: str
    agent_trace: list[str]

    final_response: str
    error: str | None

