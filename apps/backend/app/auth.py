import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# モックの認証。プロセス内メモリのみで、再起動すると失効する。
_TOKENS: dict[str, str] = {}

_bearer_scheme = HTTPBearer(auto_error=False)


def issue_token(employee_code: str) -> str:
    token = secrets.token_urlsafe(24)
    _TOKENS[token] = employee_code
    return token


def get_current_employee_code(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    if credentials is None or credentials.credentials not in _TOKENS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    return _TOKENS[credentials.credentials]
