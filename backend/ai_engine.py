"""Three-tier AI analysis pipeline.

Tier 1: mistral-small-3.1 via UF NaviGator
Tier 2: llama-3.1-8b-instruct via UF NaviGator
Tier 3: Deterministic regex fallback
"""

from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI, APIError, APITimeoutError

from config import (
    NAVIGATOR_API_KEY, NAVIGATOR_BASE_URL, PRIMARY_MODEL, FALLBACK_MODEL,
    LLM_TIMEOUT, ALLOWED_MODELS, get_active_model, is_offline_mode,
)
from regex_fallback import regex_analyze
from fake_news_detector import apply_fake_news_overlay
from models import VALID_CATEGORIES, VALID_SEVERITIES
from metrics import increment_ai_success, increment_regex_fallback

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a community safety analyst helping neighborhood residents stay safe.
Analyze the following incident report and return ONLY valid JSON with these exact fields:

{
  "is_verified_incident": <boolean — true if this appears to be a real, actionable incident>,
  "incident_category": <one of: "Phishing", "Malware", "Physical Hazard", "Network Breach", "Natural Disaster", "Scam", "Suspicious Activity", "Infrastructure Failure", "Noise">,
  "severity": <one of: "critical", "high", "medium", "low", "noise">,
  "actionable_checklist": <array of exactly 3 short action-item strings written in plain language for everyday people>,
  "fake_news_indicators": <array of detected linguistic markers suggesting misinformation, or empty array if none>,
  "alert_title": <a short, human-readable title for this alert, like "Gas Leak Near Elementary School" or "Phishing Scam in Your Area" — plain language, no jargon>
}

Rules:
- "Noise" category is for complaints, venting, off-topic posts with no safety relevance.
- Severity "noise" is only for Noise category.
- alert_title should be a short, calming title that helps regular people understand the situation at a glance.
- Return ONLY the JSON object. No markdown, no explanation, no extra text."""

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=NAVIGATOR_API_KEY,
            base_url=NAVIGATOR_BASE_URL,
        )
    return _client


def _validate_llm_response(raw: str) -> dict | None:
    """Parse and validate the LLM JSON response."""
    try:
        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()

        data = json.loads(text)

        # Validate required fields
        if not isinstance(data.get("is_verified_incident"), bool):
            return None
        if data.get("incident_category") not in VALID_CATEGORIES:
            return None
        if data.get("severity") not in VALID_SEVERITIES:
            return None
        if not isinstance(data.get("actionable_checklist"), list):
            return None
        if len(data["actionable_checklist"]) == 0:
            return None
        if not isinstance(data.get("fake_news_indicators"), list):
            data["fake_news_indicators"] = []

        if not isinstance(data.get("alert_title"), str) or not data["alert_title"]:
            data["alert_title"] = data.get("incident_category", "Safety Report")

        return data
    except (json.JSONDecodeError, KeyError, TypeError):
        return None


async def _call_llm(raw_text: str, model: str) -> dict | None:
    """Call a single LLM model and return validated result or None."""
    client = _get_client()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.1,
            max_tokens=500,
            timeout=LLM_TIMEOUT,
        )
        content = response.choices[0].message.content or ""
        validated = _validate_llm_response(content)
        if validated:
            validated["analysis_method"] = model
            return validated
        logger.warning("LLM %s returned invalid JSON: %s", model, content[:200])
        return None
    except (APIError, APITimeoutError, Exception) as e:
        logger.warning("LLM %s failed: %s", model, str(e)[:200])
        return None


async def analyze_incident(
    incident: dict,
    all_incidents: list[dict],
) -> dict:
    """Run three-tier analysis pipeline on an incident.

    Returns the analysis result dict with fields matching AIAnalysisResult.
    """
    raw_text = incident.get("raw_text", "")
    result = None

    if not is_offline_mode():
        # Tier 1: Active model (dynamically selected)
        active = get_active_model()
        fallback = [m for m in ALLOWED_MODELS if m != active]
        result = await _call_llm(raw_text, active)

        # Tier 2: Fallback model
        if result is None and fallback:
            result = await _call_llm(raw_text, fallback[0])

    # Track metrics
    if result is not None:
        increment_ai_success()
    else:
        # Tier 3: Deterministic regex (or offline mode)
        result = regex_analyze(raw_text)
        increment_regex_fallback()

    # Overlay fake news detection
    result = apply_fake_news_overlay(incident, result, all_incidents)

    return result
