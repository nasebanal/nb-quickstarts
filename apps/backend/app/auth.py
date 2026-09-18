import json
import os
import secrets
import threading
from pathlib import Path

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Mock authentication for a demo app - no real expiry (tokens never time
# out on their own), and persisted to a file on the bind-mounted source
# dir instead of in-memory only, so a session survives both `--reload`
# restarts (any code edit triggers one) and a full container recreate
# (apps:restart, apps:down -> up). Used to be in-memory only: every
# restart silently invalidated every logged-in session, which is exactly
# what UnauthorizedError (see apps/frontend/src/lib/api.ts) exists to
# handle gracefully - that handling stays, since a full apps:reset (wipes
# the whole MySQL volume - see apps/docker-compose.yml) still legitimately
# invalidates every token along with everything else. Not a real session
# store: no rotation, no per-token metadata, just enough persistence that
# routine dev-loop restarts don't keep kicking you out.
_TOKENS_FILE = Path(__file__).resolve().parent.parent / ".tokens.json"

# FastAPI runs sync path operations (like login, below) in a threadpool, so
# concurrent logins - e.g. Locust's overload scenarios, which log in on
# every simulated user - genuinely run issue_token() from multiple OS
# threads at once, not just interleaved on one event loop. Without this,
# two threads' write_text() calls can race and interleave, corrupting the
# file (observed directly: a complete JSON object followed by leftover
# trailing bytes from a second, differently-sized concurrent write - valid
# JSON's "Extra data" error, crash-looping the whole app on every restart
# thereafter, since _load_tokens() runs at import time). The lock below
# serializes the read-modify-write; _save_tokens' write-to-temp-then-
# os.replace makes the file swap itself atomic too, so a reader (a fresh
# process starting up) never observes a partially-written file even
# without holding the lock.
_tokens_lock = threading.Lock()


def _load_tokens() -> dict[str, str]:
    if _TOKENS_FILE.exists():
        return json.loads(_TOKENS_FILE.read_text())
    return {}


def _save_tokens() -> None:
    tmp_file = _TOKENS_FILE.with_suffix(".json.tmp")
    tmp_file.write_text(json.dumps(_TOKENS))
    os.replace(tmp_file, _TOKENS_FILE)


_TOKENS: dict[str, str] = _load_tokens()

_bearer_scheme = HTTPBearer(auto_error=False)


def issue_token(employee_code: str) -> str:
    token = secrets.token_urlsafe(24)
    with _tokens_lock:
        _TOKENS[token] = employee_code
        _save_tokens()
    return token


def get_current_employee_code(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    if credentials is None or credentials.credentials not in _TOKENS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    return _TOKENS[credentials.credentials]
