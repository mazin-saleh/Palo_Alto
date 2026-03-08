from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional

from models import (
    IncidentCreate, IncidentResponse, IncidentPatch, ModelSelect,
    DigestResponse, AnalyticsOverview,
    SafeCircleCreate, SafeCircleResponse, StatusBroadcastCreate,
    EncryptedStatusResponse, DecryptedStatusResponse,
)
from data_store import (
    get_all_incidents, get_incident, create_incident,
    update_incident, delete_incident, bulk_load, load_initial_data,
    resolve_incident,
    create_circle, get_circle, get_circles_for_user,
    create_status, get_statuses_for_circle,
)
from crypto_utils import derive_circle_key, encrypt, decrypt
from ai_engine import analyze_incident
from regex_fallback import regex_analyze
from fake_news_detector import apply_fake_news_overlay
from metrics import get_metrics, increment_regex_fallback
from config import ALLOWED_MODELS, get_active_model, set_active_model, is_offline_mode, set_offline_mode
from analytics import (
    compute_zone_safety_scores,
    compute_category_distribution,
    compute_severity_breakdown,
    compute_analysis_method_ratio,
    detect_trending_threats,
    compute_quiet_hours,
    find_cross_zone_correlations,
)
from emergency_resources import get_resources
from rate_limiter import rate_limit_dependency

router = APIRouter(prefix="/api")


@router.post("/incidents", response_model=IncidentResponse, status_code=201, dependencies=[Depends(rate_limit_dependency)])
async def create_new_incident(body: IncidentCreate):
    incident = create_incident(body.model_dump())

    # Run AI analysis pipeline
    all_incidents = get_all_incidents()
    analysis = await analyze_incident(incident, all_incidents)

    # Apply analysis results
    alert_title = analysis.get("alert_title")
    if alert_title and alert_title.endswith("— "):
        alert_title = alert_title + incident.get("location_zone", "")
    elif not alert_title:
        from regex_fallback import _generate_alert_title
        alert_title = _generate_alert_title(
            analysis.get("incident_category", "Noise"),
            analysis.get("severity", "noise"),
            incident.get("location_zone", ""),
        )

    update_incident(incident["incident_id"], {
        "ai_processed": True,
        "is_verified_incident": analysis.get("is_verified_incident"),
        "incident_category": analysis.get("incident_category"),
        "severity": analysis.get("severity"),
        "actionable_checklist": analysis.get("actionable_checklist", []),
        "analysis_method": analysis.get("analysis_method"),
        "correlated_incident_ids": analysis.get("correlated_incident_ids", []),
        "fake_news_indicators": analysis.get("fake_news_indicators", []),
        "alert_title": alert_title,
    }, _skip_audit=True)

    return incident


@router.post("/incidents/bulk", status_code=201)
async def bulk_inject():
    """Dev mode: reload synthetic data and analyze all unprocessed incidents."""
    load_initial_data()
    unprocessed = [i for i in get_all_incidents() if not i.get("ai_processed")]
    all_incidents = get_all_incidents()

    for inc in unprocessed:
        analysis = await analyze_incident(inc, all_incidents)
        update_incident(inc["incident_id"], {
            "ai_processed": True,
            "is_verified_incident": analysis.get("is_verified_incident"),
            "incident_category": analysis.get("incident_category"),
            "severity": analysis.get("severity"),
            "actionable_checklist": analysis.get("actionable_checklist", []),
            "analysis_method": analysis.get("analysis_method"),
            "correlated_incident_ids": analysis.get("correlated_incident_ids", []),
            "fake_news_indicators": analysis.get("fake_news_indicators", []),
        })

    return {"message": f"Loaded and analyzed {len(unprocessed)} incidents"}


@router.get("/incidents", response_model=list[IncidentResponse])
async def list_incidents(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    hide_noise: bool = Query(False),
):
    return get_all_incidents(
        category=category,
        severity=severity,
        verified=verified,
        search=search,
        zone=zone,
        status=status,
        hide_noise=hide_noise,
    )


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident_detail(incident_id: str):
    inc = get_incident(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
async def patch_incident(incident_id: str, body: IncidentPatch):
    updates = body.model_dump(exclude_none=True)
    inc = update_incident(incident_id, updates)
    if inc is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.delete("/incidents/{incident_id}", status_code=204)
async def remove_incident(incident_id: str):
    if not delete_incident(incident_id):
        raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/incidents/demo-fallback", response_model=IncidentResponse, status_code=201)
async def demo_fallback(body: IncidentCreate):
    """Dev mode: create an incident using ONLY the regex fallback engine (no LLM)."""
    incident = create_incident(body.model_dump())
    all_incidents = get_all_incidents()

    result = regex_analyze(incident.get("raw_text", ""))
    result = apply_fake_news_overlay(incident, result, all_incidents)
    increment_regex_fallback()

    update_incident(incident["incident_id"], {
        "ai_processed": True,
        "is_verified_incident": result.get("is_verified_incident"),
        "incident_category": result.get("incident_category"),
        "severity": result.get("severity"),
        "actionable_checklist": result.get("actionable_checklist", []),
        "analysis_method": result.get("analysis_method"),
        "correlated_incident_ids": result.get("correlated_incident_ids", []),
        "fake_news_indicators": result.get("fake_news_indicators", []),
    }, _skip_audit=True)

    return incident


@router.get("/metrics")
async def metrics_endpoint():
    incidents = get_all_incidents()
    regex_count = sum(1 for i in incidents if "regex" in (i.get("analysis_method") or ""))
    ai_count = sum(1 for i in incidents if i.get("analysis_method") and "regex" not in i["analysis_method"])
    return {
        "ai_success_count": ai_count,
        "regex_fallback_count": regex_count,
        "total_analyzed": len(incidents),
    }


@router.get("/config/model")
async def get_model_config():
    return {
        "active_model": get_active_model(),
        "allowed_models": ALLOWED_MODELS,
        "offline_mode": is_offline_mode(),
    }


@router.post("/config/model")
async def set_model_config(body: ModelSelect):
    if body.model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model not allowed. Choose from: {ALLOWED_MODELS}")
    set_active_model(body.model)
    return {
        "active_model": get_active_model(),
        "allowed_models": ALLOWED_MODELS,
        "offline_mode": is_offline_mode(),
    }


@router.post("/config/offline")
async def toggle_offline_mode():
    set_offline_mode(not is_offline_mode())
    return {"offline_mode": is_offline_mode()}


@router.post("/incidents/upgrade-to-ai")
async def upgrade_all_to_ai():
    """Manually re-analyze all regex-processed incidents through the AI pipeline."""
    if is_offline_mode():
        raise HTTPException(status_code=400, detail="Cannot upgrade while in offline mode")

    regex_incidents = [
        i for i in get_all_incidents()
        if i.get("analysis_method") == "regex-fallback"
    ]
    if not regex_incidents:
        return {"upgraded": 0, "total_regex": 0, "message": "No regex incidents to upgrade"}

    all_incidents = get_all_incidents()
    upgraded = 0
    for inc in regex_incidents:
        try:
            analysis = await analyze_incident(inc, all_incidents)
            if analysis.get("analysis_method") != "regex-fallback":
                zone = inc.get("location_zone", "")
                alert_title = analysis.get("alert_title", "")
                if alert_title and alert_title.endswith("— "):
                    alert_title = alert_title + zone
                elif not alert_title:
                    from regex_fallback import _generate_alert_title
                    alert_title = _generate_alert_title(
                        analysis.get("incident_category", "Noise"),
                        analysis.get("severity", "noise"),
                        zone,
                    )
                update_incident(inc["incident_id"], {
                    "is_verified_incident": analysis.get("is_verified_incident"),
                    "incident_category": analysis.get("incident_category"),
                    "severity": analysis.get("severity"),
                    "actionable_checklist": analysis.get("actionable_checklist", []),
                    "analysis_method": analysis.get("analysis_method"),
                    "correlated_incident_ids": analysis.get("correlated_incident_ids", []),
                    "fake_news_indicators": analysis.get("fake_news_indicators", []),
                    "alert_title": alert_title,
                }, _skip_audit=True)
                upgraded += 1
        except Exception:
            pass

    return {"upgraded": upgraded, "total_regex": len(regex_incidents), "message": f"Upgraded {upgraded}/{len(regex_incidents)} incidents to AI"}


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident_endpoint(incident_id: str):
    inc = resolve_incident(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@router.get("/digest", response_model=DigestResponse)
async def get_digest():
    from datetime import datetime, timezone

    all_incidents = get_all_incidents()
    active = [i for i in all_incidents if i.get("status", "active") == "active" and i.get("incident_category") != "Noise"]
    resolved = [i for i in all_incidents if i.get("status") == "resolved"]
    noise = [i for i in all_incidents if i.get("incident_category") == "Noise"]

    # Determine safety level
    critical = [i for i in active if i.get("severity") == "critical"]
    high = [i for i in active if i.get("severity") == "high"]

    if critical:
        safety_level = "elevated"
    elif high:
        safety_level = "moderate"
    else:
        safety_level = "all_clear"

    # Sort active by severity priority
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "noise": 4}
    sorted_active = sorted(active, key=lambda i: severity_order.get(i.get("severity", "noise"), 4))
    top_alerts = sorted_active[:5]

    # Generate summary
    if safety_level == "all_clear":
        summary = "Your area is safe."
        if noise:
            summary += f" {len(noise)} minor report{'s were' if len(noise) != 1 else ' was'} filtered as noise."
        if resolved:
            summary += f" {len(resolved)} report{'s have' if len(resolved) != 1 else ' has'} been resolved."
    elif safety_level == "moderate":
        summary = f"There {'is' if len(active) == 1 else 'are'} {len(active)} active alert{'s' if len(active) != 1 else ''} in your area that may need your attention."
    else:
        summary = f"Elevated alert: {len(critical)} critical and {len(high)} high-priority alert{'s' if len(high) != 1 else ''} in your area. Please review the alerts below."

    # Analytics enrichment
    zone_scores = compute_zone_safety_scores(all_incidents)
    trending = detect_trending_threats(all_incidents)

    # Find quiet zones
    quiet_zones = []
    for zone_name, zone_data in zone_scores.items():
        quiet_h = compute_quiet_hours(all_incidents, zone_name)
        if quiet_h >= 8:
            quiet_zones.append({"zone": zone_name, "quiet_hours": quiet_h})
    quiet_zones.sort(key=lambda q: q["quiet_hours"], reverse=True)

    return {
        "safety_level": safety_level,
        "active_alerts": top_alerts,
        "summary": summary,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "zone_scores": zone_scores,
        "quiet_zones": quiet_zones[:3],
        "trending_up": [t for t in trending if t["direction"] == "up"][:5],
    }


# --- Analytics ---

@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview():
    all_incidents = get_all_incidents()
    active = [i for i in all_incidents if i.get("status", "active") == "active"]
    resolved = [i for i in all_incidents if i.get("status") == "resolved"]

    return {
        "zone_scores": compute_zone_safety_scores(all_incidents),
        "category_distribution": compute_category_distribution(all_incidents),
        "severity_breakdown": compute_severity_breakdown(all_incidents),
        "analysis_method_ratio": compute_analysis_method_ratio(all_incidents),
        "trending_threats": detect_trending_threats(all_incidents),
        "cross_zone_correlations": find_cross_zone_correlations(all_incidents),
        "total_incidents": len(all_incidents),
        "active_incidents": len(active),
        "resolved_incidents": len(resolved),
    }


@router.get("/analytics/zones")
async def analytics_zones():
    all_incidents = get_all_incidents()
    return compute_zone_safety_scores(all_incidents)


@router.get("/analytics/zones/{zone}")
async def analytics_zone_detail(zone: str):
    all_incidents = get_all_incidents()
    scores = compute_zone_safety_scores(all_incidents)
    if zone not in scores:
        raise HTTPException(status_code=404, detail="Zone not found")
    zone_incidents = [i for i in all_incidents if i.get("location_zone") == zone]
    return {
        **scores[zone],
        "zone": zone,
        "quiet_hours": compute_quiet_hours(all_incidents, zone),
        "category_distribution": compute_category_distribution(zone_incidents),
        "severity_breakdown": compute_severity_breakdown(zone_incidents),
    }


@router.get("/health")
async def health_check():
    import main as main_module
    all_incidents = get_all_incidents()
    startup_time = getattr(main_module, "_startup_time", None)
    uptime = None
    if startup_time:
        from datetime import datetime, timezone
        uptime = (datetime.now(timezone.utc) - startup_time).total_seconds()
    return {
        "status": "healthy",
        "version": "2.0.0",
        "incident_count": len(all_incidents),
        "uptime_seconds": uptime,
    }


@router.get("/resources")
async def get_emergency_resources(
    zone: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    return get_resources(zone=zone, category=category)


# --- Safe Circles ---

@router.post("/circles", response_model=SafeCircleResponse, status_code=201)
async def create_new_circle(body: SafeCircleCreate):
    circle = create_circle(body.model_dump())
    return circle


@router.get("/circles", response_model=list[SafeCircleResponse])
async def list_circles(user_id: str = Query(...)):
    return get_circles_for_user(user_id)


@router.post("/circles/{circle_id}/broadcast", response_model=EncryptedStatusResponse, status_code=201)
async def broadcast_status(circle_id: str, body: StatusBroadcastCreate):
    circle = get_circle(circle_id)
    if circle is None:
        raise HTTPException(status_code=404, detail="Circle not found")

    all_members = [circle["owner_id"]] + circle["member_ids"]
    if body.sender_id not in all_members:
        raise HTTPException(status_code=403, detail="Not a member of this circle")

    if body.linked_incident_id and get_incident(body.linked_incident_id) is None:
        raise HTTPException(status_code=404, detail="Linked incident not found")

    key = derive_circle_key(circle_id)
    encrypted_payload = encrypt(body.plaintext_message, key)

    status = create_status({
        "circle_id": circle_id,
        "sender_id": body.sender_id,
        "encrypted_payload": encrypted_payload,
        "linked_incident_id": body.linked_incident_id,
    })
    return status


@router.get("/circles/{circle_id}/statuses", response_model=list[DecryptedStatusResponse])
async def read_statuses(circle_id: str, user_id: str = Query(...)):
    circle = get_circle(circle_id)
    if circle is None:
        raise HTTPException(status_code=404, detail="Circle not found")

    all_members = [circle["owner_id"]] + circle["member_ids"]
    if user_id not in all_members:
        raise HTTPException(status_code=403, detail="Not a member of this circle")

    key = derive_circle_key(circle_id)
    statuses = get_statuses_for_circle(circle_id)
    return [
        {
            **s,
            "decrypted_message": decrypt(s["encrypted_payload"], key),
        }
        for s in statuses
    ]


@router.get("/circles/{circle_id}/statuses/encrypted", response_model=list[EncryptedStatusResponse])
async def read_encrypted_statuses(circle_id: str):
    """Audit view: shows raw ciphertext as stored on server."""
    circle = get_circle(circle_id)
    if circle is None:
        raise HTTPException(status_code=404, detail="Circle not found")
    return get_statuses_for_circle(circle_id)


@router.post("/circles/seed", response_model=list[SafeCircleResponse], status_code=201)
async def seed_demo_circles():
    """Seed demo circles with realistic family/neighbor messages."""
    from datetime import datetime, timedelta

    # Family Safety circle
    family = create_circle({
        "owner_id": "USR-001",
        "circle_name": "Family Safety",
        "member_ids": ["USR-002", "USR-003"],
    })
    key1 = derive_circle_key(family["circle_id"])
    base = datetime.utcnow() - timedelta(hours=3)
    family_msgs = [
        ("USR-002", "Just got home from work. Everything looks fine in our neighborhood."),
        ("USR-003", "Power is back on in Sector 3. All good here!"),
        ("USR-001", "Thanks for checking in everyone. Stay safe tonight!"),
        ("USR-002", "I'm safe — heading to bed now. Love you all."),
    ]
    for i, (sender, text) in enumerate(family_msgs):
        ts = (base + timedelta(minutes=i * 20)).isoformat() + "Z"
        create_status({
            "circle_id": family["circle_id"],
            "sender_id": sender,
            "encrypted_payload": encrypt(text, key1),
            "linked_incident_id": None,
            "timestamp": ts,
        })

    # Neighborhood Watch circle
    neighbors = create_circle({
        "owner_id": "USR-001",
        "circle_name": "Neighborhood Watch",
        "member_ids": ["USR-004", "USR-005"],
    })
    key2 = derive_circle_key(neighbors["circle_id"])
    neighbor_msgs = [
        ("USR-004", "Saw a suspicious car parked on Oak Street for 3 hours."),
        ("USR-001", "I'll keep an eye out. Which color was it?"),
        ("USR-004", "Dark blue sedan, no plates visible. Be careful out there."),
        ("USR-005", "I called the non-emergency line. They said they'd send someone."),
    ]
    for i, (sender, text) in enumerate(neighbor_msgs):
        ts = (base + timedelta(minutes=i * 15)).isoformat() + "Z"
        create_status({
            "circle_id": neighbors["circle_id"],
            "sender_id": sender,
            "encrypted_payload": encrypt(text, key2),
            "linked_incident_id": None,
            "timestamp": ts,
        })

    return [family, neighbors]
