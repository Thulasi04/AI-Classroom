from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.database.models import Document, User
from app.rag.document_processor import chunk_text, extract_text_from_file, save_and_validate_upload
from app.rag.vector_store import get_vector_store
from app.schemas.campus import DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents & RAG"])


def ingest_document_record(
    *,
    db: Session,
    user: User,
    original_name: str,
    stored_filename: str,
    ext: str,
    total_size: int,
    content: bytes,
    title: str,
    category: str,
    visibility: str,
) -> Document:
    extracted = extract_text_from_file(ext, content, original_name)
    chunks = chunk_text(extracted)
    summary = extracted[:240] + ("..." if len(extracted) > 240 else "")

    doc = Document(
        uploaded_by_user_id=user.id,
        title=title.strip() or original_name,
        filename=original_name,
        stored_filename=stored_filename,
        file_type=ext,
        file_size=total_size,
        category=category.strip() or "personal_upload",
        visibility=visibility,
        is_indexed=False,
        chunk_count=0,
        extracted_summary=summary,
    )
    db.add(doc)
    db.flush()

    if chunks:
        store = get_vector_store()
        indexed_count = store.add_document_chunks(
            document_id=doc.id,
            owner_user_id=user.id,
            visibility=visibility,
            title=doc.title,
            filename=doc.filename,
            category=doc.category,
            chunks=chunks,
        )
        doc.is_indexed = indexed_count > 0
        doc.chunk_count = indexed_count

    db.commit()
    db.refresh(doc)
    return doc


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    category: str = Form(default="personal_upload"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original_name, stored_filename, ext, total_size, content = await save_and_validate_upload(file)
    visibility = "private" if current_user.role != "admin" else "public"
    return ingest_document_record(
        db=db,
        user=current_user,
        original_name=original_name,
        stored_filename=stored_filename,
        ext=ext,
        total_size=total_size,
        content=content,
        title=title,
        category=category,
        visibility=visibility,
    )


@router.get("", response_model=list[DocumentResponse])
def list_accessible_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if current_user.role != "admin":
        query = query.filter(
            or_(
                Document.visibility == "public",
                Document.uploaded_by_user_id == current_user.id,
            )
        )
    return query.order_by(Document.created_at.desc()).all()


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role != "admin" and doc.uploaded_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    settings = get_settings()
    file_path = (settings.UPLOAD_DIR / doc.stored_filename).resolve()
    if settings.UPLOAD_DIR.resolve() in file_path.parents and file_path.exists():
        file_path.unlink(missing_ok=True)

    get_vector_store().delete_document_vectors(doc.id)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}

