import { describe, expect, it } from "vitest";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { buildServiceRows } from "./system-health-rows";

type Args = Parameters<typeof buildServiceRows>[0];

const healthy: Args = {
	s3: {
		status: "healthy",
		endpoint: "https://s3.example",
		bucket: "papers",
		message: "ok",
	},
	smtp: { status: "healthy", host: "mail.example", port: 587, message: "ok" },
	llm: {
		status: "healthy",
		message: "",
		gpu: true,
		model: "gemma",
		checkedAt: "",
	} as AdminDashboardMetrics["llm"],
	docling: {
		status: "healthy",
		message: "",
		checkedAt: "",
	} as AdminDashboardMetrics["docling"],
};

function row(rows: ReturnType<typeof buildServiceRows>, name: string) {
	const found = rows.find((r) => r.name === name);
	if (!found) throw new Error(`row ${name} not found`);
	return found;
}

describe("buildServiceRows", () => {
	it("returns the four services in order", () => {
		const rows = buildServiceRows(healthy);
		expect(rows.map((r) => r.name)).toEqual([
			"LLM",
			"Docling",
			"Storage",
			"Email",
		]);
	});

	it("renders healthy detail strings from endpoints/hosts", () => {
		const rows = buildServiceRows(healthy);
		expect(row(rows, "Storage").detail).toBe("https://s3.example/papers");
		expect(row(rows, "Email").detail).toBe("mail.example:587");
		expect(row(rows, "Docling").detail).toBe(
			"PDF & DOCX to markdown conversion",
		);
		expect(row(rows, "LLM").detail).toBe("LLM connected · GPU · gemma");
	});

	it("falls back when metrics are undefined", () => {
		const rows = buildServiceRows({
			s3: undefined,
			smtp: undefined,
			llm: undefined,
			docling: undefined,
		});
		expect(row(rows, "LLM").status).toBe("unavailable");
		expect(row(rows, "Docling").status).toBe("unavailable");
		expect(row(rows, "Storage").status).toBe("error");
		expect(row(rows, "Email").status).toBe("error");
		for (const name of ["LLM", "Docling", "Storage", "Email"]) {
			expect(row(rows, name).detail).toBe("Unknown");
		}
	});

	it("surfaces the error message for unhealthy storage and email", () => {
		const rows = buildServiceRows({
			...healthy,
			s3: {
				status: "error",
				endpoint: "",
				bucket: "",
				message: "bucket missing",
			},
			smtp: { status: "error", host: "", port: 0, message: "auth failed" },
		});
		expect(row(rows, "Storage").detail).toBe("bucket missing");
		expect(row(rows, "Email").detail).toBe("auth failed");
	});

	it("surfaces docling message when not healthy", () => {
		const rows = buildServiceRows({
			...healthy,
			docling: {
				status: "unavailable",
				message: "service down",
				checkedAt: "",
			} as AdminDashboardMetrics["docling"],
		});
		expect(row(rows, "Docling").detail).toBe("service down");
	});
});
