import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from data_store import load_initial_data, get_all_incidents, update_incident, auto_resolve_old_low_severity
from ai_engine import analyze_incident
from regex_fallback import regex_analyze, _generate_alert_title
from fake_news_detector import apply_fake_news_overlay
from routes import router

logger = logging.getLogger(__name__)

_startup_time: datetime | None = None


def _quick_process_unanalyzed() -> int:
    """Instantly classify unprocessed incidents with regex fallback so pages have data."""
    unprocessed = [i for i in get_all_incidents() if not i.get("ai_processed")]
    if not unprocessed:
        return 0

    all_incidents = get_all_incidents()
    for inc in unprocessed:
        result = regex_analyze(inc.get("raw_text", ""))
        result = apply_fake_news_overlay(inc, result, all_incidents)

        zone = inc.get("location_zone", "")
        alert_title = result.get("alert_title", "")
        if alert_title and alert_title.endswith("— "):
            alert_title = alert_title + zone
        elif not alert_title:
            alert_title = _generate_alert_title(
                result.get("incident_category", "Noise"),
                result.get("severity", "noise"),
                zone,
            )

        update_incident(inc["incident_id"], {
            "ai_processed": True,
            "is_verified_incident": result.get("is_verified_incident"),
            "incident_category": result.get("incident_category"),
            "severity": result.get("severity"),
            "actionable_checklist": result.get("actionable_checklist", []),
            "analysis_method": result.get("analysis_method"),
            "correlated_incident_ids": result.get("correlated_incident_ids", []),
            "fake_news_indicators": result.get("fake_news_indicators", []),
            "alert_title": alert_title,
        }, _skip_audit=True)

    return len(unprocessed)


async def _upgrade_with_llm() -> None:
    """Background task: re-analyze regex-processed incidents with LLM for better results."""
    from config import is_offline_mode
    if is_offline_mode():
        return

    regex_incidents = [
        i for i in get_all_incidents()
        if i.get("analysis_method") == "regex-fallback"
    ]
    if not regex_incidents:
        return

    logger.info("Background LLM upgrade for %d regex-processed incidents...", len(regex_incidents))
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
        except Exception as e:
            logger.warning("LLM upgrade failed for %s: %s", inc["incident_id"], str(e)[:100])
    logger.info("LLM upgrade complete: %d/%d incidents improved", upgraded, len(regex_incidents))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _startup_time
    _startup_time = datetime.now(timezone.utc)
    load_initial_data()

    # Instantly classify any unprocessed incidents with regex (non-blocking)
    count = _quick_process_unanalyzed()
    if count:
        logger.info("Quick-processed %d unanalyzed incidents with regex fallback", count)

    # Fix up alert titles that have empty zone suffix
    for inc in get_all_incidents():
        zone = inc.get("location_zone", "")
        title = inc.get("alert_title", "")
        if title and title.endswith("— "):
            update_incident(inc["incident_id"], {
                "alert_title": title + zone,
            }, _skip_audit=True)
        elif not title and inc.get("incident_category"):
            update_incident(inc["incident_id"], {
                "alert_title": _generate_alert_title(
                    inc["incident_category"],
                    inc.get("severity", "noise"),
                    zone,
                ),
            }, _skip_audit=True)

    resolved_count = auto_resolve_old_low_severity()
    if resolved_count:
        logger.info("Auto-resolved %d low-severity/noise incidents", resolved_count)

    # Background LLM upgrade disabled on startup for stable demo metrics.
    # Trigger manually via POST /incidents/bulk if needed.

    yield


app = FastAPI(
    title="Community Guardian",
    description="AI-powered community safety platform",
    version="1.0.0",
    lifespan=lifespan,
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation failed",
            "errors": errors,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
