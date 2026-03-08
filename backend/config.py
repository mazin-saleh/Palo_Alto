import os
from dotenv import load_dotenv

load_dotenv()

NAVIGATOR_API_KEY: str = os.getenv("UF_NAVIGATOR_API_KEY", "")
NAVIGATOR_BASE_URL: str = os.getenv("UF_NAVIGATOR_BASE_URL", "https://api.ai.it.ufl.edu/v1")
PRIMARY_MODEL: str = os.getenv("UF_PRIMARY_MODEL", "llama-3.1-8b-instruct")
FALLBACK_MODEL: str = os.getenv("UF_FALLBACK_MODEL", "mistral-7b-instruct")
LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "10"))

ALLOWED_MODELS: list[str] = [PRIMARY_MODEL, FALLBACK_MODEL]
_active_model: str = PRIMARY_MODEL
_offline_mode: bool = False


def get_active_model() -> str:
    return _active_model


def set_active_model(model: str) -> None:
    global _active_model
    _active_model = model


def is_offline_mode() -> bool:
    return _offline_mode


def set_offline_mode(enabled: bool) -> None:
    global _offline_mode
    _offline_mode = enabled
