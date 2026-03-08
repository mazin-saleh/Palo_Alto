"""Emergency resources data for Palo Alto community safety.

Static data with real Palo Alto-area contacts and category/zone-specific resources.
"""

from __future__ import annotations

GENERAL_RESOURCES = [
    {
        "name": "Emergency Services",
        "phone": "911",
        "description": "Police, Fire, Medical emergencies",
        "type": "emergency",
    },
    {
        "name": "Palo Alto Police (Non-Emergency)",
        "phone": "650-329-2413",
        "description": "Non-emergency police dispatch",
        "type": "law_enforcement",
    },
    {
        "name": "Palo Alto Fire Department",
        "phone": "650-329-2300",
        "description": "Fire prevention and emergency response",
        "type": "fire",
    },
    {
        "name": "Poison Control Center",
        "phone": "1-800-222-1222",
        "description": "24/7 poison emergency hotline",
        "type": "medical",
    },
    {
        "name": "PG&E Gas Leak Hotline",
        "phone": "1-800-743-5000",
        "description": "Report gas leaks or downed power lines",
        "type": "utility",
    },
    {
        "name": "Palo Alto Utilities",
        "phone": "650-329-2161",
        "description": "Water, electric, gas service issues",
        "type": "utility",
    },
    {
        "name": "Santa Clara County Mental Health",
        "phone": "1-800-704-0900",
        "description": "24/7 mental health crisis line",
        "type": "mental_health",
    },
    {
        "name": "988 Suicide & Crisis Lifeline",
        "phone": "988",
        "description": "24/7 suicide prevention and mental health crisis support",
        "type": "mental_health",
    },
]

CATEGORY_RESOURCES: dict[str, list[dict]] = {
    "Phishing": [
        {
            "name": "FTC Report Fraud",
            "phone": "1-877-382-4357",
            "description": "Report phishing and identity theft to the FTC",
            "type": "federal",
        },
        {
            "name": "IC3 (FBI Internet Crime)",
            "url": "https://www.ic3.gov",
            "description": "Report internet crimes to the FBI",
            "type": "federal",
        },
    ],
    "Scam": [
        {
            "name": "FTC Report Fraud",
            "phone": "1-877-382-4357",
            "description": "Report scams and fraud to the FTC",
            "type": "federal",
        },
        {
            "name": "CA Attorney General Consumer Line",
            "phone": "1-800-952-5225",
            "description": "California consumer protection complaints",
            "type": "state",
        },
    ],
    "Natural Disaster": [
        {
            "name": "American Red Cross (Bay Area)",
            "phone": "1-800-733-2767",
            "description": "Disaster relief and emergency shelter",
            "type": "nonprofit",
        },
        {
            "name": "Santa Clara County Emergency",
            "phone": "408-808-7800",
            "description": "County Office of Emergency Services",
            "type": "county",
        },
    ],
    "Physical Hazard": [
        {
            "name": "Palo Alto Code Enforcement",
            "phone": "650-329-2496",
            "description": "Report hazardous conditions on properties",
            "type": "city",
        },
    ],
    "Infrastructure Failure": [
        {
            "name": "Palo Alto Public Works",
            "phone": "650-329-2151",
            "description": "Report infrastructure issues (roads, water mains, etc.)",
            "type": "city",
        },
        {
            "name": "PG&E Outage Reporting",
            "phone": "1-800-743-5002",
            "description": "Report power outages",
            "type": "utility",
        },
    ],
    "Malware": [
        {
            "name": "CISA Cybersecurity",
            "phone": "1-888-282-0870",
            "description": "Report cybersecurity incidents to CISA",
            "type": "federal",
        },
    ],
    "Network Breach": [
        {
            "name": "CISA Cybersecurity",
            "phone": "1-888-282-0870",
            "description": "Report network intrusions and data breaches",
            "type": "federal",
        },
    ],
    "Suspicious Activity": [
        {
            "name": "Palo Alto Police (Non-Emergency)",
            "phone": "650-329-2413",
            "description": "Report suspicious activity in your neighborhood",
            "type": "law_enforcement",
        },
    ],
}

ZONE_RESOURCES: dict[str, list[dict]] = {
    "Sector 1": [
        {"name": "Downtown Palo Alto Community Center", "description": "Community programs and meeting space"},
    ],
    "Sector 2": [
        {"name": "Midtown Residents Association", "description": "Neighborhood watch and community events"},
    ],
    "Sector 3": [
        {"name": "South Palo Alto Neighborhood Association", "description": "Local safety coordination"},
    ],
    "Sector 4": [
        {"name": "Stanford University Public Safety", "phone": "650-329-8111", "description": "Campus and surrounding area safety"},
    ],
    "Sector 5": [
        {"name": "Barron Park Association", "description": "Neighborhood safety and events"},
    ],
    "Sector 6": [
        {"name": "Ventura Neighborhood Association", "description": "Community watch and updates"},
    ],
    "Sector 7": [
        {"name": "Greenmeadow Community Center", "description": "South Palo Alto community hub"},
    ],
    "Sector 8": [
        {"name": "Charleston Meadows Association", "description": "Neighborhood coordination"},
    ],
    "Sector 9": [
        {"name": "Palo Alto Foothills Community", "description": "Foothills area coordination and safety"},
    ],
}


def get_resources(
    zone: str | None = None,
    category: str | None = None,
) -> dict:
    """Return general + filtered resources for a given zone and/or category."""
    result: dict = {
        "general": GENERAL_RESOURCES,
        "category_specific": [],
        "zone_specific": [],
    }

    if category and category in CATEGORY_RESOURCES:
        result["category_specific"] = CATEGORY_RESOURCES[category]

    if zone and zone in ZONE_RESOURCES:
        result["zone_specific"] = ZONE_RESOURCES[zone]

    return result
