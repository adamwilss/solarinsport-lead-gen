from solar_sport.outreach.templates import render_template

TEMPLATE_MAP = {
    "cold_email": "cold_email.jinja2",
    "followup_1": "followup_1.jinja2",
    "followup_2": "followup_2.jinja2",
    "linkedin": "linkedin_message.jinja2",
    "call_script": "call_script.jinja2",
}


def generate_drafts(lead_data: dict) -> list[dict]:
    """Generate all outreach drafts for a lead."""
    drafts = []
    for outreach_type, template_file in TEMPLATE_MAP.items():
        rendered = render_template(template_file, lead_data)

        subject = None
        if outreach_type in ("cold_email", "followup_1", "followup_2"):
            lines = rendered.split("\n")
            for line in lines:
                if line.startswith("Subject:"):
                    subject = line.replace("Subject:", "").strip()
                    rendered = "\n".join(l for l in lines if not l.startswith("Subject:")).strip()
                    break

        drafts.append({
            "outreach_type": outreach_type,
            "subject": subject,
            "body": rendered,
            "recipient_email": lead_data.get("contact_email"),
        })
    return drafts
