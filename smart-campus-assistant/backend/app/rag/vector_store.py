from functools import lru_cache
from typing import Any
import chromadb

from app.core.config import get_settings
from app.rag.embeddings import get_embedding_model


class CampusVectorStore:
    """ChromaDB persistent vector store with strict visibility and user-ownership filtering."""

    COLLECTION_NAME = "smart_campus_documents"

    def __init__(self):
        settings = get_settings()
        self.client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        self.embedder = get_embedding_model()

    def add_document_chunks(
        self,
        *,
        document_id: int,
        owner_user_id: int,
        visibility: str,
        title: str,
        filename: str,
        category: str,
        chunks: list[str],
    ) -> int:
        if not chunks:
            return 0

        ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
        embeddings = self.embedder.embed_documents(chunks)
        metadatas = [
            {
                "document_id": str(document_id),
                "owner_user_id": str(owner_user_id),
                "visibility": visibility,
                "title": title,
                "filename": filename,
                "category": category,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )
        return len(chunks)

    def delete_document_vectors(self, document_id: int) -> None:
        try:
            self.collection.delete(where={"document_id": str(document_id)})
        except Exception:
            pass

    def similarity_search(
        self,
        query: str,
        *,
        user_id: int,
        is_admin: bool = False,
        top_k: int = 5,
        document_id: int | None = None,
    ) -> list[dict[str, Any]]:
        count = self.collection.count()
        if count == 0 or not query.strip():
            return []

        query_embedding = self.embedder.embed_query(query)

        if is_admin:
            where_filter: dict[str, Any] | None = (
                {"document_id": str(document_id)} if document_id is not None else None
            )
        else:
            access_filter = {
                "$or": [
                    {"visibility": "public"},
                    {"owner_user_id": str(user_id)},
                ]
            }
            if document_id is not None:
                where_filter = {
                    "$and": [
                        {"document_id": str(document_id)},
                        access_filter,
                    ]
                }
            else:
                where_filter = access_filter

        n_results = min(top_k, count)
        query_kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter is not None:
            query_kwargs["where"] = where_filter

        results = self.collection.query(**query_kwargs)
        docs = (results.get("documents") or [[]])[0]
        metas = (results.get("metadatas") or [[]])[0]
        dists = (results.get("distances") or [[]])[0]

        formatted: list[dict[str, Any]] = []
        for text, meta, dist in zip(docs, metas, dists):
            similarity = max(0.0, round(1.0 - float(dist), 4))
            formatted.append(
                {
                    "text": text,
                    "document_id": int(meta.get("document_id", 0)),
                    "title": meta.get("title", "Campus Document"),
                    "filename": meta.get("filename", ""),
                    "category": meta.get("category", "academic"),
                    "chunk_index": meta.get("chunk_index", 0),
                    "visibility": meta.get("visibility", "public"),
                    "score": similarity,
                }
            )

        return formatted


@lru_cache
def get_vector_store() -> CampusVectorStore:
    return CampusVectorStore()

