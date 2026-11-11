from app.agents.state import CampusAgentState
from app.middleware.guardrails import sanitize_output_pii
from app.rag.retriever import retrieve_relevant_chunks
from app.services.llm_service import synthesize_grounded_response


def academic_rag_node(state: CampusAgentState) -> dict:
    query = state.get("query", "")
    user_id = state["user_id"]
    is_admin = state.get("role") == "admin"
    extra_ctx = (state.get("extracted_attachment_text") or "").strip()
    trace = list(state.get("agent_trace") or [])
    trace.append("Academic RAG Agent")

    search_query = f"{query}\n{extra_ctx[:500]}".strip() if extra_ctx else query
    matches = retrieve_relevant_chunks(
        search_query,
        user_id=user_id,
        is_admin=is_admin,
        top_k=5,
        min_score=0.05,
    )

    citations = list(state.get("citations") or [])
    context_blocks: list[str] = []
    if extra_ctx:
        context_blocks.append(f"[Attached Document Extract]\n{extra_ctx[:2000]}")

    for m in matches:
        citations.append(
            {
                "source_type": "rag",
                "title": m["title"],
                "source": m["filename"],
                "category": m["category"],
                "chunk_index": m["chunk_index"],
                "snippet": m["text"][:220],
                "score": m["score"],
            }
        )
        context_blocks.append(
            f"[Source: {m['title']} ({m['filename']}), Chunk #{m['chunk_index']}, Score: {m['score']}]\n"
            f"{m['text']}"
        )

    if not context_blocks:
        answer = (
            "I could not find relevant passages in your accessible university documents or "
            "uploaded files to answer that question. Please upload the relevant syllabus, "
            "handbook, or notes document on the Documents page and ask again."
        )
        return {
            "retrieved_context": "",
            "citations": citations,
            "agent_used": "Academic RAG Agent",
            "agent_trace": trace,
            "final_response": answer,
        }

    grounded_context = "\n\n---\n\n".join(context_blocks)
    fallback_lines = [
        "Based on the retrieved university knowledge base documents:",
        "",
    ]
    for m in matches[:3]:
        fallback_lines.append(f"• **{m['title']}** (Chunk #{m['chunk_index']}): {m['text']}")
    fallback = "\n".join(fallback_lines)

    system_prompt = (
        "You are the Smart Campus Academic RAG Agent. Answer the student's question accurately "
        "using ONLY the provided retrieved university document excerpts. Cite document titles in your answer, "
        "and clearly state if any requested detail is missing from the documents."
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
        "agent_used": "Academic RAG Agent",
        "agent_trace": trace,
        "final_response": sanitize_output_pii(answer),
    }

