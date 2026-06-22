"""Shared HTML escaping for the docx-api modules."""


def esc_text(s: str | None) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s: str | None) -> str:
    return esc_text(s).replace('"', "&quot;")
