from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import (
    admin,
    attendance,
    auth,
    campus_services,
    chatbot,
    courses,
    documents,
    marks,
    placements,
    students,
    support,
    timetable,
)
from app.core.config import get_settings
from app.database.database import Base, SessionLocal, engine
from app.database.seed import seed_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Production-oriented Smart Campus Assistant API powered by FastAPI, SQLite, "
            "ChromaDB, HuggingFace Sentence Transformers, LangChain, and LangGraph."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {type(exc).__name__}"},
        )

    api_prefix = "/api"
    application.include_router(auth.router, prefix=api_prefix)
    application.include_router(students.router, prefix=api_prefix)
    application.include_router(courses.router, prefix=api_prefix)
    application.include_router(attendance.router, prefix=api_prefix)
    application.include_router(marks.router, prefix=api_prefix)
    application.include_router(timetable.router, prefix=api_prefix)
    application.include_router(placements.router, prefix=api_prefix)
    application.include_router(campus_services.router, prefix=api_prefix)
    application.include_router(support.router, prefix=api_prefix)
    application.include_router(documents.router, prefix=api_prefix)
    application.include_router(chatbot.router, prefix=api_prefix)
    application.include_router(admin.router, prefix=api_prefix)

    @application.get("/", tags=["Health"])
    def root():
        return {"service": settings.APP_NAME, "docs": "/docs", "status": "ok"}

    @application.get("/api/health", tags=["Health"])
    def health():
        return {
            "status": "healthy",
            "groq_configured": settings.has_valid_groq_key,
            "langsmith_tracing": settings.LANGSMITH_TRACING and settings.has_valid_langsmith_key,
        }

    return application


app = create_app()

