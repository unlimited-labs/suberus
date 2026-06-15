// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/shared/hooks/use-session";
import { getAffiliationById } from "@/shared/server/affiliations-fn";
import type { Author } from "@/shared/types/author";
import {
	buildAuthorFromUser,
	useFirstAuthorAutofill,
} from "./use-first-author-autofill";

vi.mock("@/shared/server/affiliations-fn", () => ({
	getAffiliationById: vi.fn(),
}));

const mockGetAffiliationById = vi.mocked(getAffiliationById);

const user = (overrides: Partial<SessionUser> = {}): SessionUser => ({
	id: "u1",
	email: "ada@example.com",
	firstName: "Ada",
	lastName: "Lovelace",
	affiliationId: "aff-1",
	role: "AUTHOR",
	image: null,
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

const emptyAuthor: Author = {
	firstName: "",
	lastName: "",
	email: "",
	affiliationId: null,
	affiliationName: "",
	isPresenter: true,
};

/** Wires the hook to a mutable `authors` store, returning the live setter spy. */
function setup(args: {
	user: SessionUser | undefined;
	hasInitialAuthors: boolean;
	initialAuthors?: Author[];
}) {
	let authors: Author[] = args.initialAuthors ?? [emptyAuthor];
	const setAuthors = vi.fn((next: Author[]) => {
		authors = next;
	});
	const view = renderHook(() =>
		useFirstAuthorAutofill({
			user: args.user,
			hasInitialAuthors: args.hasInitialAuthors,
			getAuthors: () => authors,
			setAuthors,
		}),
	);
	return { view, setAuthors, getAuthors: () => authors };
}

describe("buildAuthorFromUser", () => {
	it("maps the user's profile into a presenter author entry", () => {
		expect(buildAuthorFromUser(user(), "Analytical Engine Ltd")).toEqual({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@example.com",
			affiliationId: "aff-1",
			affiliationName: "Analytical Engine Ltd",
			isPresenter: true,
		});
	});

	it("coalesces null name/affiliation fields", () => {
		const result = buildAuthorFromUser(
			user({ firstName: null, lastName: null, affiliationId: null }),
			"",
		);
		expect(result.firstName).toBe("");
		expect(result.lastName).toBe("");
		expect(result.affiliationId).toBeNull();
	});
});

describe("useFirstAuthorAutofill", () => {
	beforeEach(() => {
		mockGetAffiliationById.mockReset();
	});

	it("does nothing when the form was seeded with initial authors", () => {
		const { setAuthors } = setup({ user: user(), hasInitialAuthors: true });
		expect(setAuthors).not.toHaveBeenCalled();
		expect(mockGetAffiliationById).not.toHaveBeenCalled();
	});

	it("does nothing when there is no logged-in user", () => {
		const { setAuthors } = setup({ user: undefined, hasInitialAuthors: false });
		expect(setAuthors).not.toHaveBeenCalled();
	});

	it("fills the first author and resolves the affiliation name", async () => {
		mockGetAffiliationById.mockResolvedValue({
			id: "aff-1",
			name: "Analytical Engine Ltd",
		} as Awaited<ReturnType<typeof getAffiliationById>>);

		const { setAuthors, getAuthors } = setup({
			user: user(),
			hasInitialAuthors: false,
		});

		await waitFor(() => expect(setAuthors).toHaveBeenCalled());
		expect(mockGetAffiliationById).toHaveBeenCalledWith({
			data: { id: "aff-1" },
		});
		await waitFor(() =>
			expect(getAuthors()[0].affiliationName).toBe("Analytical Engine Ltd"),
		);
		expect(getAuthors()[0]).toMatchObject({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@example.com",
			affiliationId: "aff-1",
			isPresenter: true,
		});
	});

	it("fills the first author without fetching when the user has no affiliation", () => {
		const { setAuthors, getAuthors } = setup({
			user: user({ affiliationId: null }),
			hasInitialAuthors: false,
		});

		expect(mockGetAffiliationById).not.toHaveBeenCalled();
		expect(setAuthors).toHaveBeenCalledTimes(1);
		expect(getAuthors()[0]).toMatchObject({
			firstName: "Ada",
			affiliationId: null,
			affiliationName: "",
		});
	});

	it("falls back to an empty affiliation name when the lookup rejects", async () => {
		mockGetAffiliationById.mockRejectedValue(new Error("network"));

		const { getAuthors } = setup({ user: user(), hasInitialAuthors: false });

		await waitFor(() => expect(getAuthors()[0].firstName).toBe("Ada"));
		expect(getAuthors()[0].affiliationName).toBe("");
	});

	it("preserves additional author rows when filling the first", () => {
		const second: Author = { ...emptyAuthor, firstName: "Charles" };
		const { getAuthors } = setup({
			user: user({ affiliationId: null }),
			hasInitialAuthors: false,
			initialAuthors: [emptyAuthor, second],
		});

		expect(getAuthors()).toHaveLength(2);
		expect(getAuthors()[1]).toEqual(second);
	});
});
