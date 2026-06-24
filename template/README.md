# Abstract submission template

Professional extended-abstract Word template for authors — title, authors,
affiliations, keywords, continuous abstract prose, a **table**, a **figure**,
and a numbered **References** list with in-text citations. Laid out so an
uploaded file is auto-parsed by Suberus's DOCX extractor (title / authors /
affiliations / keywords filled in without re-typing).

| File | Purpose |
|------|---------|
| `docx/abstract-template.docx` | Blank template with grey placeholder hints + a placeholder table/figure — give this to authors |
| `docx/abstract-example.docx` | Same layout, fully filled in — reference of the expected result |
| `build_template.py` | Source of both files (`py template/build_template.py`) |
| `verify_roundtrip.py` | Checks the example parses into all extractor zones |

## Required order (do not reorder — the extractor reads top-down)

1. **Title** — first line, Times New Roman 14 pt bold, centred, ≤ 2 lines.
2. **Authors** — 12 pt centred; superscript numerals link to affiliations; `*` = presenting author.
3. **Affiliations** — 9 pt italic; each line starts with its number + institution.
4. **E-mails** — `E-mails:` line, same order as authors.
5. **Keywords** — `Keywords:` line, 3–6 comma-separated.
6. **Abstract** — `Abstract` heading + short summary, then the numbered sections.

## Body — the whole body *is* the abstract

Continuous prose, **no paper-section headings** (no Introduction / Methods /
Results / Conclusions). One flowing narrative: problem → method → results →
conclusion. It may embed:

- **Table** — caption *above* (`Table 1.`), 9 pt centred, `Table Grid` style.
- **Figure** — caption *below* (`Fig. 1.`), image centred, 11 cm wide.
- **References** — the only heading; numbered `[1]`, hanging indent; cite in text as `[1]`, `[2]`.

A4, 2.5 cm margins, Times New Roman throughout. Two pages maximum.
