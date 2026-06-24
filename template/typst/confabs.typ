// confabs.typ -- conference extended-abstract template (Suberus)
// One-page abstract: bold centred title, superscript-marked authors, italic
// affiliations, e-mails, keywords, continuous prose, tables, vector figures,
// bibliography. Use via:  #show: abstract-doc.with(...)
// Compile with:  typst compile <file>.typ

#let affil(marker, body) = (marker: marker, body: body)

#let abstract-doc(
  title: none,
  authors: none, // content; mark affiliations with #super[1], presenter with #super[*]
  affiliations: (), // array of affil(marker, body)
  email: none,
  keywords: none,
  body,
) = {
  set page(paper: "a4", margin: 2.5cm)
  set text(font: ("Times New Roman", "TeX Gyre Termes"), size: 11pt)
  set par(justify: true, leading: 0.6em, spacing: 0.9em)

  // captions: bold "Table 1." / "Fig. 1." label; table caption above, figure below
  set figure.caption(separator: [.#h(0.4em)])
  show figure.caption: it => [
    #text(size: 9pt)[*#it.supplement~#it.counter.display()#it.separator*#it.body]
  ]
  show figure.where(kind: table): set figure.caption(position: top)
  set figure(supplement: [Table], numbering: "1") // overridden per figure below

  // --- title block ---
  set align(center)
  text(size: 14pt, weight: "bold", title)
  v(8pt)
  text(size: 12pt, authors)
  v(3pt)
  for a in affiliations {
    text(size: 9pt, style: "italic")[#super(a.marker)~#a.body]
    linebreak()
  }
  if email != none {
    v(1pt)
    text(size: 9pt, style: "italic")[E-mails: #email]
  }
  set align(left)
  v(6pt)

  if keywords != none {
    [*Keywords:* #keywords]
    v(6pt)
  }

  body
}
