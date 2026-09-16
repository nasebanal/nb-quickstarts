"""OpenAPI スキーマを apps/backend/openapi.json に書き出す。

Specmatic はこの静的ファイルを契約として読む想定(バックエンドを起動していなくても
契約テストできるように)。バックエンドの起動有無に関わらず動くよう、DB接続を
必要としない `app.main.app.openapi()` の結果のみを使う。

Usage: python scripts/export_openapi.py (apps/backend/ で実行、またはコンテナ内で
`docker compose exec backend python scripts/export_openapi.py`)
"""

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402 - needs BACKEND_ROOT on sys.path first

OUTPUT_PATH = BACKEND_ROOT / "openapi.json"


def main() -> None:
    schema = app.openapi()
    OUTPUT_PATH.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
