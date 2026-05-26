/**
 * Generate anonymized DOCX and PDF fixture files for extraction E2E tests.
 * Based on real conference paper structures from demo data.
 *
 * Run: pnpm exec tsx e2e/scripts/create-extraction-fixtures.ts
 */
import {
	AlignmentType,
	Document,
	Packer,
	Paragraph,
	TextRun,
} from "docx";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const FIXTURES_DIR = path.resolve("e2e/submissions/fixtures");

// --- Anonymized content based on real conference papers ---

const PAPER = {
	title:
		"Microstructure and Mechanical Properties of Novel Fe-Mn-Ni-Co Alloys for High-Temperature Applications",
	authors: [
		{
			name: "Jan Kowalski",
			email: "jan.kowalski@university.edu",
			affiliation: "Kraków University of Technology",
			affiliationAddress:
				"Faculty of Materials Science, ul. Przykładowa 15, 30-001 Kraków, Poland",
		},
		{
			name: "Maria Schmidt",
			email: "maria.schmidt@research.de",
			affiliation: "Dresden Institute of Technology",
			affiliationAddress:
				"Institute of Materials Engineering, Musterstraße 5, 01069 Dresden, Germany",
		},
		{
			name: "Pedro Santos",
			email: "pedro.santos@lab.pt",
			affiliation: "University of Lisbon",
			affiliationAddress:
				"Department of Mechanical Engineering, Av. Rovisco Pais, 1049-001 Lisboa, Portugal",
		},
	],
	keywords: [
		"high entropy alloys",
		"thermomechanical processing",
		"CALPHAD method",
		"mechanical properties",
		"microstructure evolution",
	],
	abstract: `This paper presents a comprehensive study on the design and optimization of thermomechanical processing routes for non-equiatomic Fe-Mn-Ni-Co alloys intended for critical structural applications. The alloy compositions were designed using CALPHAD-based thermodynamic calculations combined with density functional theory (DFT) ab-initio modelling to predict phase stability and mechanical response under extreme loading conditions.

Experimental validation was performed through a series of compression tests at strain rates ranging from quasi-static (10⁻³ s⁻¹) to dynamic (10² s⁻¹) conditions, including cryogenic temperature testing at -196°C. The microstructure evolution was characterized using scanning electron microscopy (SEM), electron backscatter diffraction (EBSD), and transmission Kikuchi diffraction (TKD).

Results demonstrate that the optimized processing route yields a fine-grained bimodal microstructure with enhanced twinning-induced plasticity (TWIP) behavior. The alloys exhibit excellent combinations of strength (yield stress >800 MPa) and ductility (elongation >35%) at room temperature, with maintained performance at cryogenic conditions. The grain size refinement achieved through controlled groove rolling significantly contributes to the weakening of basal texture compared to conventional processing methods.`,
	introduction: `Structural materials with high impact fracture toughness are of significant interest for extreme-environment applications at low temperatures, such as transportation and storage of liquefied gases, cryogenic technologies, and structural components in aerospace vehicles. The development of novel alloy systems that combine high strength with exceptional ductility remains a fundamental challenge in materials science.

High-entropy alloys (HEAs) represent a promising class of metallic materials that offer new possibilities for applications under extreme loading conditions. Unlike conventional alloys based on one principal element, HEAs consist of multiple principal elements in near-equiatomic or non-equiatomic proportions, leading to unique combinations of mechanical properties through various strengthening mechanisms including solid solution hardening, precipitation strengthening, and deformation twinning.

Recent advances in computational materials science, particularly CALPHAD (Calculation of Phase Diagrams) methods and ab-initio calculations based on density functional theory, have enabled more efficient alloy design by predicting phase stability, transformation temperatures, and mechanical response prior to experimental validation. This integrated computational-experimental approach significantly reduces development time and cost while enabling exploration of wider compositional spaces.`,
};

async function createDocx() {
	const authorLine = PAPER.authors.map((a) => a.name).join(", ");
	const emailLine = PAPER.authors.map((a) => a.email).join(", ");
	const affiliationLines = PAPER.authors.map(
		(a, i) => `${i + 1} ${a.affiliation}, ${a.affiliationAddress}`,
	);

	const doc = new Document({
		sections: [
			{
				children: [
					new Paragraph({
						alignment: AlignmentType.CENTER,
						spacing: { after: 200 },
						children: [
							new TextRun({ text: PAPER.title, bold: true, size: 28 }),
						],
					}),
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [new TextRun({ text: authorLine, size: 22 })],
					}),
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [
							new TextRun({ text: emailLine, size: 20, italics: true }),
						],
					}),
					...affiliationLines.map(
						(line) =>
							new Paragraph({
								alignment: AlignmentType.CENTER,
								children: [new TextRun({ text: line, size: 20 })],
							}),
					),
					new Paragraph({ children: [] }),
					new Paragraph({
						children: [
							new TextRun({
								text: `Keywords: ${PAPER.keywords.join(", ")}`,
								italics: true,
								size: 22,
							}),
						],
					}),
					new Paragraph({ children: [] }),
					new Paragraph({
						children: [
							new TextRun({ text: "ABSTRACT", bold: true, size: 24 }),
						],
					}),
					...PAPER.abstract.split("\n\n").map(
						(para) =>
							new Paragraph({
								spacing: { after: 120 },
								children: [new TextRun({ text: para.trim(), size: 22 })],
							}),
					),
					new Paragraph({ children: [] }),
					new Paragraph({
						children: [
							new TextRun({
								text: "1. Introduction",
								bold: true,
								size: 24,
							}),
						],
					}),
					...PAPER.introduction.split("\n\n").map(
						(para) =>
							new Paragraph({
								spacing: { after: 120 },
								children: [new TextRun({ text: para.trim(), size: 22 })],
							}),
					),
				],
			},
		],
	});

	const buffer = await Packer.toBuffer(doc);
	const outPath = path.join(FIXTURES_DIR, "extraction-sample.docx");
	fs.writeFileSync(outPath, buffer);
	console.log(`Created ${outPath} (${buffer.length} bytes)`);
}

function createPdf(): Promise<void> {
	return new Promise((resolve) => {
		const outPath = path.join(FIXTURES_DIR, "extraction-sample.pdf");
		const doc = new PDFDocument({ size: "A4", margin: 60 });
		const stream = fs.createWriteStream(outPath);
		doc.pipe(stream);

		// Title
		doc
			.font("Helvetica-Bold")
			.fontSize(14)
			.text(PAPER.title, { align: "center" });
		doc.moveDown(0.5);

		// Authors
		const authorLine = PAPER.authors
			.map((a, i) => `${a.name} ${i + 1}`)
			.join(", ");
		doc.font("Helvetica").fontSize(11).text(authorLine, { align: "center" });
		doc.moveDown(0.3);

		// Affiliations
		for (let i = 0; i < PAPER.authors.length; i++) {
			const a = PAPER.authors[i];
			doc
				.fontSize(9)
				.text(`${i + 1} ${a.affiliation}, ${a.affiliationAddress}`, {
					align: "center",
				});
		}
		doc.moveDown(0.3);

		// Emails
		const emailLine = PAPER.authors.map((a) => a.email).join(", ");
		doc
			.font("Helvetica-Oblique")
			.fontSize(9)
			.text(emailLine, { align: "center" });
		doc.moveDown(0.3);

		// Keywords
		doc
			.font("Helvetica-Oblique")
			.fontSize(10)
			.text(`Keywords: ${PAPER.keywords.join(", ")}`, { align: "left" });
		doc.moveDown(0.8);

		// Abstract
		doc.font("Helvetica-Bold").fontSize(11).text("Abstract");
		doc.moveDown(0.3);
		doc.font("Helvetica").fontSize(10);
		for (const para of PAPER.abstract.split("\n\n")) {
			doc.text(para.trim(), { align: "justify" });
			doc.moveDown(0.4);
		}

		// Introduction
		doc.moveDown(0.3);
		doc.font("Helvetica-Bold").fontSize(11).text("1. Introduction");
		doc.moveDown(0.3);
		doc.font("Helvetica").fontSize(10);
		for (const para of PAPER.introduction.split("\n\n")) {
			doc.text(para.trim(), { align: "justify" });
			doc.moveDown(0.4);
		}

		doc.end();
		stream.on("finish", () => {
			const stat = fs.statSync(outPath);
			console.log(`Created ${outPath} (${stat.size} bytes)`);
			resolve();
		});
	});
}

async function main() {
	await createDocx();
	await createPdf();
	console.log("\nDone. Fixtures ready for E2E tests.");
}

main().catch(console.error);
