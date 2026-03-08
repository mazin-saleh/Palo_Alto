from __future__ import annotations

import re
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


VALID_CATEGORIES = [
    "Phishing", "Malware", "Physical Hazard", "Network Breach",
    "Natural Disaster", "Scam", "Suspicious Activity",
    "Infrastructure Failure", "Noise",
]

VALID_SEVERITIES = ["critical", "high", "medium", "low", "noise"]

VALID_ZONES = [f"Sector {i}" for i in range(1, 10)]

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class IncidentCreate(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=2000)
    source: str = Field(default="manual_report")
    reporter_id: str = Field(default="USR-000")
    user_trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    location_zone: str = Field(default="Sector 1")

    @field_validator("raw_text")
    @classmethod
    def sanitize_raw_text(cls, v: str) -> str:
        v = _HTML_TAG_RE.sub("", v)
        v = _CONTROL_CHAR_RE.sub("", v)
        return v.strip()

    @field_validator("location_zone")
    @classmethod
    def validate_zone(cls, v: str) -> str:
        if v not in VALID_ZONES:
            raise ValueError(f"Invalid zone. Must be one of: {VALID_ZONES}")
        return v


class AIAnalysisResult(BaseModel):
    is_verified_incident: bool
    incident_category: str
    severity: str
    actionable_checklist: list[str] = Field(default_factory=list)
    fake_news_indicators: list[str] = Field(default_factory=list)
    analysis_method: str = "unknown"


class AuditEntry(BaseModel):
    timestamp: str
    action: str
    old_value: Any = None
    new_value: Any = None


class IncidentResponse(BaseModel):
    incident_id: str
    timestamp: str
    source: str
    reporter_id: str
    user_trust_score: float
    raw_text: str
    location_zone: str
    ai_processed: bool
    is_verified_incident: Optional[bool] = None
    incident_category: Optional[str] = None
    severity: Optional[str] = None
    actionable_checklist: list[str] = Field(default_factory=list)
    analysis_method: Optional[str] = None
    correlated_incident_ids: list[str] = Field(default_factory=list)
    fake_news_indicators: list[str] = Field(default_factory=list)
    audit_history: list[AuditEntry] = Field(default_factory=list)
    status: str = "active"
    resolved_at: Optional[str] = None
    alert_title: Optional[str] = None


class DigestResponse(BaseModel):
    safety_level: str
    active_alerts: list[IncidentResponse] = Field(default_factory=list)
    summary: str
    last_updated: str
    zone_scores: dict = Field(default_factory=dict)
    quiet_zones: list[dict] = Field(default_factory=list)
    trending_up: list[dict] = Field(default_factory=list)


# --- Analytics Models ---

class ZoneSafetyScore(BaseModel):
    score: int
    level: str
    incident_count: int
    trend: str


class CrossZoneCorrelation(BaseModel):
    category: str
    zones: list[str]
    incident_ids: list[str]
    zone_count: int


class AnalyticsOverview(BaseModel):
    zone_scores: dict = Field(default_factory=dict)
    category_distribution: list[dict] = Field(default_factory=list)
    severity_breakdown: dict = Field(default_factory=dict)
    analysis_method_ratio: dict = Field(default_factory=dict)
    trending_threats: list[dict] = Field(default_factory=list)
    cross_zone_correlations: list[dict] = Field(default_factory=list)
    total_incidents: int = 0
    active_incidents: int = 0
    resolved_incidents: int = 0


class IncidentPatch(BaseModel):
    is_verified_incident: Optional[bool] = None
    severity: Optional[str] = None


class ModelSelect(BaseModel):
    model: str


# --- Safe Circles ---

class SafeCircleCreate(BaseModel):
    owner_id: str = Field(..., min_length=1)
    circle_name: str = Field(..., min_length=1, max_length=100)
    member_ids: list[str] = Field(..., min_length=1)


class SafeCircleResponse(BaseModel):
    circle_id: str
    owner_id: str
    circle_name: str
    member_ids: list[str]
    created_at: str


class StatusBroadcastCreate(BaseModel):
    sender_id: str = Field(..., min_length=1)
    plaintext_message: str = Field(..., min_length=1, max_length=500)
    linked_incident_id: Optional[str] = None


class EncryptedStatusResponse(BaseModel):
    status_id: str
    circle_id: str
    sender_id: str
    encrypted_payload: str
    linked_incident_id: Optional[str] = None
    timestamp: str


class DecryptedStatusResponse(BaseModel):
    status_id: str
    circle_id: str
    sender_id: str
    decrypted_message: str
    linked_incident_id: Optional[str] = None
    timestamp: str
