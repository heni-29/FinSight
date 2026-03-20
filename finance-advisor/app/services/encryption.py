import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes:
    """Decode the base64-encoded 32-byte AES key from settings."""
    key = settings.ENCRYPTION_KEY
    if not key:
        # Fallback for development — generate deterministic key from SECRET_KEY
        raw = settings.SECRET_KEY.encode()
        raw = raw[:32].ljust(32, b"\x00")
        return raw
    return base64.urlsafe_b64decode(key + "==")


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext using AES-256-GCM. Returns base64-encoded nonce+ciphertext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    combined = nonce + ciphertext
    return base64.urlsafe_b64encode(combined).decode()


def decrypt(token: str) -> str:
    """Decrypt base64-encoded nonce+ciphertext using AES-256-GCM."""
    key = _get_key()
    aesgcm = AESGCM(key)
    combined = base64.urlsafe_b64decode(token)
    nonce = combined[:12]
    ciphertext = combined[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode()
