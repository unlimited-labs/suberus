# Generating IDML from program data

Research for #95 (map #94, printed program export). Question: how to produce a valid InDesign
Markup Language package from the planner's program data, with named neutral styles, a
"Program at a glance" grid, a "Detailed program", a logo and a DRAFT mark. Which runtime?

Researched 2026-11-06. No InDesign was available, so nothing here was opened in InDesign.
Items that need a real InDesign check are listed at the end.

## Answer

Generate IDML **from scratch, in-process in Node**, with a small hand-written generator: XML
strings for about ten package parts, zipped with `archiver`, which is already a dependency.
Do not use a library. No Node or Python library builds tables and styles from scratch at a
maintenance level worth depending on. IDML import is built to accept minimal files and fill
in everything else from built-in defaults. Do not route this through the `docx-api` sidecar.
It is optional in deployment (`DOCX_API_URL` is `.optional()` in `src/env.ts`), and Python
gives nothing here that Node lacks.

Do not try to paginate exactly. Generate an estimated number of pages whose text frames are
threaded into one story, and turn Smart Text Reflow on in the document's `TextPreference`.
The designer restyles anyway, and InDesign adds or removes pages when that editing happens.

## Sources

| Ref     | Source                                                                                                                                                                                                                                  | Notes                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [SPEC]  | Adobe, _IDML File Format Specification_, v8.0 (CS6, 2012), 430 pp. Archived Adobe copy: <http://web.archive.org/web/20170830042739/http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/indesign/sdk/cs6/idml/idml-specification.pdf> | Last standalone spec Adobe published. The live Adobe URLs now return 404. Later docs exist only as HTML inside the InDesign SDK. |
| [COOK]  | Adobe, _IDML Cookbook_ (CS6). Archived: <http://web.archive.org/web/20170830042809/http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/indesign/sdk/cs6/idml/idml-cookbook.pdf>                                                      | Practical recipes: minimal "Hello World" package, UCF rules, tables, threading, images, validation.                              |
| [STR]   | Adobe Help, "Set up smart text reflow" (updated 2026-06-02): <https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/set-up-smart-text-reflow.html>                                                           |                                                                                                                                  |
| [TBL]   | Adobe Help, "Break tables across frames" (2026-06-02): <https://helpx.adobe.com/indesign/desktop/add-tables-and-data/format-tables/break-tables-across-frames.html>                                                                     |                                                                                                                                  |
| [LOAD]  | Adobe Help, "Import table and cell styles" (2026-06-02): <https://helpx.adobe.com/indesign/desktop/add-tables-and-data/table-and-cell-styles/import-table-and-cell-styles.html>                                                         |                                                                                                                                  |
| [SIDML] | SimpleIDML: <https://github.com/Starou/SimpleIDML>, PyPI `SimpleIDML`                                                                                                                                                                   | Status checked via the PyPI JSON API and the GitHub API.                                                                         |
| [MNI]   | metanorma/idml: <https://github.com/metanorma/idml>, RubyGems `idml`                                                                                                                                                                    | Ships RelaxNG schemas generated from InDesign 2026 (DOMVersion 21.5).                                                            |
| [TPV]   | transpect/idmlvalidation: <https://github.com/transpect/idmlvalidation>                                                                                                                                                                 | RNC schemas for InDesign 7.0, 7.5 and 15.0, plus an XProc validator.                                                             |
| [SCR]   | Scribus IDML importer: <https://github.com/scribusproject/scribus/tree/master/scribus/plugins/import/idml>                                                                                                                              | Source read directly.                                                                                                            |
| [AFF]   | Affinity Help, "Importing InDesign documents": <https://affinity.help/publisher2/en-US.lproj/pages/GetStarted/importInDesign.html>                                                                                                      |                                                                                                                                  |
| npm     | registry.npmjs.org metadata and api.npmjs.org download counts, read 2026-11-06                                                                                                                                                          |                                                                                                                                  |

## 1. Minimal valid package

An IDML file is a UCF (ZIP) container [SPEC §8.1, App. A], [COOK "How do I produce an IDML
package outside of InDesign?"]:

1. `mimetype` must be the **first** entry, stored **uncompressed**, with no extra field. Its
   content is exactly `application/vnd.adobe.indesign-idml-package`.
2. Use `/` path separators even on Windows. InDesign cannot read archives that use `\`.
3. The part hierarchy goes at the archive root, not inside a subfolder.

Typical parts [SPEC §8.1, COOK]: `designmap.xml` (root, spread order, references to every
part), `MasterSpreads/*.xml`, `Spreads/*.xml`, `Stories/*.xml`, `Resources/{Styles,Graphic,Fonts,Preferences}.xml`,
`XML/{BackingStory,Tags,Mapping}.xml`, and `META-INF/container.xml` (marked optional in the
spec, §A).

**Minimal is really minimal.** Adobe's SDK sample `helloworld-2.idml` was written by hand in a
text editor. Its `designmap.xml` is a `<Document DOMVersion="7.0" Self="d">` holding one
`idPkg:Spread` and one `idPkg:Story` reference. It opens as a one-page document with a text
frame [COOK "What is in an IDML file?"]. Omitted values come from a static defaults file,
`Presets/Default/Predef.iddx`, which InDesign "always imports just before any IDML file". The
result does not depend on the user's application defaults [COOK], [SPEC §10.1.3]. The verbose
IDML that InDesign exports exists for round-trip fidelity. Generators do not need it.

`archiver` 8.0.0, already in `package.json` and used in `src/features/planner/server/qr-codes.ts`,
produces a conformant `mimetype` entry. Checked locally: `append(..., { name: "mimetype", store: true })`
as the first entry gives method 0, flags 0, extra-field length 0, `mimetype` at byte 30 and
the MIME string at byte 38, which is exactly the layout UCF requires [SPEC App. A §4].

Page geometry: page items use **spread coordinates**, with the origin at the binding.
`ItemTransform` moves the origin to the top-left of a page:
`x = (pageIndex − bindingLocation) × pageWidth`, `y = pageHeight / 2` [COOK "Adding page items
in page coordinates"]. Leave `Spread@ItemTransform` out and InDesign computes it from the
spread order in `designmap.xml` [COOK "Adding a spread"].

## 2. Named styles

`Resources/Styles.xml` holds paragraph, character, object, table, cell and TOC styles in
`RootParagraphStyleGroup`, `RootCharacterStyleGroup`, `RootObjectStyleGroup`,
`RootTableStyleGroup` and `RootCellStyleGroup` [SPEC §8.1.4, examples ~p.430]. Stories refer
to styles by `Self` id, for example `AppliedParagraphStyle="ParagraphStyle/Session title"`.
Styles are never inlined in stories [SPEC §8.1.6]. Text uses
`ParagraphStyleRange` > `CharacterStyleRange` > `Content`, with `<Br/>` for paragraph breaks
outside `Content` [COOK "Text"]. Object styles go on frames through `AppliedObjectStyle` [COOK].

Facts relevant to the standing decisions:

- Language per style: `AppliedLanguage="$ID/English: USA"` or the Polish equivalent
  [SPEC Story schema, Language list §10.2.2]. Set it to match the EN/PL label choice so
  hyphenation and spelling work for the designer.
- A day heading can force a new page with `StartParagraph="NextPage"` (enum `Anywhere |
  NextColumn | NextFrame | NextPage | NextOddPage | NextEvenPage`) [SPEC enum list]. So one
  story can hold every day, and each day still starts on a fresh page.
- The designer can restyle with zero code from us. InDesign's _Load … Styles_ dialog takes
  styles from another document. On a name conflict, _Use Incoming Style Definition_ replaces
  the existing style [LOAD]. If our style names are stable, a designer can pull their house
  template's styles straight into our file. (The cited Adobe page covers table and cell
  styles. Paragraph and character styles use the same Load Styles dialog, but that page was
  not fetched separately.)

## 3. Tables for the "Program at a glance" grid

IDML has a native table model [COOK "Tables"], [SPEC §10.4 Example 53]:

- `<Table HeaderRowCount BodyRowCount FooterRowCount ColumnCount AppliedTableStyle>` sits
  inline in a story's text, with `<Row SingleRowHeight>`, `<Column SingleColumnWidth>` and
  `<Cell>` children. `BodyRowCount` can be at most 10000 and `HeaderRowCount` at most 25
  [SPEC Table schema].
- **Merged cells are supported.** `Cell@Name="col:row"` gives the cell's top-left position.
  `RowSpan` and `ColumnSpan` give its size. Example: `Name="1:0"` is column 1, row 0. Cells
  carry `AppliedCellStyle` and normal paragraph and character ranges [COOK], [SPEC Cell schema].
- Overflow: a table that does not fit its frame becomes overset, and its rows continue into
  the next threaded frame. **A single row cannot split across frames.** Header rows can repeat
  in later frames [TBL].

Mapping: rooms become columns and time slots become rows. A session that spans several time
rows uses `RowSpan`, and a plenary across all rooms uses `ColumnSpan`. Use one table per day,
each after a day heading with `StartParagraph="NextPage"`. Put the room names in a header row
so they repeat if a day's grid runs past one page.

## 4. Threaded frames, pagination and Smart Text Reflow

- Threading: `TextFrame@ParentStory` names the story. `PreviousTextFrame` and
  `NextTextFrame` link the frames, and both ends of each link must be set [COOK "Adding text
  frames"]. Text that does not fit stays **overset**. The story is complete in the file, but
  it shows a red `+` in the frame's out port.
- Smart Text Reflow is a document `TextPreference`. Its attributes are `SmartTextReflow`,
  `AddPages` (`EndOfStory|EndOfSection|EndOfDocument`), `LimitToMasterTextFrames`,
  `PreserveFacingPageSpreads` and `DeleteEmptyPages`. The IDML defaults are
  `SmartTextReflow=true`, `AddPages=EndOfStory`, `LimitToMasterTextFrames=true`,
  `PreserveFacingPageSpreads=false` and `DeleteEmptyPages=false` [SPEC §6.3.13, App. C Table 113].
  Reflow is therefore on by default, but only for primary text frames. Adobe describes it as adding or removing pages
  "**when typing or editing text**". It applies to primary text frames on parent (master)
  pages, or to manually threaded frames when _Limit to Primary Text Frames_ is off. Pages it
  adds for non-master frames get "full-page, single-column text frames" [STR].
- **Nothing in Adobe's docs says that opening an IDML runs reflow.** It is documented as an
  editing feature. Assume an opened file keeps whatever pages we wrote. Not verified in
  InDesign.
- We cannot compute exact pagination outside InDesign. It depends on InDesign's composer,
  the fonts and the hyphenation, and the designer will change all of them.

Recommended approach:

1. Estimate the page count generously from row and slot counts. Generate that many pages,
   each with a text frame, threaded into one story per part. Alternatively, put a primary
   text frame on the master. The InDesign 2026 schema has `MasterSpread@PrimaryTextFrame`
   [MNI `MasterSpread.rnc`]; spec v8.0 only mentions `DocumentPreference@CreatePrimaryTextFrame`.
2. Write `TextPreference SmartTextReflow="true" LimitToMasterTextFrames="false" DeleteEmptyPages="true"`.
   The designer's first restyle then adds missing pages or deletes empty ones [STR].
3. Whatever the estimate, no content is lost. Overset text stays in the story and InDesign
   flags it.

## 5. Placed logo

An image is an `<Image>` (or `EPS`/`PDF`) inside a `Rectangle` or `Polygon` frame. A `<Link>`
child points to the data with `LinkResourceURI` [COOK "Adding an image"], [SPEC §10.3.5 example].

- **Linked**: paths are absolute. If the file is missing, InDesign looks in the folder that
  contains the IDML, then in parent folders and in the user's re-link folders [SPEC §9.5.6].
  An IDML and a logo shipped side by side in one ZIP therefore resolve after extraction.
- **Embedded**: the `Image` `<Properties><Contents>` element "contains the data of the
  graphic" [SPEC Table 76]. The spec does not name the encoding. Scribus's importer decodes
  it as **base64** (`QByteArray::fromBase64(getNodeValue(itpg, "Contents"))`, `importidml.cpp`)
  [SCR]. `LinkResourceStoreState` includes `Embedded` [SPEC enum list]. Embedding keeps the
  download a single `.idml` file. Verify it in InDesign before relying on it.
- IDML does not fit images to frames on import (`FrameFittingOption` applies only at the
  next manual place). Size the frame to the image's aspect ratio, give the image the identity
  `ItemTransform`, and set its bounds to match the frame [COOK "Fitting images to frames"].
  The logo belongs on the master spread so it repeats.

## 6. DRAFT mark (option for the open map item)

Put a text frame reading "DRAFT" on the master spread, on its own layer ("Draft mark").
Layers are `designmap.xml` children [SPEC §10.2.17]. The designer can hide or delete the
layer in one click, and the mark cannot end up inside the program story text.

## 7. Libraries

| Library                                                        | Lang   | Latest release                                    | Activity / adoption                                                             | Fit                                                                                                                                                                                      |
| -------------------------------------------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SimpleIDML [SIDML]                                             | Python | 1.3.1 on 2025-08-15, 1.3.2a0 on 2025-10-24 (PyPI) | 246★, last push 2025-10-24, BSD, used in production at _Le Figaro_              | Composes existing IDML templates (`prefix`, `insert_idml`, `import_xml` into InDesign's XML Structure, `add_page_from_idml`). **No helpers for building tables or styles from scratch.** |
| `idml` (ElyaConrad)                                            | TS     | 0.1.71 on 2026-10-24                              | 2★, ~1.5k dl/month, ISC, 15 deps (fontkit, linkedom, opentype.js…)              | Pre-1.0, single maintainer, heavy dependencies.                                                                                                                                          |
| `idmlkit`                                                      | TS     | 0.1.0 on 2026-07-18 (only release)                | 0★, ~225 dl/month                                                               | Parse and "write back". Too new.                                                                                                                                                         |
| `@segnavia/idml`                                               | TS     | 0.46.0 on 2026-11-06                              | 0★, created 2026-10-28                                                          | Part of an HTML-pages product. Too new.                                                                                                                                                  |
| `@imgly/idml-exporter`                                         | TS     | 0.1.0 on 2026-10-11                               | proprietary licence (`SEE LICENSE IN LICENSE.md`)                               | Exports CE.SDK scenes. Wrong input model.                                                                                                                                                |
| `@imgly/idml-importer`, `@kaos-intelligence/idml`, `deep-idml` | TS     | —                                                 | —                                                                               | Importers and parsers, not generators.                                                                                                                                                   |
| `idml` gem [MNI]                                               | Ruby   | 0.10.15 on 2026-08-31, 74 versions                | active, ports SimpleIDML composition, adds RelaxNG validation and PDF rendering | Ruby is not in our stack. Its committed InDesign 2026 schemas are useful for validation (see §9).                                                                                        |

Conclusion: nothing worth taking a dependency on in Node. In Python, SimpleIDML solves the
template-composition problem, which is not ours (see §8). Our generator needs about ten small
XML templates plus a zipper, and `archiver` already covers the zipper.

## 8. Template injection vs from scratch

- **From scratch (recommended for v1).** We own every part, so styles have stable names, the
  output is deterministic, there is nothing to upload and no per-conference setup. It matches
  the standing decision for named neutral styles that the designer restyles. Adobe's minimal
  hello-world shows that a hand-written package is a supported path [COOK].
- **Template injection** means a designer-made `.idml` with masters and styles, into which we
  inject stories (SimpleIDML's model [SIDML]). It costs an upload UI, a style-name contract
  that the template must satisfy, `Self` id prefixing to avoid collisions, and a story or
  frame binding convention. It only pays off when a conference reuses one house template
  every year. Most of the benefit is available for free through _Load Styles → Use Incoming
  Style Definition_ [LOAD]. Defer it. If it is ever needed, it can be added on top of the
  from-scratch generator by reading `Styles.xml` and `MasterSpreads` from the uploaded
  template.

## 9. Validating output without InDesign

- **Schema**: IDML has no static schema. Schemas are generated per InDesign install with
  `app.generateIDMLSchema(folder, true)`, as RELAX NG Compact, because plug-ins extend the
  model [COOK "IDML Schema Validation"], [SPEC §9.2]. Ready-made generated copies exist:
  InDesign 2026 / DOMVersion 21.5 in [MNI] `reference-docs/schemas/package/` (the repo
  declares no licence, so link to it or regenerate rather than vendoring), and
  7.0 / 7.5 / 15.0 in [TPV] (BSD-2). Validate with Jing (RNC) or after converting with trang
  to RNG (libxml2 or lxml). That fits a unit test or a CI step, and it does not decide the
  runtime.
- **Schema validity is not enough.** "Like INX, IDML is designed to quietly ignore unexpected
  data and scripting errors" [COOK "What if my IDML file passes schema validation but does not
  work as expected?"]. Adobe's answer is the INXErrorLogging SDK plug-in, which needs InDesign.
  Add a structural self-check in our test: every `ParentStory`, `Applied*Style`, `Next/PreviousTextFrame`
  and `idPkg:*@src` must resolve. Adobe's IDMLTools Validator also checks that referenced
  package files exist [COOK].
- **Open in other apps** (smoke tests only):
  - Affinity (free since Oct 2025) opens IDML through File › Open [AFF]. Its help page does
    not list which features are supported.
  - Scribus has an IDML import plugin, still maintained in 2026 [SCR]. It reads
    paragraph and character styles, threaded frames (`NextTextFrame`), tables
    (`Row`/`Column`/`Cell@Name`) and images (linked or base64 `Contents`). It **ignores
    `RowSpan`/`ColumnSpan`**, so it cannot judge the merged grid.
  - InDesign Server is the only faithful headless check. It needs a commercial Adobe licence.
- **Practical gate**: schema validation plus the reference self-check in CI. Before shipping,
  open the output once in real InDesign. The designer workflow needs that anyway.

## 10. Runtime: in-process Node vs `docx-api` sidecar

|                     | In-process Node                                                                                                   | `docx-api` (Python FastAPI)                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Deployment          | Always present                                                                                                    | `DOCX_API_URL` is optional in `src/env.ts`, so the export would be unavailable on instances without the sidecar |
| Libraries           | `archiver` already installed; plain template strings for XML                                                      | lxml is available; SimpleIDML adds nothing for from-scratch tables                                              |
| Data access         | Program data is already loaded by the planner server functions; types are shared                                  | Program data has to be serialised over HTTP and the schema duplicated in Python                                 |
| Cost                | String building plus one ZIP of small XML parts (estimate, not measured: well under a second for a large program) | Adds an HTTP hop, an auth token and health checks                                                               |
| Validation in tests | Vitest plus a structural self-check; schema validation through Jing/trang in CI if wanted                         | lxml RelaxNG after rnc→rng conversion                                                                           |

Recommendation: **in-process Node**. Generation is pure string building with no headless
binaries (unlike DOCX→PDF, which needs LibreOffice and pandoc), so a sync download should do
and no pg-boss job is needed. That conclusion is an inference from the workload. The map's
sync-vs-job decision should confirm it against the Word and xlsx generators.

## Not verified (needs a real InDesign session in the prototype ticket)

1. Whether opening an IDML with overset text ever adds pages (Smart Text Reflow at open).
   Adobe's docs only describe it on typing or editing [STR].
2. Whether embedded-image `Contents` is base64 in InDesign itself. So far this is
   corroborated only by Scribus's importer [SCR]; the spec does not name the encoding.
3. The lowest `DOMVersion` that accepts `MasterSpread@PrimaryTextFrame`. The v8.0 spec does
   not list it, but the 2026 schema does [MNI]. Choose the `DOMVersion` the generator emits
   accordingly (the hello-world uses 7.0, and newer InDesign opens older DOM versions [SPEC §7.8]).
4. How Affinity handles merged table cells on IDML import.
5. The licence status of the Adobe-generated schemas committed in metanorma/idml.
