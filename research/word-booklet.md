# Word booklet generation for the printed program

Ticket: #96 (map #94). Question: build the printed-program `.docx` in code with `docx`, fill an organizer-uploadable template with `easy-template-x`, or a hybrid of the two?

Installed versions (from `pnpm-lock.yaml`): `docx@9.15.2` (a **devDependency** today, used only by `e2e/scripts/create-extraction-fixtures.ts`) and `easy-template-x@8.0.0` (a dependency, used by `src/features/documents/server/generate.ts` to fill admin-uploaded templates before `docx-api` `POST /v1/render-pdf` turns them into PDF with LibreOffice).

Sources are the installed package files (version-exact), the libraries' repos, and a smoke test run on 2026-11-06 against LibreOffice 25.2.3.2 inside the `suberus-docx-api` container (the production renderer) and Microsoft Word 365 (Windows, via COM).

## Answer

**Build the booklet in code with `docx` (option a).** It is the only option that can draw the at-a-glance grid: rooms as a variable number of columns, with parallel and long sessions merged across rows and columns. It also covers every other requirement natively in 9.15: named styles, a landscape section inside a portrait booklet, a TOC with page numbers already filled in, a header logo, and a native Word DRAFT watermark. The smoke test produced the same 5-page booklet in Word and in production LibreOffice.

**Rule out easy-template-x for this export.** It cannot produce merged cells. Its column loop corrupts the table grid. It cannot set `updateFields`, so a template's TOC stays stale.

**Keep the hybrid for later, but build it on `docx`'s own `patchDocument`, not on easy-template-x.** The organizer's `.docx` would supply the cover, styles, headers and section layout, and code would insert the generated grid and program at `{{placeholders}}`. That needs one template rule, described below.

## Comparison

| Requirement                              | (a) `docx` code-built                                                                                                                                                                                | (b) easy-template-x template                                                                                                                          | (c) hybrid via `docx` `patchDocument`                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Named paragraph and character styles     | Yes: `styles.paragraphStyles` / `characterStyles` [1]                                                                                                                                                | Yes: whatever the template defines                                                                                                                    | Yes: the template's styles are kept, and code can reference them by id           |
| Named **table** styles                   | Reference only: `Table.style` takes the id of a style that comes from `externalStyles` (a styles.xml string); there is no API to define one [1]                                                      | Yes, if the template defines it                                                                                                                       | Yes, from the template                                                           |
| Landscape grid inside a portrait booklet | Yes: one section per orientation (verified)                                                                                                                                                          | Static only: the organizer lays out the sections                                                                                                      | Yes, if each placeholder is not the last paragraph of its section (see Gotcha)   |
| Merged cells (rowSpan/colSpan)           | Yes: `TableCell.rowSpan` / `columnSpan` write `vMerge` and `gridSpan`, and docx adds the continuation cells itself [1] (verified)                                                                    | **No.** No source in the library writes `gridSpan`, `vMerge` or `tblGrid` [2]                                                                         | Yes: the table is built by `docx`                                                |
| Variable room columns                    | Yes: build the columns from data                                                                                                                                                                     | Column loop exists, but it clones `w:tc` by position and leaves `tblGrid` as it was [3] (verified broken, see below)                                  | Yes                                                                              |
| TOC                                      | `TableOfContents` with entries pre-filled. With `pageNumbers: estimatePageNumbers` the page numbers are written into the field and it is saved clean, so there is no update prompt [1][4] (verified) | Whatever the template's TOC holds. It processes only the body, headers, footers and charts, never `settings.xml`, so it cannot set `updateFields` [5] | `patchDocument` also accepts `pageNumbers: estimatePageNumbers` [4] (not tested) |
| Header/footer logo                       | `ImageRun` in `Header` (verified)                                                                                                                                                                    | Image tag, or alt-text placeholder image, also in headers and footers [5][6]                                                                          | Logo in the template, or patched in                                              |
| DRAFT watermark                          | `TextWatermark` from `docx/watermarks` writes the same VML WordArt (`PowerPlusWaterMarkObject`, `_x0000_t136`) that Word's Design › Watermark writes [7] (verified in both renderers)                | Must be in the template, or injected as raw XML                                                                                                       | `TextWatermark` patched into a header placeholder, or present in the template    |
| Repeating header row, keep-together      | `tableHeader`, `cantSplit`, `keepNext` on rows [1]                                                                                                                                                   | From the template row                                                                                                                                 | Yes                                                                              |
| Runtime                                  | Pure JS, in-process; no sidecar needed for `.docx`                                                                                                                                                   | Pure JS                                                                                                                                               | Pure JS                                                                          |

## Verified behaviour (smoke test)

Script: portrait cover and TOC → landscape "Program at a glance" with one table per day (`tableHeader` row, a plenary with `columnSpan: 3`, a session with `rowSpan: 2`, a break spanning all rooms, `pageBreakBefore` per day) → portrait "Detailed program" with custom paragraph and character styles. Every section has a header with a PNG logo and `TextWatermark({ text: "DRAFT" })`, and a page-number footer. `pageNumbers: estimatePageNumbers`.

- **OOXML:** `pgSz` portrait / landscape / portrait; 4× `gridSpan=3`; `vMerge restart`/`continue` pairs; TOC PAGEREF results filled (2, 2, 3, 4, 4, 4) and no `w:dirty`.
- **LibreOffice 25.2.3.2 (container):** 5 pages, 595×842 / 842×595 ×2 / 595×842. TOC numbers correct. Merged cells render correctly. DRAFT is drawn diagonally behind the text on every page. The logo appears in the header.
- **Word 365:** 5 pages, sections end on pages 1/3/5 with orientation portrait/landscape/portrait. The TOC text is identical to LibreOffice's, with no update prompt. The header shapes are named `PowerPlusWaterMarkObject…`, so Word treats DRAFT as its own watermark and Design › Watermark › Remove works. The only rendering difference: one line reflows at the page 4/5 break.
- **Fonts:** docx writes empty `w:docDefaults` (no `rFonts`), so both apps fall back to Times New Roman (Word) / Liberation Serif (LibreOffice, metric-compatible). The container has only DejaVu and Liberation fonts (`fc-list`). Set an explicit default font, and pick one with a metric-compatible container font (Arial ↔ Liberation Sans, Times New Roman ↔ Liberation Serif), or install fonts in the image. Otherwise LibreOffice output drifts from Word's and from the page-number estimate.

## Why easy-template-x is ruled out for the grid

- Loop strategies (`src/plugins/loop/strategy/`): repeat the rows between the tags; repeat a **column** when the open and close tags sit in the same column but different rows; otherwise repeat content, paragraphs or list items [3].
- `LoopTableColumnsStrategy` picks cells by their index in `w:tr` and clones them into every row. It never reads `gridSpan`, `vMerge` or `w:tblGrid`. A grep for those names across all of `src/` returns nothing [2][3].
- Empirical check: a template with a room column loop and one merged row (`gridSpan=2`), filled with 3 rooms. Every row came out with 4 cells, but `tblGrid` still declared 3 columns, and the merged cell was cloned 3 times. That row now spans 7 grid columns against 4 in the others, which is a corrupt grid.
- Cells are filled by scope lookup, without a (time, room) join. A row loop over times cannot contain a per-row column loop, because the column strategy repeats whole table columns across all rows. A rooms×times grid with merges therefore cannot be expressed. The only way out is to inject a whole `<w:tbl>` through the raw-XML plugin (`replaceParagraph: true`) [8], which means building the table XML in code anyway, and `docx` already does that properly.
- easy-template-x would be adequate for the _Detailed program_ list alone (nested day → session → slot loops). Splitting the booklet across two engines buys nothing.

## Gotcha for any template-based (hybrid) approach

A mid-document section break is stored in the `w:sectPr` inside the `w:pPr` of the section's **last paragraph** (ECMA-376 Part 1, §17.6). If a placeholder is that paragraph, replacing it deletes the section break.

Observed: a `{{glance}}` placeholder alone in a landscape section, replaced through `PatchType.DOCUMENT`, gave a document with no landscape section. Adding an empty paragraph after the placeholder kept it. easy-template-x raw XML with `replaceParagraph: true` removes the containing paragraph the same way [8].

So the template contract must say "placeholder paragraph is never the last paragraph of a section", or upload validation must check it.

## Facts later tickets depend on

1. `docx` must move from `devDependencies` to `dependencies`.
2. `.docx` generation needs no sidecar and no LibreOffice. It is pure JS in the Node process (`Packer.toBuffer`). A PDF of the booklet, if ever wanted, can reuse `docx-api` `/v1/render-pdf`. This bears on the sync-vs-pg-boss open question: the `.docx` part is CPU-only and in-process.
3. The DRAFT mark in Word = `TextWatermark` in each section's default header (`docx/watermarks` subpath export). It is removable by the organizer in Word.
4. Named styles: paragraph and character styles are defined in code by id and name. Table styles must arrive as styles.xml (`externalStyles`) or be skipped in favour of direct cell formatting plus a paragraph style on cell text.
5. The TOC needs `pageNumbers: estimatePageNumbers` (`docx/layout`). The estimator stops at fonts outside its width tables (e.g. Garamond), at hyphenation and at floating objects, and then leaves later numbers blank. `estimatePageNumbersWith({ guess: true })` or bundling font files avoids that [4]. Keep the default font to Calibri, Arial or Times New Roman.
6. The grid needs app-side layout logic: the union of slot boundaries across rooms becomes time rows, sessions become `rowSpan`, and plenaries and breaks become `columnSpan`. The libraries do not do this.
7. One table per day, with `pageBreakBefore` on the day heading and a repeating `tableHeader` row.

## Not verified

- Word for Mac, Google Docs and LibreOffice versions other than 25.2/26.2.
- `patchDocument` with `pageNumbers` on a real organizer template (the API exists [4]; not exercised).
- Realistic sizes: many rooms (column width on landscape A4), long days, hundreds of slots (render time, estimator stability).
- Whether LibreOffice refreshes a stale template TOC on conversion. It only matters for option (b), which is ruled out.
- easy-template-x images in headers. This comes from source reading [5][6], not from a run.

## Sources

1. `docx@9.15.2` `dist/index.d.ts`: `IPropertiesOptions` (`externalStyles`, `styles`, `features.updateFields`, `pageNumbers`), `IStylesOptions` (paragraph and character styles only), `ITableCellPropertiesOptionsBase` (`rowSpan`, `columnSpan`, `verticalMerge`), `ITableOptions.style` ("The id of a table style, such as one from `externalStyles`"), `ITableRowOptions` (`keepNext`, `cantSplit`, `tableHeader`), `TableOfContents` (`cachedEntries`, `beginDirty`), `patchDocument` / `PatchType.DOCUMENT`. Repo: https://github.com/dolanmiu/docx, docs: https://docx.js.org
2. `easy-template-x@8.0.0` `src/`: no occurrence of `gridSpan`, `vMerge`, `tblGrid` or `gridCol`. Repo: https://github.com/alonrbar/easy-template-x
3. `easy-template-x@8.0.0` `src/plugins/loop/strategy/loopTableColumnsStrategy.ts`, `loopTableRowsStrategy.ts`; README "Controlling loop behavior".
4. `docx@9.15.2` `dist/layout.d.ts`: `estimatePageNumbers` (usable with `Document` and `patchDocument`; its limits and the `guess` option); `TableOfContents` doc comment in `dist/index.d.ts`.
5. `easy-template-x@8.0.0` `src/office/docx.ts` `getContentParts()`: main document plus Header, Footer and Chart parts only.
6. easy-template-x README "Image plugin" (text-tag and alt-text placeholder modes).
7. `docx@9.15.2` `dist/watermarks.d.ts` (`TextWatermark`, `ImageWatermark`) and `dist/watermarks.mjs` (shape id `PowerPlusWaterMarkObject`, shapetype `_x0000_t136`).
8. `easy-template-x@8.0.0` `src/plugins/rawXml/rawXmlPlugin.ts` (`replaceParagraph` removes the containing `w:p`).
9. ECMA-376 Part 1 (WordprocessingML), §17.6 Sections: `sectPr` in a paragraph's properties ends a section. https://ecma-international.org/publications-and-standards/standards/ecma-376/
10. Repo: `src/features/documents/server/generate.ts` (current easy-template-x use), `services/docx-api/core/libreoffice.py` (`soffice --headless --convert-to pdf`, isolated profile).
