from solar_sport.scoring.engine import score_lead, DEFAULT_WEIGHTS, Priority


def test_score_lead_high_capacity_high_score():
    data = {
        "capacity": 60000, "is_professional": True, "has_partnerships": True,
        "has_sustainability": True, "is_multi_use": False, "contact_count": 3, "has_sponsors": True,
    }
    result = score_lead(data)
    assert result["score"] > 70
    assert result["priority"] == Priority.HIGH


def test_score_lead_small_venue_low_score():
    data = {
        "capacity": 2000, "is_professional": False, "has_partnerships": False,
        "has_sustainability": False, "is_multi_use": False, "contact_count": 0, "has_sponsors": False,
    }
    result = score_lead(data)
    assert result["score"] < 30
    assert result["priority"] == Priority.LOW


def test_score_lead_medium_venue():
    data = {
        "capacity": 15000, "is_professional": True, "has_partnerships": False,
        "has_sustainability": True, "is_multi_use": True, "contact_count": 1, "has_sponsors": False,
    }
    result = score_lead(data)
    assert 30 <= result["score"] <= 70
    assert result["priority"] == Priority.MEDIUM


def test_score_lead_custom_weights():
    data = {
        "capacity": 5000, "is_professional": False, "has_partnerships": False,
        "has_sustainability": True, "is_multi_use": False, "contact_count": 2, "has_sponsors": False,
    }
    weights = {**DEFAULT_WEIGHTS, "has_sustainability": 50}
    result = score_lead(data, weights=weights)
    assert result["score"] > 50


def test_score_lead_returns_all_fields():
    data = {
        "capacity": 30000, "is_professional": True, "has_partnerships": True,
        "has_sustainability": False, "is_multi_use": False, "contact_count": 2, "has_sponsors": True,
    }
    result = score_lead(data)
    assert "score" in result
    assert "priority" in result
    assert isinstance(result["score"], float)
