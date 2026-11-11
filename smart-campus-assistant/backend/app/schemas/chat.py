from datetime import datetime
from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="New Campus Chat", min_length=1, max_length=200)


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class CitationItem(BaseModel):
    source_type: str = "rag"  # rag | sqlite | multimodal
    title: str
    source: str
    category: str | None = None
    chunk_index: int | None = None
    snippet: str | None = None
    score: float | None = None


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    agent_used: str | None = None
    citations: list[CitationItem] = []
    attachment_document_id: int | None = None
    attachment_name: str | None = None
    guardrail_triggered: bool = False
    created_at: datetime


class ChatSendRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: int | None = None
    attachment_document_id: int | None = None


class ChatSendResponse(BaseModel):
    conversation_id: int
    message_id: int
    response: str
    agent_used: str
    citations: list[CitationItem] = []
    agent_trace: list[str] = []
    guardrail_triggered: bool = False

