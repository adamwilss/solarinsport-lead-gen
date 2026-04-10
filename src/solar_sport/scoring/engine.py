from enum import Enum


class Priority(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


DEFAULT_WEIGHTS = {
    "capacity": 20,
    "is_professional": 15,
    "has_partnerships": 15,
    "has_sustainability": 15,
    "is_multi_use": 10,
    "contact_count": 15,
    "has_sponsors": 10,
}


def score_lead(data: dict, weights: dict | None = None) -> dict:
    """Score a lead based on weighted criteria. Returns score (0-100) and priority."""
    w = weights or DEFAULT_WEIGHTS
    total = 0.0
    max_possible = sum(DEFAULT_WEIGHTS.values())

    # Capacity bands
    capacity = data.get("capacity") or 0
    if capacity >= 40000:
        total += w.get("capacity", 0)
    elif capacity >= 15000:
        total += w.get("capacity", 0) * 0.7
    elif capacity >= 5000:
        total += w.get("capacity", 0) * 0.4
    elif capacity >= 1000:
        total += w.get("capacity", 0) * 0.15

    # Boolean criteria
    for key in ["is_professional", "has_partnerships", "has_sustainability", "is_multi_use", "has_sponsors"]:
        if data.get(key):
            total += w.get(key, 0)

    # Contact count
    contact_count = data.get("contact_count", 0)
    if contact_count >= 3:
        total += w.get("contact_count", 0)
    elif contact_count >= 1:
        total += w.get("contact_count", 0) * 0.5

    score = round((total / max_possible) * 100, 1) if max_possible > 0 else 0.0

    if score >= 65:
        priority = Priority.HIGH
    elif score >= 35:
        priority = Priority.MEDIUM
    else:
        priority = Priority.LOW

    return {"score": score, "priority": priority}
