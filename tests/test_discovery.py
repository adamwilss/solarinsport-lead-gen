from solar_sport.discovery.wikipedia import parse_stadium_table


SAMPLE_HTML = """
<table class="wikitable sortable">
<tr><th>Stadium</th><th>Capacity</th><th>City</th><th>Club</th><th>League</th></tr>
<tr><td><a href="/wiki/Wembley">Wembley Stadium</a></td><td>90,000</td><td>London</td><td>England</td><td>N/A</td></tr>
<tr><td><a href="/wiki/Old_Trafford">Old Trafford</a></td><td>74,310</td><td>Manchester</td><td>Manchester United</td><td>Premier League</td></tr>
<tr><td><a href="/wiki/Anfield">Anfield</a></td><td>61,276</td><td>Liverpool</td><td>Liverpool</td><td>Premier League</td></tr>
</table>
"""


def test_parse_stadium_table_extracts_rows():
    results = parse_stadium_table(SAMPLE_HTML)
    assert len(results) == 3


def test_parse_stadium_table_fields():
    results = parse_stadium_table(SAMPLE_HTML)
    wembley = results[0]
    assert wembley["name"] == "Wembley Stadium"
    assert wembley["capacity"] == 90000
    assert wembley["city"] == "London"


def test_parse_stadium_table_handles_comma_in_capacity():
    results = parse_stadium_table(SAMPLE_HTML)
    assert results[1]["capacity"] == 74310


def test_parse_stadium_table_empty_html():
    results = parse_stadium_table("<html><body>No tables</body></html>")
    assert results == []


from solar_sport.discovery.pipeline import run_discovery
from solar_sport.models import Stadium, Lead


def test_run_discovery_creates_stadiums(db_session):
    fake_data = [
        {"name": "Wembley Stadium", "club_name": "England", "city": "London", "capacity": 90000, "sport": "Football", "league": None, "country": "United Kingdom"},
        {"name": "Old Trafford", "club_name": "Manchester United", "city": "Manchester", "capacity": 74310, "sport": "Football", "league": "Premier League", "country": "United Kingdom"},
    ]
    count = run_discovery(db_session, fake_data)
    assert count == 2
    assert db_session.query(Stadium).count() == 2
    assert db_session.query(Lead).count() == 2


def test_run_discovery_deduplicates(db_session):
    data = [{"name": "Wembley Stadium", "club_name": "England", "city": "London", "capacity": 90000, "sport": "Football", "league": None, "country": "United Kingdom"}]
    run_discovery(db_session, data)
    run_discovery(db_session, data)
    assert db_session.query(Stadium).count() == 1


def test_run_discovery_creates_lead_in_discovered_stage(db_session):
    data = [{"name": "Anfield", "club_name": "Liverpool", "city": "Liverpool", "capacity": 61276, "sport": "Football", "league": "Premier League", "country": "United Kingdom"}]
    run_discovery(db_session, data)
    lead = db_session.query(Lead).first()
    assert lead.stage == "discovered"
