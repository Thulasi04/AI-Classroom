import base64
from pathlib import Path
from typing import Any
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import get_settings


def get_groq_llm(temperature: float = 0.2, vision: bool = False) -> ChatGroq | None:
    settings = get_settings()
    if not settings.has_valid_groq_key:
        return None
    model = settings.GROQ_VISION_MODEL if vision else settings.GROQ_MODEL
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=model,
        temperature=temperature,
    )


def format_history_messages(history: list[dict[str, Any]], limit: int = 8) -> list[HumanMessage | AIMessage]:
    msgs: list[HumanMessage | AIMessage] = []
    for item in history[-limit:]:
        content = (item.get("content") or "").strip()
        if not content:
            continue
        if item.get("sender") == "user":
            msgs.append(HumanMessage(content=content))
        else:
            msgs.append(AIMessage(content=content))
    return msgs


def synthesize_grounded_response(
    *,
    system_prompt: str,
    user_query: str,
    grounded_context: str,
    history: list[dict[str, Any]] | None = None,
    fallback_summary: str,
) -> str:
    """Invoke Groq LLM with retrieved context; return honest structured fallback if key is unset."""
    llm = get_groq_llm(temperature=0.15, vision=False)
    if llm is None:
        return fallback_summary

    messages: list[Any] = [SystemMessage(content=system_prompt)]
    if history:
        messages.extend(format_history_messages(history))
    messages.append(
        HumanMessage(
            content=(
                f"Student Question:\n{user_query}\n\n"
                f"Verified Grounded Context (use ONLY these facts and never invent sources or numbers):\n"
                f"{grounded_context}"
            )
        )
    )

    try:
        response = llm.invoke(messages)
        text = (response.content or "").strip()
        return text or fallback_summary
    except Exception as exc:
        return (
            f"{fallback_summary}\n\n"
            f"[Note: Groq LLM synthesis encountered an error ({type(exc).__name__}); "
            "showing verified grounded records retrieved directly from campus storage.]"
        )


def analyze_image_with_groq_vision(
    *,
    image_path: Path,
    mime_ext: str,
    user_query: str,
) -> str | None:
    """Analyze an uploaded image using Groq Vision if GROQ_API_KEY is configured."""
    llm = get_groq_llm(temperature=0.1, vision=True)
    if llm is None or not image_path.exists():
        return None

    b64_img = base64.b64encode(image_path.read_bytes()).decode("utf-8")
    mime = "jpeg" if mime_ext in {"jpg", "jpeg"} else mime_ext

    msg = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    "You are the Smart Campus Multimodal Assistant. "
                    "Describe and extract all visible text, tables, formulas, or schedule details "
                    "from this campus image accurately, and answer the student's question:\n"
                    f"{user_query}"
                ),
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/{mime};base64,{b64_img}"},
            },
        ]
    )

    try:
        res = llm.invoke([msg])
        return (res.content or "").strip() or None
    except Exception:
        return None

