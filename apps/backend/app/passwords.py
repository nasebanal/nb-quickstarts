"""Password hashing for the demo login - stdlib only (hashlib), so there is
no extra dependency.

Format: `pbkdf2_sha256$<iterations>$<salt hex>$<hash hex>`. The iteration
count is deliberately demo-grade: Locust's overload scenarios log in once per
simulated user, and a production-strength cost (hundreds of thousands of
iterations, or argon2/bcrypt) would make *login* the bottleneck being
measured instead of the DB pool. A real application should use a slow,
memory-hard hash (argon2id / bcrypt / scrypt with real parameters).
"""

import hashlib
import hmac
import secrets

_ITERATIONS = 20_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
    except ValueError:
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)
