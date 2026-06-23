import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: { DOCLING_URL: undefined as string | undefined },
}));
vi.mock("@/env", () => ({ env: mockEnv }));

type FetchInit = { ok: boolean; status?: number; json?: unknown };
const res = (init: FetchInit) =>
	({
		ok: init.ok,
		status: init.status ?? (init.ok ? 200 : 500),
		json: async () => init.json,
	}) as unknown as Response;

const isMarkdown = (url: string) => url.includes("/v1/markdown");

// Fresh import each test so the module-level health cache starts empty.
async function load() {
	vi.resetModules();
	return import("./docling");
}

const fetchMock = vi.fn();

beforeEach(() => {
	mockEnv.DOCLING_URL = "http://docling.test";
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("checkDoclingHealth", () => {
	it("reports unavailable without ever fetching when DOCLING_URL is unset", async () => {
		mockEnv.DOCLING_URL = undefined;
		const { checkDoclingHealth } = await load();
		expect(await checkDoclingHealth()).toEqual({
			status: "unavailable",
			message: "DOCLING_URL not configured",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reports healthy when the service returns ok", async () => {
		fetchMock.mockResolvedValue(res({ ok: true }));
		const { checkDoclingHealth } = await load();
		expect(await checkDoclingHealth()).toEqual({
			status: "healthy",
			message: "Connected",
		});
	});

	it("surfaces the status code when the service returns non-ok", async () => {
		fetchMock.mockResolvedValue(res({ ok: false, status: 503 }));
		const { checkDoclingHealth } = await load();
		expect(await checkDoclingHealth()).toEqual({
			status: "unavailable",
			message: "Docling returned 503",
		});
	});

	it("reports unavailable when the fetch throws", async () => {
		fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
		const { checkDoclingHealth } = await load();
		expect(await checkDoclingHealth()).toEqual({
			status: "unavailable",
			message: "Cannot reach Docling service",
		});
	});
});

describe("getDoclingMarkdown", () => {
	const buffer = Buffer.from("%PDF-1.7 fake");

	it("returns null without fetching when DOCLING_URL is unset", async () => {
		mockEnv.DOCLING_URL = undefined;
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns null when the health probe fails (no markdown request made)", async () => {
		fetchMock.mockImplementation((url: string) =>
			isMarkdown(url)
				? Promise.resolve(res({ ok: true, json: { markdown: "x" } }))
				: Promise.resolve(res({ ok: false, status: 500 })),
		);
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1); // health probe only
	});

	it("posts the file and returns the markdown on success", async () => {
		fetchMock.mockImplementation((url: string) =>
			isMarkdown(url)
				? Promise.resolve(res({ ok: true, json: { markdown: "# Title" } }))
				: Promise.resolve(res({ ok: true })),
		);
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBe("# Title");

		const call = fetchMock.mock.calls.find(([url]) => isMarkdown(url));
		expect(call?.[0]).toBe("http://docling.test/v1/markdown");
		expect(call?.[1]).toMatchObject({ method: "POST" });
		expect(call?.[1].body).toBeInstanceOf(FormData);
	});

	it("strips a trailing slash from DOCLING_URL when building the endpoint", async () => {
		mockEnv.DOCLING_URL = "http://docling.test/";
		fetchMock.mockImplementation((url: string) =>
			isMarkdown(url)
				? Promise.resolve(res({ ok: true, json: { markdown: "ok" } }))
				: Promise.resolve(res({ ok: true })),
		);
		const { getDoclingMarkdown } = await load();
		await getDoclingMarkdown(buffer, "paper.pdf");
		const call = fetchMock.mock.calls.find(([url]) => isMarkdown(url));
		expect(call?.[0]).toBe("http://docling.test/v1/markdown");
	});

	it("returns null when the conversion endpoint returns non-ok", async () => {
		fetchMock.mockImplementation((url: string) =>
			isMarkdown(url)
				? Promise.resolve(res({ ok: false, status: 422 }))
				: Promise.resolve(res({ ok: true })),
		);
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
	});

	it("returns null when the response omits a markdown field", async () => {
		fetchMock.mockImplementation((url: string) =>
			isMarkdown(url)
				? Promise.resolve(res({ ok: true, json: {} }))
				: Promise.resolve(res({ ok: true })),
		);
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
	});

	it("returns null and disables the service for the next call when the request throws", async () => {
		let markdownCalls = 0;
		fetchMock.mockImplementation((url: string) => {
			if (isMarkdown(url)) {
				markdownCalls++;
				return Promise.reject(new Error("network down"));
			}
			return Promise.resolve(res({ ok: true }));
		});
		const { getDoclingMarkdown } = await load();
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
		// Cached unhealthy: second call short-circuits before hitting the endpoint.
		expect(await getDoclingMarkdown(buffer, "paper.pdf")).toBeNull();
		expect(markdownCalls).toBe(1);
	});
});
