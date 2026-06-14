// Patterns used across extraction modules
export const EMAIL_RE = /[\w.+\-À-žĄ-ż]+@[\w.\-À-žĄ-ż]+\.\w{2,}/;
export const EMAIL_RE_STRICT = /^[\w.+\-À-žĄ-ż]+@[\w.\-À-žĄ-ż]+\.\w{2,}$/;
export const EMAILS_PREFIX_RE =
	/^e-?mails?\s*(of\s+the\s+all\s+authors?)?\s*:/i;
export const KEYWORDS_RE =
	/^\s*(?:key\s*words?|keywords?|słowa\s*kluczowe)\s*[:：]?\s*/i;
export const BODY_START_RE =
	/^\s*(?:abstract|introduction|ABSTRACT|INTRODUCTION)\s*$/i;
export const SECTION_RE = /^\d+\.\s/;
export const AFF_MARKER_RE = /^[\d*†‡§]+[).:]?\s*/;
export const INSTITUTION_RE =
	/university|institute|politechnika|akademi|laboratory|department|faculty|research\s*network|łukasiewicz/i;
export const SUSPICIOUS_NAME_CHARS = /[(){}[\]<>@#$%^&*=+\\|/~`"]/;
export const CAPITALIZED_START = /^[A-ZÀ-ŽĄ-Ż]/;

// Magic numbers
export const MAX_TITLE_LENGTH = 300;
export const MAX_NAME_LENGTH = 20;
export const MAX_PERSON_NAME_LENGTH = 50;
export const MAX_AFFILIATION_CONTINUATION_LENGTH = 150;
export const MAX_AFFILIATION_LINE_LENGTH = 200;
export const SMALL_FONT_SIZE_HP = 16;
export const HEADER_SCAN_PARAGRAPHS = 6;
export const TOKENS_PER_AUTHOR = 70;
export const TOKEN_OVERHEAD = 100;
export const MIN_TOKEN_ESTIMATE = 512;
export const MAX_TOKEN_ESTIMATE = 2048;
export const MAX_HEADER_FALLBACK = 2000;
