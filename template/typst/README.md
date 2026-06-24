# Abstract submission template (Typst)

[Typst](https://typst.app) counterpart of the Word (`../docx/`) and LaTeX
(`../tex/`) templates. Same one-page extended abstract — bold centred title,
superscript-marked authors, italic affiliations, e-mails, keywords, continuous
abstract prose, a booktabs-style table, a **vector** `cetz-plot` figure, and an
IEEE-numbered bibliography.

| File | Purpose |
|------|---------|
| `confabs.typ` | The reusable template function (`abstract-doc`, `affil`) |
| `abstract.typ` | Blank template — fill in and submit. Grey text marks placeholders |
| `abstract-example.typ` | Fully filled example (mirrors the docx/tex examples) |
| `references.bib` | Bibliography (BibLaTeX; self-contained copy) |
| `.gitignore` | Ignores compiled `*.pdf` |

## Build

```sh
typst compile abstract.typ          # or abstract-example.typ
typst watch abstract.typ            # live preview
```

First compile downloads the `cetz` / `cetz-plot` packages (cached afterwards),
so it needs network access once. Typst auto-uses Times New Roman; the
`TeX Gyre Termes` fallback warning on systems without it is harmless.

## Filling it in

Edit the arguments in the `#show: abstract-doc.with(...)` call:

| Argument | Meaning |
|----------|---------|
| `title` | Abstract title |
| `authors` | Names; mark affiliations with `#super[1]`, presenter with `#super[\*]` |
| `affiliations` | `(affil([1], [...]), affil([2], [...]))`, in order |
| `email` | Comma-separated, in author order (escape `@` as `\@`) |
| `keywords` | 3–6, comma-separated |

Then write the abstract as continuous prose (no section headings). A4, 2.5 cm
margins, Times throughout. Two pages maximum.
