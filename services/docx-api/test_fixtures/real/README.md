# Human-supplied DOCX fixtures

Programmatic authoring (python-docx) can't faithfully produce a few Word
features, so drop **anonymized / generic** real `.docx` files here and the
baseline tests pick them up automatically (they `skip` until the file exists,
and need LibreOffice — they run in the docx-api test image).

Expected files (lorem-ipsum / generic content is fine):

- `autoshapes-textboxes.docx` — autoshapes (rounded rectangle / callout / arrow),
  at least one text box, ideally one grouped shape.
- `vector-images.docx` — EMF and/or WMF images (e.g. a chart pasted from Excel)
  and/or an SVG, to exercise the LibreOffice rasterization path.
- `mathtype-real.docx` *(optional)* — authored with MathType, several equations.
- `word-equations-real.docx` *(optional)* — authored native Word equations.

After adding a file, generate its golden:

    ./run-tests.sh -e UPDATE_BASELINE=1

then review the produced `test_fixtures/golden/<name>.{html,css,figures.json}`
and commit the `.docx` + its goldens together.
