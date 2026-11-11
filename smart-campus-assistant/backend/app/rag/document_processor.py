import io
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PIL import Image
from pypdf import PdfReader

from app.core.config import get_settings


ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "csv", "png", "jpg", "jpeg", "webp"}
TEXT_EXTENSIONS = {"txt", "md", "csv"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=120,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def validate_magic_bytes(ext: str, content: bytes) -> None:
    if ext == "pdf":
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file header.",
            )
    elif ext == "png":
        if not content.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PNG image signature.",
            )
    elif ext in {"jpg", "jpeg"}:
        if not content.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JPEG image signature.",
            )
    elif ext == "webp":
        if not (len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid WEBP image signature.",
            )
    elif ext in TEXT_EXTENSIONS:
        if b"\x00" in content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Binary content is not allowed in text documents.",
            )
        try:
            content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text file must be valid UTF-8.",
            ) from exc


async def save_and_validate_upload(file: UploadFile) -> tuple[str, str, str, int, bytes]:
    settings = get_settings()
    original_name = Path(file.filename or "upload").name
    if "." not in original_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a valid extension.",
        )

    ext = original_name.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(1024 * 256)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Uploaded file exceeds 10 MB size limit.",
            )
        chunks.append(chunk)

    if total_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    content = b"".join(chunks)
    validate_magic_bytes(ext, content)

    if ext in IMAGE_EXTENSIONS:
        try:
            with Image.open(io.BytesIO(content)) as img:
                img.verify()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid image file.",
            ) from exc

    stored_filename = f"{uuid.uuid4().hex}.{ext}"
    dest_path = (settings.UPLOAD_DIR / stored_filename).resolve()
    if settings.UPLOAD_DIR.resolve() not in dest_path.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid upload path.")

    dest_path.write_bytes(content)
    return original_name, stored_filename, ext, total_size, content


def extract_text_from_file(ext: str, content: bytes, filename: str) -> str:
    ext = ext.lower()
    if ext in TEXT_EXTENSIONS:
        return content.decode("utf-8", errors="replace").strip()

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(content))
        pages_text: list[str] = []
        for idx, page in enumerate(reader.pages, start=1):
            page_txt = (page.extract_text() or "").strip()
            if page_txt:
                pages_text.append(f"[Page {idx}]\n{page_txt}")
        return "\n\n".join(pages_text).strip()

    if ext in IMAGE_EXTENSIONS:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
            fmt = img.format or ext.upper()
            mode = img.mode
        return (
            f"Image file '{filename}' ({fmt}, {width}x{height}px, mode={mode}). "
            "Stored for multimodal visual inspection."
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Cannot process unsupported format '.{ext}'.",
    )


def chunk_text(text: str) -> list[str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    return text_splitter.split_text(cleaned)

