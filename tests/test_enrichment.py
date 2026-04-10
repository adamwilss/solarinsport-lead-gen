from solar_sport.enrichment.scraper import extract_emails, extract_contact_links, find_contact_page_url


SAMPLE_PAGE = """
<html><body>
<p>Contact us at info@exampleclub.com or partnerships@exampleclub.com</p>
<a href="/contact">Contact Us</a>
<a href="/commercial/partnerships">Partnerships</a>
<a href="/about">About</a>
</body></html>
"""


def test_extract_emails():
    emails = extract_emails(SAMPLE_PAGE)
    assert "info@exampleclub.com" in emails
    assert "partnerships@exampleclub.com" in emails


def test_extract_emails_deduplicates():
    html = "<p>test@example.com and test@example.com</p>"
    assert len(extract_emails(html)) == 1


def test_extract_contact_links():
    links = extract_contact_links(SAMPLE_PAGE, base_url="https://exampleclub.com")
    urls = [link["url"] for link in links]
    assert "https://exampleclub.com/contact" in urls
    assert "https://exampleclub.com/commercial/partnerships" in urls


def test_extract_contact_links_excludes_irrelevant():
    links = extract_contact_links(SAMPLE_PAGE, base_url="https://exampleclub.com")
    urls = [link["url"] for link in links]
    assert "https://exampleclub.com/about" not in urls


def test_find_contact_page_url():
    url = find_contact_page_url(SAMPLE_PAGE, base_url="https://exampleclub.com")
    assert url == "https://exampleclub.com/contact"
