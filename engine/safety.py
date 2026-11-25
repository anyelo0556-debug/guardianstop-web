"""Fail-closed account eligibility for the legacy broker risk engine."""


def is_demo_account(account_type: object) -> bool:
    """Return True only for an explicitly identified demo account."""
    return isinstance(account_type, str) and account_type.strip().lower() == "demo"
