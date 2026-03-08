"""Lightweight encryption utilities for Safe Circles.

Uses XOR cipher + base64 encoding to demonstrate the privacy-first concept.
In production, this module would use AES-256-GCM or similar via the `cryptography` library.
"""

from __future__ import annotations

import base64


def derive_circle_key(circle_id: str) -> str:
    """Derive a deterministic demo key from a circle ID."""
    return circle_id


def encrypt(plaintext: str, key: str) -> str:
    """XOR cipher + base64 encode."""
    key_bytes = key.encode()
    xored = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(plaintext.encode()))
    return base64.b64encode(xored).decode()


def decrypt(ciphertext_b64: str, key: str) -> str:
    """Reverse the XOR cipher."""
    key_bytes = key.encode()
    xored = base64.b64decode(ciphertext_b64)
    return bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(xored)).decode()
