from functools import lru_cache
from langgraph.graph import END, START, StateGraph

from app.agents.academic_agent import academic_rag_node
from app.agents.campus_support_agent import campus_support_node
from app.agents.multimodal_agent import multimodal_node
from app.agents.placement_agent import placement_node
from app.agents.state import CampusAgentState
from app.agents.student_agent import student_info_node
from app.agents.supervisor import supervisor_node


def _route_from_supervisor(state: CampusAgentState) -> str:
    if state.get("guardrail_blocked"):
        return "blocked"
    route = state.get("route", "academic_rag")
    if route in {"multimodal", "academic_rag", "student_info", "placement", "campus_support"}:
        return route
    return "academic_rag"


def _route_after_multimodal(state: CampusAgentState) -> str:
    if state.get("needs_rag_followup"):
        return "academic_rag"
    return "done"


@lru_cache
def get_campus_graph():
    workflow = StateGraph(CampusAgentState)

    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("academic_agent", academic_rag_node)
    workflow.add_node("student_agent", student_info_node)
    workflow.add_node("placement_agent", placement_node)
    workflow.add_node("campus_support_agent", campus_support_node)
    workflow.add_node("multimodal_agent", multimodal_node)

    workflow.add_edge(START, "supervisor")

    workflow.add_conditional_edges(
        "supervisor",
        _route_from_supervisor,
        {
            "academic_rag": "academic_agent",
            "student_info": "student_agent",
            "placement": "placement_agent",
            "campus_support": "campus_support_agent",
            "multimodal": "multimodal_agent",
            "blocked": END,
        },
    )

    workflow.add_conditional_edges(
        "multimodal_agent",
        _route_after_multimodal,
        {
            "academic_rag": "academic_agent",
            "done": END,
        },
    )

    workflow.add_edge("academic_agent", END)
    workflow.add_edge("student_agent", END)
    workflow.add_edge("placement_agent", END)
    workflow.add_edge("campus_support_agent", END)

    return workflow.compile()

