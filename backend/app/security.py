import hashlib
import hmac
import json
import os
import time
from urllib.parse import parse_qsl
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

def verify_telegram_init_data(init_data: str) -> str:
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        raise ValueError("BOT_TOKEN is not configured")
    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", "")
    if not received_hash:
        raise ValueError("Missing Telegram hash")
    auth_date = int(values.get("auth_date", "0"))
    if auth_date <= 0 or abs(int(time.time()) - auth_date) > 86400:
        raise ValueError("Telegram initData has expired")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(values.items()))
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise ValueError("Invalid Telegram signature")
    user = json.loads(values.get("user", "{}"))
    if not user.get("id"):
        raise ValueError("Telegram user is missing")
    return str(user["id"])

def _serializer():
    secret = os.getenv("SESSION_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError("SESSION_SECRET must contain at least 32 characters")
    return URLSafeTimedSerializer(secret, salt="tracker-session")

def issue_session(user_id: str) -> str:
    return _serializer().dumps({"sub": user_id})

def read_session(token: str) -> str:
    try:
        payload = _serializer().loads(token, max_age=604800)
        return str(payload["sub"])
    except (BadSignature, SignatureExpired, KeyError) as exc:
        raise ValueError("Invalid or expired session") from exc
