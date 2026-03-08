"""Deterministic regex-based incident classifier — Tier 3 fallback."""

from __future__ import annotations

import re

PATTERNS: list[tuple[str, str, str, re.Pattern]] = [
    # (category, severity, label, compiled_pattern)
    ("Physical Hazard", "critical", "armed/active-threat",
     re.compile(r"(?i)\b(armed|active shooter|bomb|explosion|evacuate|bomb threat)\b")),
    ("Physical Hazard", "high", "hazard",
     re.compile(r"(?i)\b(gas leak|fire|flood|chemical spill|power outage|tornado|earthquake)\b")),
    ("Phishing", "medium", "phishing",
     re.compile(r"(?i)\b(phishing|click this link|verify your account|verify your identity|credential harvesting)\b")),
    ("Scam", "medium", "scam",
     re.compile(r"(?i)\b(scam|stolen|gift card|wire money|bail money|won a .{0,30}gift card)\b")),
    ("Malware", "high", "malware",
     re.compile(r"(?i)\b(malware|ransomware|virus|trojan|adware|keylog)\b")),
    ("Network Breach", "critical", "breach",
     re.compile(r"(?i)\b(data breach|unauthorized access|hacked|compromised|exfiltrat)\b")),
    ("Natural Disaster", "high", "natural-disaster",
     re.compile(r"(?i)\b(tornado warning|hurricane|earthquake|wildfire|flash flood)\b")),
    ("Infrastructure Failure", "medium", "infrastructure",
     re.compile(r"(?i)\b(water main|power outage|transformer blew|infrastructure)\b")),
    ("Suspicious Activity", "medium", "suspicious",
     re.compile(r"(?i)\b(suspicious|casing|break.?in|bolt cutter|burglar|broke into)\b")),
]

FAKE_NEWS_PATTERNS: list[re.Pattern] = [
    re.compile(r"(?i)(100% proven|EXPOSED|NOT A DRILL|forward this to everyone|SHARE BEFORE|THEY DON'T WANT YOU TO KNOW|WAKE UP|COVERING IT UP|BEFORE THEY DELETE|BEFORE THEY SILENCE)"),
]

CHECKLISTS: dict[str, list[str]] = {
    "Phishing": [
        "Do not click any suspicious links",
        "Report the phishing attempt to your email provider",
        "Change passwords for any potentially compromised accounts",
    ],
    "Scam": [
        "Do not send money or gift cards to unknown parties",
        "Report the scam to local law enforcement",
        "Warn family and neighbors about the scam pattern",
    ],
    "Malware": [
        "Disconnect affected devices from the network immediately",
        "Run a full antivirus scan on all devices",
        "Change all passwords from a clean device",
    ],
    "Network Breach": [
        "Isolate affected systems from the network",
        "Preserve all logs for forensic analysis",
        "Notify affected users to change credentials immediately",
    ],
    "Physical Hazard": [
        "Call 911 if not already done",
        "Evacuate the immediate area and maintain safe distance",
        "Follow instructions from emergency responders",
    ],
    "Natural Disaster": [
        "Follow official emergency alerts and evacuation orders",
        "Seek shelter in a sturdy interior room",
        "Prepare emergency supplies (water, flashlight, first aid)",
    ],
    "Suspicious Activity": [
        "Do not confront the individual directly",
        "Report to local law enforcement with description and location",
        "Secure your property and alert neighbors",
    ],
    "Infrastructure Failure": [
        "Report the issue to the relevant utility provider",
        "Avoid the affected area if hazardous",
        "Check on vulnerable neighbors who may need assistance",
    ],
    "Noise": [
        "No immediate action required",
        "Consider filing a non-emergency municipal request",
        "Document the issue for future reference",
    ],
}


ALERT_TITLES: dict[tuple[str, str], str] = {
    ("Physical Hazard", "critical"): "Emergency Safety Alert",
    ("Physical Hazard", "high"): "Safety Hazard Reported",
    ("Phishing", "medium"): "Phishing Scam Reported",
    ("Phishing", "high"): "Phishing Attack Alert",
    ("Scam", "medium"): "Scam Alert in Your Area",
    ("Scam", "high"): "Urgent Scam Warning",
    ("Malware", "high"): "Malware Threat Detected",
    ("Malware", "critical"): "Critical Malware Alert",
    ("Network Breach", "critical"): "Security Breach Alert",
    ("Network Breach", "high"): "Network Security Concern",
    ("Natural Disaster", "high"): "Weather & Disaster Alert",
    ("Natural Disaster", "critical"): "Emergency Disaster Warning",
    ("Infrastructure Failure", "medium"): "Infrastructure Issue Reported",
    ("Infrastructure Failure", "high"): "Infrastructure Emergency",
    ("Suspicious Activity", "medium"): "Suspicious Activity Reported",
    ("Suspicious Activity", "high"): "Urgent Suspicious Activity",
    ("Noise", "noise"): "Community Update",
}


def _generate_alert_title(category: str, severity: str, zone: str) -> str:
    """Generate a plain-language alert title from category, severity, and zone."""
    title = ALERT_TITLES.get((category, severity))
    if title:
        return f"{title} — {zone}"
    # Fallback: use category name
    return f"{category} Report — {zone}"


def regex_analyze(raw_text: str) -> dict:
    """Classify an incident using deterministic regex patterns."""
    for category, severity, _label, pattern in PATTERNS:
        if pattern.search(raw_text):
            return {
                "is_verified_incident": severity in ("critical", "high"),
                "incident_category": category,
                "severity": severity,
                "actionable_checklist": CHECKLISTS.get(category, CHECKLISTS["Noise"]),
                "fake_news_indicators": _detect_fake_news_markers(raw_text),
                "analysis_method": "regex-fallback",
                "alert_title": _generate_alert_title(category, severity, ""),
            }

    # Default: Noise
    return {
        "is_verified_incident": False,
        "incident_category": "Noise",
        "severity": "noise",
        "actionable_checklist": CHECKLISTS["Noise"],
        "fake_news_indicators": _detect_fake_news_markers(raw_text),
        "analysis_method": "regex-fallback",
        "alert_title": _generate_alert_title("Noise", "noise", ""),
    }


def _detect_fake_news_markers(text: str) -> list[str]:
    markers: list[str] = []
    for p in FAKE_NEWS_PATTERNS:
        for match in p.finditer(text):
            markers.append(match.group(0).strip())

    # Count ALL CAPS words (3+ letters)
    caps_words = [w for w in text.split() if w.isupper() and len(w) >= 3]
    if len(caps_words) >= 3:
        markers.append(f"Excessive ALL-CAPS words ({len(caps_words)} detected)")

    # Excessive exclamation marks
    excl_count = text.count("!")
    if excl_count >= 3:
        markers.append(f"Excessive exclamation marks ({excl_count} detected)")

    return markers
