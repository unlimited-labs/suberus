# Abstract templates

One-page extended abstract for conference submission, in three formats. Each
format has a blank template and a filled example with identical layout.

| Format | Dir | Build |
|--------|-----|-------|
| Word | `docx/` | |
| LaTeX | `tex/` | `latexmk -pdf abstract.tex` (needs `biber`) |
| Typst | `typst/` | `typst compile abstract.typ` (fetches `cetz-plot` once) |


## Layout (all formats)

- **Title** — bold, centred, ≤ 2 lines.
- **Authors** — superscript markers link to affiliations; `*` = presenting.
- **Affiliations** — italic, each prefixed by its marker.
- **E-mails** — one line, author order.
- **Keywords** — 3–6, comma-separated.
- **Body** — continuous prose, no section headings. Table caption above, figure
  caption below; references numbered `[1]`, cited in order of appearance.
- A4, 2.5 cm margins, Times, two pages max.