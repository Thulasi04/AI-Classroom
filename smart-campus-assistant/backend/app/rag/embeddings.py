import hashlib
import math
import os
from functools import lru_cache
from langchain_core.embeddings import Embeddings

from app.core.config import get_settings


class CampusHuggingFaceEmbeddings(Embeddings):
    """Hugging Face Sentence Transformer embeddings implementing LangChain's Embeddings interface."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None
        self._load_error: str | None = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer

            try:
                self._model = SentenceTransformer(self.model_name, local_files_only=True)
            except Exception:
                if os.environ.get("HF_HUB_OFFLINE", "").lower() in {"1", "true", "yes"}:
                    self._model = None
                else:
                    self._model = SentenceTransformer(self.model_name)
        except Exception as exc:
            self._load_error = str(exc)
            self._model = None

    @staticmethod
    def _fallback_hash_embedding(text: str, dim: int = 384) -> list[float]:
        """Deterministic normalized lexical projection if HF model weights are offline."""
        vec = [0.0] * dim
        tokens = [tok.strip(".,!?;:\"'()[]{}").lower() for tok in text.split() if tok.strip()]
        if not tokens:
            vec[0] = 1.0
            return vec
        for tok in tokens:
            digest = hashlib.sha256(tok.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "little") % dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self._model is not None:
            vectors = self._model.encode(texts, normalize_embeddings=True)
            return [vec.tolist() for vec in vectors]
        return [self._fallback_hash_embedding(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        if self._model is not None:
            vec = self._model.encode(text, normalize_embeddings=True)
            return vec.tolist()
        return self._fallback_hash_embedding(text)


@lru_cache
def get_embedding_model() -> CampusHuggingFaceEmbeddings:
    settings = get_settings()
    return CampusHuggingFaceEmbeddings(settings.EMBEDDING_MODEL_NAME)
