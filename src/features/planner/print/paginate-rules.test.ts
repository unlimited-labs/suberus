import { describe, expect, it } from "vitest";
import { paginate } from "./paginate-rules";

const block = (height: number) => ({ height });

describe("paginate", () => {
	it("flows blocks onto the next page when the page is full and starts every section on a new page", () => {
		const pages = paginate([
			{
				start: "nextPage",
				columns: 1,
				pageHeight: 100,
				blocks: [block(60), block(30), block(30)],
			},
			{ start: "nextPage", columns: 1, pageHeight: 100, blocks: [block(10)] },
		]);
		expect(pages.map((p) => [p.section, p.items.map((i) => i.block)])).toEqual([
			[0, [0, 1]],
			[0, [2]],
			[1, [0]],
		]);
	});

	it("inserts a blank page so an even-page section starts on the left of a spread", () => {
		const pages = paginate([
			{
				start: "nextPage",
				columns: 1,
				pageHeight: 100,
				blocks: [block(60), block(60)],
			},
			{ start: "evenPage", columns: 1, pageHeight: 100, blocks: [block(10)] },
		]);
		expect(pages.map((p) => (p.blank ? "blank" : p.section))).toEqual([
			0,
			0,
			"blank",
			1,
		]);
	});

	it("breaks a long table between rows and repeats its header rows on the next page", () => {
		const pages = paginate([
			{
				start: "nextPage",
				columns: 1,
				pageHeight: 100,
				blocks: [
					{
						height: 0,
						headerRows: 1,
						rows: [20, 40, 40, 40],
						breakable: [true, true, true, true],
					},
				],
			},
		]);
		expect(pages.map((p) => p.items.map((i) => i.rows))).toEqual([
			[[1, 3]],
			[[3, 4]],
		]);
	});

	it("does not break inside rows that a merged cell spans", () => {
		const pages = paginate([
			{
				start: "nextPage",
				columns: 1,
				pageHeight: 100,
				blocks: [
					{
						height: 0,
						headerRows: 1,
						rows: [20, 30, 30, 30],
						breakable: [true, true, false, true],
					},
				],
			},
		]);
		expect(pages.map((p) => p.items.map((i) => i.rows))).toEqual([
			[[1, 2]],
			[[2, 4]],
		]);
	});

	it("gives two-column sections twice the room per page", () => {
		const pages = paginate([
			{
				start: "nextPage",
				columns: 2,
				pageHeight: 100,
				blocks: [block(90), block(90)],
			},
		]);
		expect(pages).toHaveLength(1);
	});
});
