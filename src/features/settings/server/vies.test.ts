import { describe, expect, it, vi } from "vitest";

vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { queryVies, VIES_URL } = await import("./vies");

const ok = (body: unknown) =>
	vi
		.fn()
		.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

describe("queryVies", () => {
	it("posts the number split into country code and number, with the organizer as requester", async () => {
		const transport = ok({
			valid: true,
			name: "UJ",
			requestIdentifier: "WAPI1",
		});

		const result = await queryVies("PL6750002236", "DE136695976", transport);

		expect(transport).toHaveBeenCalledWith(
			VIES_URL,
			expect.objectContaining({ method: "POST" }),
		);
		expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
			countryCode: "PL",
			vatNumber: "6750002236",
			requesterMemberStateCode: "DE",
			requesterNumber: "136695976",
		});
		expect(result).toMatchObject({
			status: "VERIFIED",
			requestIdentifier: "WAPI1",
		});
	});

	it("sends no requester when the organizer has none", async () => {
		const transport = ok({ valid: false });
		await queryVies("XI980780684", "", transport);
		expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
			countryCode: "XI",
			vatNumber: "980780684",
		});
	});

	it("reports UNAVAILABLE when the request fails or times out", async () => {
		const transport = vi
			.fn()
			.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
		expect((await queryVies("PL6750002236", "", transport)).status).toBe(
			"UNAVAILABLE",
		);
	});

	it("reports UNAVAILABLE on a body that is not a VIES answer", async () => {
		expect((await queryVies("PL6750002236", "", ok(["down"]))).status).toBe(
			"UNAVAILABLE",
		);
	});

	it("reports UNAVAILABLE on an HTTP error", async () => {
		const transport = vi
			.fn()
			.mockResolvedValue(new Response("busy", { status: 503 }));
		expect((await queryVies("PL6750002236", "", transport)).status).toBe(
			"UNAVAILABLE",
		);
	});

	it("retries without the requester when VIES rejects the organizer's VAT ID", async () => {
		const transport = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						actionSucceed: false,
						errorWrappers: [{ error: "INVALID_REQUESTER_INFO" }],
					}),
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ valid: true, name: "UJ" })),
			);

		const result = await queryVies("PL6750002236", "DE136695976", transport);

		expect(transport).toHaveBeenCalledTimes(2);
		expect(JSON.parse(transport.mock.calls[1][1].body)).not.toHaveProperty(
			"requesterNumber",
		);
		expect(result.status).toBe("VERIFIED");
	});
});
