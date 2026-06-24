// Filled example -- mirrors docx/ and tex/ examples.
// Compile:  typst compile abstract-example.typ
#import "confabs.typ": abstract-doc, affil
#import "@preview/cetz:0.5.2"
#import "@preview/cetz-plot:0.1.4": plot

#show: abstract-doc.with(
  title: [Microstructure Evolution in Hot-Rolled Steel During Multi-Pass
    Deformation],
  authors: [Anna Kowalska#super[1,\*], Jan Nowak#super[2],
    Maria Lewandowska#super[1]],
  affiliations: (
    affil([1], [AGH University of Krakow, Faculty of Metals Engineering,
      al. Mickiewicza 30, 30-059 Krakow, Poland]),
    affil([2], [Łukasiewicz Research Network, Institute for Ferrous Metallurgy,
      K. Miarki 12, 44-100 Gliwice, Poland]),
  ),
  email: [a.kowalska\@agh.edu.pl, j.nowak\@imz.pl, m.lewandowska\@agh.edu.pl],
  keywords: [hot rolling, microstructure, recrystallization, finite element
    modelling, steel],
)

Grain refinement during thermomechanical processing controls the strength and
toughness of structural steels @humphreys2004, yet industrial multi-pass
schedules retain strain between passes in a way that single-pass
Johnson--Mehl--Avrami--Kolmogorov (JMAK) calibrations do not capture
@sellars1979. This work quantifies how inter-pass time and temperature govern
recrystallization in low-carbon steel. Plane-strain compression specimens were
deformed between 900 °C and 1100 °C following the four-pass schedule of
@tbl-schedule, then interrupted-quenched for metallography.

#figure(
  caption: [Four-pass plane-strain compression schedule.],
  kind: table,
  table(
    columns: 4,
    inset: (x: 10pt, y: 4pt),
    align: center + horizon,
    stroke: none,
    table.hline(y: 0, stroke: 1pt),
    table.header([Pass], [Temperature (°C)], [Strain, $epsilon$ (–)],
      [Inter-pass time (s)]),
    table.hline(y: 1, stroke: 0.5pt),
    [1], [1100], [0.30], [10],
    [2], [1050], [0.30], [5],
    [3], [1000], [0.25], [3],
    [4], [950], [0.25], [–],
    table.hline(y: 5, stroke: 1pt),
  ),
) <tbl-schedule>

Above 1000 °C the kinetics are dominated by inter-pass time rather than peak
strain; a JMAK law fitted to single-pass data over-predicts grain refinement in
the multi-pass case by up to 18% @sellars1979 (@fig-kinetics).

#figure(
  caption: [Recrystallized fraction $X(t)$ versus inter-pass time at 1000 °C
    and 1100 °C.],
  kind: image,
  supplement: [Fig.],
  cetz.canvas({
    plot.plot(
      size: (11, 5.6),
      x-label: [Inter-pass time, $t$ (s)],
      y-label: [Recrystallized fraction, $X$ (%)],
      x-min: 0, x-max: 10, y-min: 0, y-max: 100,
      legend: "inner-north-west",
      {
        plot.add(
          domain: (0, 10), samples: 100, label: [1100 °C],
          style: (stroke: red),
          x => 100 * (1 - calc.exp(-6.5 * calc.pow(x / 10, 1.6))),
        )
        plot.add(
          domain: (0, 10), samples: 100, label: [1000 °C],
          style: (stroke: blue),
          x => 100 * (1 - calc.exp(-3.2 * calc.pow(x / 10, 1.6))),
        )
      },
    )
  }),
) <fig-kinetics>

A retained-strain correction to the JMAK law reconciles laboratory and
industrial bar-mill data, improving grain-size prediction across the schedule
@kowalska2021.

#bibliography("references.bib", title: [References], style: "ieee")
