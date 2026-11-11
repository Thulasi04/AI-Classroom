from pathlib import Path
from PIL import Image

from app.agents.state import CampusAgentState
from app.core.config import get_settings
from app.database.database import SessionLocal
from app.database.models import Document
from app.middleware.guardrails import sanitize_output_pii
from app.rag.document_processor import IMAGE_EXTENSIONS, extract_text_from_file
from app.rag.retriever import retrieve_relevant_chunks
from app.services.llm_service import analyze_image_with_groq_vision, synthesize_grounded_response


def multimodal_node(state: CampusAgentState) -> dict:
    attachment = state.get("attachment") or {}
    doc_id = attachment.get("document_id")
    query = state.get("query", "")
    user_id = state["user_id"]
    is_admin = state.get("role") == "admin"
    trace = list(state.get("agent_trace") or [])
    trace.append("Multimodal Agent")

    if not doc_id:
        return {
            "needs_rag_followup": False,
            "agent_used": "Multimodal Agent",
            "agent_trace": trace,
            "final_response": "No valid attachment was provided for multimodal processing.",
        }

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == int(doc_id)).first()
        if not doc:
            return {
                "needs_rag_followup": False,
                "agent_used": "Multimodal Agent",
                "agent_trace": trace,
                "final_response": "Attached document could not be found.",
            }

        if not is_admin and doc.visibility != "public" and doc.uploaded_by_user_id != user_id:
            return {
                "needs_rag_followup": False,
                "agent_used": "Multimodal Agent",
                "agent_trace": trace,
                "final_response": "Access denied: You do not have permission to access this attachment.",
            }

        settings = get_settings()
        file_path = (settings.UPLOAD_DIR / doc.stored_filename).resolve()
        if not file_path.exists():
            return {
                "needs_rag_followup": False,
                "agent_used": "Multimodal Agent",
                "agent_trace": trace,
                "final_response": "The attached file is missing from server storage.",
            }

        ext = doc.file_type.lower()
        citations = [
            {
                "source_type": "multimodal",
                "title": doc.title,
                "source": doc.filename,
                "category": doc.category,
                "snippet": doc.extracted_summary or f"{ext.upper()} attachment",
            }
        ]

        # Image path
        if ext in IMAGE_EXTENSIONS:
            with Image.open(file_path) as img:
                width, height = img.size
                fmt = img.format or ext.upper()

            vision_answer = analyze_image_with_groq_vision(
                image_path=file_path,
                mime_ext=ext,
                user_query=query,
            )
            if vision_answer:
                return {
                    "extracted_attachment_text": vision_answer,
                    "needs_rag_followup": False,
                    "citations": citations,
                    "agent_used": "Multimodal Agent",
                    "agent_trace": trace,
                    "final_response": sanitize_output_pii(vision_answer),
                }

            return {
                "extracted_attachment_text": f"Image {doc.filename} ({fmt}, {width}x{height}px)",
                "needs_rag_followup": False,
                "citations": citations,
                "agent_used": "Multimodal Agent",
                "agent_trace": trace,
                "final_response": (
                    f"Image '{doc.filename}' ({fmt}, {width}x{height}px) was verified and stored securely. "
                    "Visual content extraction requires a valid GROQ_API_KEY configured in backend/.env "
                    "for Groq Vision analysis; no fabricated image text was generated."
                ),
            }

        # Document path (PDF / TXT / MD / CSV)
        raw_bytes = file_path.read_bytes()
        extracted_text = extract_text_from_file(ext, raw_bytes, doc.filename)
        if not extracted_text:
            return {
                "extracted_attachment_text": "",
                "needs_rag_followup": False,
                "citations": citations,
                "agent_used": "Multimodal Agent",
                "agent_trace": trace,
                "final_response": (
                    f"The uploaded {ext.upper()} file '{doc.filename}' contains no extractable text "
                    "(e.g., scanned image-only PDF)."
                ),
            }

        # Retrieve top chunks scoped to this document
        doc_chunks = retrieve_relevant_chunks(
            query,
            user_id=user_id,
            is_admin=is_admin,
            top_k=4,
            document_id=doc.id,
            min_score=0.0,
        )
        for ch in doc_chunks:
            citations.append(
                {
                    "source_type": "rag",
                    "title": ch["title"],
                    "source": ch["filename"],
                    "category": ch["category"],
                    "chunk_index": ch["chunk_index"],
                    "snippet": ch["text"][:200],
                    "score": ch["score"],
                }
            )

        # Check if query also asks about university policy / regulations / syllabus comparison
        lowered = query.lower()
        needs_rag_followup = any(
            kw in lowered for kw in ["policy", "regulation", "handbook", "university rule", "compare"]
        )
        if needs_rag_followup:
            return {
                "extracted_attachment_text": extracted_text[:3000],
                "needs_rag_followup": True,
                "citations": citations,
                "agent_trace": trace,
            }

        context_text = (
            "\n\n".join(c["text"] for c in doc_chunks)
            if doc_chunks
            else extracted_text[:2500]
        )
        fallback = (
            f"**Extracted Content from '{doc.filename}':**\n\n{context_text[:1500]}"
        )
        answer = synthesize_grounded_response(
            system_prompt=(
                "You are the Smart Campus Multimodal Document Agent. Answer the student's question "
                "using ONLY the extracted text from their uploaded attachment."
            ),
            user_query=query,
            grounded_context=context_text,
            history=state.get("conversation_history"),
            fallback_summary=fallback,
        )

        return {
            "extracted_attachment_text": extracted_text[:3000],
            "needs_rag_followup": False,
            "citations": citations,
            "agent_used": "Multimodal Agent",
            "agent_trace": trace,
            "final_response": sanitize_output_pii(answer),
        }
    finally:
        db.close()

