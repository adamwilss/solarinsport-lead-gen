from solar_sport.outreach.generator import generate_drafts


def test_generate_drafts_returns_all_types():
    lead_data = {
        "stadium_name": "Old Trafford", "club_name": "Manchester United",
        "capacity": 74310, "league": "Premier League",
        "contact_name": "Sarah Jones", "contact_email": "sarah.jones@manutd.com",
        "sustainability_angle": "their carbon reduction pledges",
        "commercial_angle": "extensive sponsor portfolio",
    }
    drafts = generate_drafts(lead_data)
    types = {d["outreach_type"] for d in drafts}
    assert types == {"cold_email", "followup_1", "followup_2", "linkedin", "call_script"}


def test_generate_drafts_personalizes_content():
    lead_data = {
        "stadium_name": "Anfield", "club_name": "Liverpool",
        "capacity": 61276, "league": "Premier League",
        "contact_name": "James Brown", "contact_email": "j.brown@liverpoolfc.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Anfield" in cold_email["body"]
    assert "Liverpool" in cold_email["body"]
    assert cold_email["subject"] is not None
    assert cold_email["recipient_email"] == "j.brown@liverpoolfc.com"


def test_generate_drafts_handles_missing_contact_name():
    lead_data = {
        "stadium_name": "Wembley", "club_name": "England",
        "capacity": 90000, "league": None,
        "contact_name": None, "contact_email": "info@wembleystadium.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Wembley" in cold_email["body"]
    assert "None" not in cold_email["body"]


def test_generate_drafts_linkedin_under_600_chars():
    lead_data = {
        "stadium_name": "Emirates Stadium", "club_name": "Arsenal",
        "capacity": 60704, "league": "Premier League",
        "contact_name": "Tom White", "contact_email": "t.white@arsenal.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    linkedin = next(d for d in drafts if d["outreach_type"] == "linkedin")
    assert len(linkedin["body"]) < 600
