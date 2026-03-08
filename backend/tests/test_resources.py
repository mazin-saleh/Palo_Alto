"""Tests for the emergency resources module."""

import pytest

from emergency_resources import get_resources, GENERAL_RESOURCES


class TestResources:
    def test_general_resources_returned(self):
        """General resources should always be included."""
        result = get_resources()
        assert len(result["general"]) > 0
        assert result["general"] == GENERAL_RESOURCES
        # Should include 911
        phones = [r["phone"] for r in result["general"] if "phone" in r]
        assert "911" in phones

    def test_zone_filter_works(self):
        """Zone-specific resources returned for valid zone."""
        result = get_resources(zone="Sector 4")
        assert len(result["zone_specific"]) > 0
        assert any("Stanford" in r["name"] for r in result["zone_specific"])

    def test_zone_filter_invalid(self):
        """Invalid zone returns empty zone_specific list."""
        result = get_resources(zone="Sector 99")
        assert result["zone_specific"] == []

    def test_category_filter_works(self):
        """Category-specific resources returned for valid category."""
        result = get_resources(category="Phishing")
        assert len(result["category_specific"]) > 0
        assert any("FTC" in r["name"] for r in result["category_specific"])

    def test_category_filter_invalid(self):
        """Invalid category returns empty category_specific list."""
        result = get_resources(category="Unknown")
        assert result["category_specific"] == []

    def test_combined_filters(self):
        """Both zone and category filters work together."""
        result = get_resources(zone="Sector 4", category="Natural Disaster")
        assert len(result["general"]) > 0
        assert len(result["zone_specific"]) > 0
        assert len(result["category_specific"]) > 0
