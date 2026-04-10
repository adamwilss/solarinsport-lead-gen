import re

from bs4 import BeautifulSoup


def parse_stadium_table(html: str) -> list[dict]:
    """Parse Wikipedia stadium table HTML into structured dicts."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_="wikitable")
    if not tables:
        return []

    results = []
    for table in tables:
        headers = [th.get_text(strip=True).lower() for th in table.find_all("tr")[0].find_all("th")]
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) < len(headers):
                continue
            raw = {headers[i]: cells[i].get_text(strip=True) for i in range(len(headers))}
            stadium = _normalize_row(raw)
            if stadium and stadium.get("name"):
                results.append(stadium)
    return results


def _normalize_row(raw: dict) -> dict:
    name = raw.get("stadium") or raw.get("ground") or raw.get("name") or ""
    capacity = _parse_capacity(raw.get("capacity", "0"))
    return {
        "name": name.strip(),
        "club_name": (raw.get("club") or raw.get("team") or "").strip() or None,
        "city": (raw.get("city") or raw.get("location") or "").strip() or None,
        "capacity": capacity,
        "league": (raw.get("league") or raw.get("competition") or "").strip() or None,
        "sport": "Football",
        "country": "United Kingdom",
    }


def _parse_capacity(text: str) -> int | None:
    cleaned = re.sub(r"[^\d]", "", text.split("[")[0])
    return int(cleaned) if cleaned else None


async def fetch_uk_stadiums() -> list[dict]:
    """Fetch and parse UK football stadium data from Wikipedia."""
    import httpx

    urls = [
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_England",
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_Scotland",
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_Wales",
    ]
    all_stadiums = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in urls:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                all_stadiums.extend(parse_stadium_table(resp.text))
    return all_stadiums
