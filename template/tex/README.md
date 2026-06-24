# Abstract submission template (LaTeX)

LaTeX counterpart of the Word template in `../docx/`. Same one-page extended
abstract — bold centred title, superscript-marked authors, italic affiliations,
e-mails, keywords, continuous abstract prose, a `booktabs`+`siunitx` table, a
**vector** `pgfplots`/TikZ figure, and `biblatex` references.

| File | Purpose |
|------|---------|
| `confabs.cls` | The document class (fonts, geometry, title block, captions, packages) |
| `abstract.tex` | Blank template — fill in and submit. Grey text marks placeholders |
| `abstract-example.tex` | Fully filled example (mirrors `../docx/abstract-example.docx`) |
| `references.bib` | Shared bibliography (BibLaTeX) |
| `.gitignore` | Ignores build artifacts |

## Build

```sh
latexmk -pdf abstract.tex          # or abstract-example.tex
```

`latexmk` runs `pdflatex` + `biber` automatically. Requires a TeX distribution
(TeX Live / MiKTeX) with `newtx`, `pgfplots`, `siunitx`, `booktabs`, `biblatex`
and `biber` — all standard.

## Filling it in

Edit the header commands in the preamble:

| Command | Meaning |
|---------|---------|
| `\title{...}` | Abstract title |
| `\author{...}` | Names; mark affiliations with `\textsuperscript{1}`, presenter with `\textsuperscript{*}` |
| `\affiliation{1}{...}` | One per affiliation, in order |
| `\email{...}` | Comma-separated, in author order |
| `\keywords{...}` | 3–6, comma-separated |

Then write the abstract as continuous prose (no section headings). A4, 2.5 cm
margins, Times throughout. Two pages maximum.
