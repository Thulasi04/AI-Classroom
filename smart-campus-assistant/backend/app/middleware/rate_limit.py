import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter per client IP and bucket."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            q = self._hits[key]
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please wait briefly before retrying.",
                )
            q.append(now)


auth_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)
chat_rate_limiter = SlidingWindowRateLimiter(max_requests=40, window_seconds=60)


def rate_limit_auth(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    auth_rate_limiter.check(f"auth:{client_ip}")


def rate_limit_chat(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    chat_rate_limiter.check(f"chat:{client_ip}")

