from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone

DATA_FILE = pathlib.Path(__file__).resolve().parent.parent / "data" / "synthetic_incidents.json"

_incidents: list[dict] = []
_next_id: int = 1

_circles: list[dict] = []
_circle_statuses: list[dict] = []
_next_circle_id: int = 1
_next_status_id: int = 1


def _set_next_id() -> None:
    global _next_id
    max_num = 0
    for inc in _incidents:
        try:
            num = int(inc["incident_id"].split("-")[1])
            if num > max_num:
                max_num = num
        except (IndexError, ValueError):
            pass
    _next_id = max_num + 1


def load_initial_data() -> None:
    global _incidents
    if DATA_FILE.exists():
        with open(DATA_FILE, "r") as f:
            _incidents = json.load(f)
    _set_next_id()


def get_all_incidents(
    category: str | None = None,
    severity: str | None = None,
    verified: bool | None = None,
    search: str | None = None,
    zone: str | None = None,
    status: str | None = None,
    hide_noise: bool = False,
) -> list[dict]:
    results = _incidents
    if category:
        results = [i for i in results if i.get("incident_category") == category]
    if severity:
        results = [i for i in results if i.get("severity") == severity]
    if verified is not None:
        results = [i for i in results if i.get("is_verified_incident") is verified]
    if search:
        q = search.lower()
        results = [i for i in results if q in i.get("raw_text", "").lower()]
    if zone:
        results = [i for i in results if i.get("location_zone") == zone]
    if status:
        results = [i for i in results if i.get("status", "active") == status]
    if hide_noise:
        results = [i for i in results if i.get("incident_category") != "Noise"]
    return results


def resolve_incident(incident_id: str) -> dict | None:
    inc = get_incident(incident_id)
    if inc is None:
        return None
    inc["status"] = "resolved"
    inc["resolved_at"] = datetime.now(timezone.utc).isoformat()
    if "audit_history" not in inc:
        inc["audit_history"] = []
    inc["audit_history"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": "status_changed",
        "old_value": "active",
        "new_value": "resolved",
    })
    return inc


def auto_resolve_old_low_severity() -> int:
    """Auto-resolve noise and low-severity incidents."""
    count = 0
    for inc in _incidents:
        if inc.get("status", "active") != "active":
            continue
        sev = inc.get("severity", "")
        cat = inc.get("incident_category", "")
        if cat == "Noise" or sev in ("noise", "low"):
            inc["status"] = "resolved"
            inc["resolved_at"] = datetime.now(timezone.utc).isoformat()
            count += 1
    return count


def get_incident(incident_id: str) -> dict | None:
    for inc in _incidents:
        if inc["incident_id"] == incident_id:
            return inc
    return None


def create_incident(data: dict) -> dict:
    global _next_id
    incident = {
        "incident_id": f"INC-{_next_id:04d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": data.get("source", "manual_report"),
        "reporter_id": data.get("reporter_id", "USR-000"),
        "user_trust_score": data.get("user_trust_score", 0.5),
        "raw_text": data["raw_text"],
        "location_zone": data.get("location_zone", "Sector 1"),
        "ai_processed": False,
        "is_verified_incident": None,
        "incident_category": None,
        "severity": None,
        "actionable_checklist": [],
        "analysis_method": None,
        "correlated_incident_ids": [],
        "fake_news_indicators": [],
        "audit_history": [],
        "status": "active",
        "resolved_at": None,
        "alert_title": None,
    }
    _next_id += 1
    _incidents.append(incident)
    return incident


def update_incident(incident_id: str, updates: dict, *, _skip_audit: bool = False) -> dict | None:
    inc = get_incident(incident_id)
    if inc is None:
        return None
    audit_fields = {"is_verified_incident", "severity"}
    if "audit_history" not in inc:
        inc["audit_history"] = []
    for key in ("is_verified_incident", "severity", "ai_processed",
                "incident_category", "actionable_checklist",
                "analysis_method", "correlated_incident_ids",
                "fake_news_indicators", "alert_title", "status", "resolved_at"):
        if key in updates:
            if not _skip_audit and key in audit_fields and inc.get(key) != updates[key]:
                inc["audit_history"].append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action": f"{key}_changed",
                    "old_value": inc.get(key),
                    "new_value": updates[key],
                })
            inc[key] = updates[key]
    return inc


def delete_incident(incident_id: str) -> bool:
    global _incidents
    before = len(_incidents)
    _incidents = [i for i in _incidents if i["incident_id"] != incident_id]
    return len(_incidents) < before


def bulk_load(records: list[dict]) -> int:
    count = 0
    for rec in records:
        if "raw_text" in rec and len(rec["raw_text"]) >= 10:
            create_incident(rec)
            count += 1
    return count


# --- Safe Circles ---

def create_circle(data: dict) -> dict:
    global _next_circle_id
    circle = {
        "circle_id": f"CIRCLE-{_next_circle_id:04d}",
        "owner_id": data["owner_id"],
        "circle_name": data["circle_name"],
        "member_ids": data["member_ids"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _next_circle_id += 1
    _circles.append(circle)
    return circle


def get_circle(circle_id: str) -> dict | None:
    for c in _circles:
        if c["circle_id"] == circle_id:
            return c
    return None


def get_circles_for_user(user_id: str) -> list[dict]:
    return [
        c for c in _circles
        if c["owner_id"] == user_id or user_id in c["member_ids"]
    ]


def create_status(data: dict) -> dict:
    global _next_status_id
    status = {
        "status_id": f"STATUS-{_next_status_id:04d}",
        "circle_id": data["circle_id"],
        "sender_id": data["sender_id"],
        "encrypted_payload": data["encrypted_payload"],
        "linked_incident_id": data.get("linked_incident_id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _next_status_id += 1
    _circle_statuses.append(status)
    return status


def get_statuses_for_circle(circle_id: str) -> list[dict]:
    return [s for s in _circle_statuses if s["circle_id"] == circle_id]


def reset_circles() -> None:
    global _circles, _circle_statuses, _next_circle_id, _next_status_id
    _circles = []
    _circle_statuses = []
    _next_circle_id = 1
    _next_status_id = 1
