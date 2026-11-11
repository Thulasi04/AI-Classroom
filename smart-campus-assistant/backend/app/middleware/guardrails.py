import re
from dataclasses import dataclass


INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above|prior)\s+instructions",
    r"disregard\s+(your\s+)?(system|previous)\s+(prompt|instructions|rules)",
    r"reveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions|secret\s+key|api\s+key)",
    r"bypass\s+(security|auth|authorization|guardrails|rbac)",
    r"act\s+as\s+(an?\s+)?(root|superadmin|database\s+admin)",
    r"(drop\s+table|union\s+select|;\s*delete\s+from|;\s*update\s+users)",
    r"dump\s+(all\s+)?(users|students|passwords|database|sqlite)",
]

OTHER_STUDENT_PATTERNS = [
    r"(show|get|give|find|list|fetch)\s+(me\s+)?(other|all|another)\s+students?(\'?s)?\s*(marks|attendance|profile|phone|email|cgpa|details)",
    r"marks\s+of\s+(student|register)\s+",
    r"attendance\s+of\s+(student|register)\s+",
]

REGISTER_NO_REGEX = re.compile(r"\b\d{2}[A-Z]{2,4}\d{3,5}\b", re.IGNORECASE)
SECRET_REDACTION_PATTERNS = [
    (re.compile(r"gsk_[A-Za-z0-9_-]{12,}"), "[REDACTED_GROQ_KEY]"),
    (re.compile(r"lsv2_[A-Za-z0-9_-]{12,}"), "[REDACTED_LANGSMITH_KEY]"),
    (re.compile(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}"), "[REDACTED_HASH]"),
]


@dataclass
class GuardrailResult:
    allowed: bool
    reason: str = ""


def check_input_guardrails(
    query: str,
    user_role: str,
    own_register_number: str | None = None,
) -> GuardrailResult:
    text = (query or "").strip()
    if not text:
        return GuardrailResult(allowed=False, reason="Query cannot be empty.")

    lowered = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            return GuardrailResult(
                allowed=False,
                reason="Request blocked by prompt-injection and security guardrails.",
            )

    if user_role != "admin":
        for pattern in OTHER_STUDENT_PATTERNS:
            if re.search(pattern, lowered, re.IGNORECASE):
                return GuardrailResult(
                    allowed=False,
                    reason="Access denied: You can only query your own personal student records.",
                )

        found_reg_nos = REGISTER_NO_REGEX.findall(text)
        for reg_no in found_reg_nos:
            if not own_register_number or reg_no.upper() != own_register_number.upper():
                return GuardrailResult(
                    allowed=False,
                    reason=(
                        f"PII protection active: Access to student record '{reg_no.upper()}' "
                        "is restricted to the owning student or authorized administrators."
                    ),
                )

    return GuardrailResult(allowed=True)


def sanitize_output_pii(text: str) -> str:
    cleaned = text or ""
    for pattern, replacement in SECRET_REDACTION_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)
    return cleaned

