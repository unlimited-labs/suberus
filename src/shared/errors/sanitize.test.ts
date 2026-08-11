import { describe, expect, it } from "vitest";
import {
	GENERIC_ERROR_MESSAGE,
	hasRequestId,
	toClientError,
} from "@/shared/errors/sanitize";

function prismaError(): Error {
	const error = new Error(
		"Invalid `prisma.user.findUnique()` invocation: Unique constraint failed",
	);
	error.name = "PrismaClientKnownRequestError";
	return Object.assign(error, { code: "P2002", meta: { target: ["email"] } });
}

describe("toClientError", () => {
	it("drops the stack so it cannot be serialized to the client", () => {
		const safe = toClientError(new Error("Incorrect password"), "abc123");
		expect(safe.stack).toBe("");
	});

	it("keeps deliberate messages and adds no reference", () => {
		const safe = toClientError(new Error("Incorrect password"), "abc123");
		expect(safe.message).toBe("Incorrect password");
		expect(hasRequestId(safe)).toBe(false);
	});

	it("replaces Prisma messages and drops their own properties", () => {
		const safe = toClientError(prismaError(), "abc123");
		expect(safe.message).toBe(GENERIC_ERROR_MESSAGE);
		expect(Object.keys(safe)).toEqual(["requestId"]);
		expect(hasRequestId(safe) && safe.requestId).toBe("abc123");
	});

	it("replaces infrastructure errors carrying a syscall code", () => {
		const error = Object.assign(
			new Error("connect ECONNREFUSED 10.0.0.7:3900"),
			{ code: "ECONNREFUSED" },
		);
		const safe = toClientError(error, "abc123");
		expect(safe.message).toBe(GENERIC_ERROR_MESSAGE);
		expect(hasRequestId(safe) && safe.requestId).toBe("abc123");
	});

	it("replaces AWS SDK errors", () => {
		const error = Object.assign(new Error("NoSuchBucket: submissions-prod"), {
			$metadata: { httpStatusCode: 404 },
		});
		expect(toClientError(error, "abc123").message).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("replaces native error subclasses", () => {
		const safe = toClientError(new TypeError("fetch failed"), "abc123");
		expect(safe.message).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("replaces non-Error throws", () => {
		const safe = toClientError({ secret: "s3cret" }, "abc123");
		expect(safe.message).toBe(GENERIC_ERROR_MESSAGE);
		expect(JSON.stringify(safe)).not.toContain("s3cret");
	});
});
