import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.agents.graph import get_campus_graph
from app.core.dependencies import get_current_user, get_db
from app.database.database import SessionLocal
from app.database.models import ChatConversation, ChatMessage, Document, StudentProfile, User
from app.middleware.rate_limit import rate_limit_chat
from app.schemas.chat import (
    ChatMessageResponse,
    ChatSendRequest,
    ChatSendResponse,
    ConversationCreate,
    ConversationResponse,
)

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])


def _get_owned_conversation(db: Session, conversation_id: int, user_id: int) -> ChatConversation:
    conv = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
    if not conv or conv.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conv


def _serialize_message(msg: ChatMessage) -> ChatMessageResponse:
    citations = []
    if msg.citations_json:
        try:
            citations = json.loads(msg.citations_json)
        except json.JSONDecodeError:
            citations = []

    return ChatMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender=msg.sender,
        content=msg.content,
        agent_used=msg.agent_used,
        citations=citations,
        attachment_document_id=msg.attachment_document_id,
        attachment_name=msg.attachment_document.filename if msg.attachment_document else None,
        guardrail_triggered=msg.guardrail_triggered,
        created_at=msg.created_at,
    )


def _prepare_graph_execution(
    db: Session,
    current_user: User,
    payload: ChatSendRequest,
) -> tuple[ChatConversation, dict, list[dict]]:
    if payload.conversation_id is not None:
        conv = _get_owned_conversation(db, payload.conversation_id, current_user.id)
    else:
        title_preview = payload.message.strip()[:48]
        conv = ChatConversation(user_id=current_user.id, title=title_preview or "New Campus Chat")
        db.add(conv)
        db.flush()

    attachment_info = None
    if payload.attachment_document_id is not None:
        doc = db.query(Document).filter(Document.id == payload.attachment_document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Attached document not found")
        if (
            current_user.role != "admin"
            and doc.visibility != "public"
            and doc.uploaded_by_user_id != current_user.id
        ):
            raise HTTPException(status_code=403, detail="Not authorized to access this document")
        attachment_info = {
            "document_id": doc.id,
            "filename": doc.filename,
            "stored_filename": doc.stored_filename,
            "file_type": doc.file_type,
        }

    prior_msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    history = [{"sender": m.sender, "content": m.content} for m in prior_msgs[-10:]]

    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=payload.message.strip(),
        attachment_document_id=attachment_info["document_id"] if attachment_info else None,
    )
    db.add(user_msg)
    if conv.title == "New Campus Chat" and len(prior_msgs) == 0:
        conv.title = payload.message.strip()[:48]
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)

    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    initial_state = {
        "user_id": current_user.id,
        "student_id": student.id if student else None,
        "role": current_user.role,
        "register_number": student.register_number if student else None,
        "department": student.department if student else None,
        "semester": student.semester if student else None,
        "full_name": current_user.full_name,
        "query": payload.message.strip(),
        "conversation_id": conv.id,
        "conversation_history": history,
        "attachment": attachment_info,
        "agent_trace": [],
        "citations": [],
        "guardrail_blocked": False,
        "needs_rag_followup": False,
    }
    return conv, initial_state, history


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == current_user.id)
        .order_by(ChatConversation.updated_at.desc(), ChatConversation.id.desc())
        .all()
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = ChatConversation(user_id=current_user.id, title=payload.title.strip())
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageResponse])
def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _get_owned_conversation(db, conversation_id, current_user.id)
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )
    return [_serialize_message(m) for m in msgs]


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _get_owned_conversation(db, conversation_id, current_user.id)
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted"}


@router.post("/message", response_model=ChatSendResponse)
def send_chat_message(
    payload: ChatSendRequest,
    _: None = Depends(rate_limit_chat),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv, initial_state, _ = _prepare_graph_execution(db, current_user, payload)
    graph = get_campus_graph()
    result = graph.invoke(initial_state)

    final_text = result.get("final_response") or "I could not generate a response."
    agent_used = result.get("agent_used") or "Supervisor Agent"
    citations = result.get("citations") or []
    agent_trace = result.get("agent_trace") or []
    guardrail_triggered = bool(result.get("guardrail_blocked"))

    ai_msg = ChatMessage(
        conversation_id=conv.id,
        sender="assistant",
        content=final_text,
        agent_used=agent_used,
        citations_json=json.dumps(citations),
        guardrail_triggered=guardrail_triggered,
    )
    db.add(ai_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ai_msg)

    return ChatSendResponse(
        conversation_id=conv.id,
        message_id=ai_msg.id,
        response=final_text,
        agent_used=agent_used,
        citations=citations,
        agent_trace=agent_trace,
        guardrail_triggered=guardrail_triggered,
    )


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/stream")
async def stream_chat_message(
    payload: ChatSendRequest,
    _: None = Depends(rate_limit_chat),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv, initial_state, _ = _prepare_graph_execution(db, current_user, payload)
    conv_id = conv.id

    async def event_generator() -> AsyncGenerator[str, None]:
        yield _sse_event("meta", {"conversation_id": conv_id})

        graph = get_campus_graph()
        merged_state = dict(initial_state)

        try:
            for update in graph.stream(initial_state, stream_mode="updates"):
                for node_name, node_output in update.items():
                    if isinstance(node_output, dict):
                        merged_state.update(node_output)
                    pretty_node = node_name.replace("_", " ").title()
                    yield _sse_event(
                        "agent_step",
                        {
                            "node": merged_state.get("agent_used") or pretty_node,
                            "detail": f"{pretty_node} executed",
                        },
                    )

            final_text = merged_state.get("final_response") or "No response produced."
            agent_used = merged_state.get("agent_used") or "Supervisor Agent"
            citations = merged_state.get("citations") or []
            agent_trace = merged_state.get("agent_trace") or []
            guardrail_triggered = bool(merged_state.get("guardrail_blocked"))

            # Stream response in clean word-aligned chunks
            chunk_size = 28
            for i in range(0, len(final_text), chunk_size):
                yield _sse_event("token", {"text": final_text[i : i + chunk_size]})

            stream_db = SessionLocal()
            try:
                ai_msg = ChatMessage(
                    conversation_id=conv_id,
                    sender="assistant",
                    content=final_text,
                    agent_used=agent_used,
                    citations_json=json.dumps(citations),
                    guardrail_triggered=guardrail_triggered,
                )
                stream_db.add(ai_msg)
                conv_row = stream_db.query(ChatConversation).filter(ChatConversation.id == conv_id).first()
                if conv_row:
                    conv_row.updated_at = datetime.now(timezone.utc)
                stream_db.commit()
                stream_db.refresh(ai_msg)
                ai_msg_id = ai_msg.id
            finally:
                stream_db.close()

            yield _sse_event(
                "done",
                {
                    "conversation_id": conv_id,
                    "message_id": ai_msg_id,
                    "agent_used": agent_used,
                    "citations": citations,
                    "agent_trace": agent_trace,
                    "guardrail_triggered": guardrail_triggered,
                    "full_text": final_text,
                },
            )
        except Exception as exc:
            yield _sse_event("error", {"message": f"Workflow error: {str(exc)}"})

    return StreamingResponse(event_generator(), media_type="text/event-stream")
