from typing import Any
from app.rag.vector_store import get_vector_store


def retrieve_relevant_chunks(
    query: str,
    *,
    user_id: int,
    is_admin: bool = False,
    top_k: int = 5,
    document_id: int | None = None,
    min_score: float = 0.05,
) -> list[dict[str, Any]]:
    store = get_vector_store()
    matches = store.similarity_search(
        query,
        user_id=user_id,
        is_admin=is_admin,
        top_k=top_k,
        document_id=document_id,
    )
    return [m for m in matches if m.get("score", 0.0) >= min_score]

