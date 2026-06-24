// Blank template -- fill in and submit. Grey text marks placeholders to replace.
// Compile:  typst compile abstract.typ
#import "confabs.typ": abstract-doc, affil

#let hint(body) = text(fill: gray, body)

#show: abstract-doc.with(
  title: [Title of the Abstract #hint[(bold, centred; max 2 lines)]],
  authors: [Given Name Surname#super[1,\*], Given Name Surname#super[2]],
  affiliations: (
    affil([1], [Department, Institution, City, Country]),
    affil([2], [Department, Institution, City, Country]),
  ),
  email: [presenting\@author.org, co.author\@institution.org
    #hint[(in author order)]],
  keywords: [keyword one, keyword two, keyword three
    #hint[(3--6, comma-separated)]],
)

#hint[Write your abstract as continuous text (justified, single spacing). State
the problem, the method, the key results and the conclusion in one flowing
narrative -- no section headings. The presenting author is marked with
#super[\*]. You may include one table and one figure, and cite references in
order as @ref-article and @ref-book. Keep the whole document to two pages.]

#figure(
  caption: [Caption above the table.],
  kind: table,
  table(
    columns: 3,
    inset: (x: 10pt, y: 4pt),
    align: center + horizon,
    stroke: none,
    table.hline(y: 0, stroke: 1pt),
    table.header([Column], [Column], [Column]),
    table.hline(y: 1, stroke: 0.5pt),
    [], [], [],
    [], [], [],
    table.hline(y: 3, stroke: 1pt),
  ),
) <tbl-placeholder>

#hint[Continue the narrative: present and interpret the results and refer to the
figure as @fig-placeholder.]

#figure(
  caption: [Caption below the figure.],
  kind: image,
  supplement: [Fig.],
  rect(
    width: 86%, height: 4.5cm, stroke: 0.5pt,
    align(center + horizon, hint[Insert figure / chart here]),
  ),
) <fig-placeholder>

#hint[Close with the conclusion in the same paragraph flow.]

#bibliography("references.bib", title: [References], style: "ieee")
