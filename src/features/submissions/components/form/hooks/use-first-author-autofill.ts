import { useEffect, useRef } from "react";
import type { SessionUser } from "@/shared/hooks/use-session";
import { getAffiliationById } from "@/shared/server/affiliations-fn";
import type { Author } from "@/shared/types/author";

export function buildAuthorFromUser(
	user: SessionUser,
	affiliationName: string,
): Author {
	return {
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		email: user.email ?? "",
		affiliationId: user.affiliationId ?? null,
		affiliationName,
		isPresenter: true,
	};
}

function isFirstAuthorEmpty(author: Author | undefined): boolean {
	return !author?.firstName && !author?.lastName && !author?.email;
}

function needsAffiliationBackfill(
	firstAuthor: Author | undefined,
	hasAutoFilled: boolean,
	isFetching: boolean,
): boolean {
	return (
		hasAutoFilled &&
		!isFetching &&
		!!firstAuthor &&
		!firstAuthor.affiliationName
	);
}

async function fillFirstAuthorFromUser(
	user: SessionUser,
	authors: Author[],
	setAuthors: (authors: Author[]) => void,
): Promise<void> {
	const rest = authors.slice(1);
	if (!user.affiliationId) {
		setAuthors([buildAuthorFromUser(user, ""), ...rest]);
		return;
	}
	try {
		const affiliation = await getAffiliationById({
			data: { id: user.affiliationId },
		});
		setAuthors([buildAuthorFromUser(user, affiliation?.name ?? ""), ...rest]);
	} catch {
		setAuthors([buildAuthorFromUser(user, ""), ...rest]);
	}
}

async function backfillFirstAuthorAffiliation(
	affiliationId: string,
	getAuthors: () => Author[],
	setAuthors: (authors: Author[]) => void,
): Promise<void> {
	try {
		const affiliation = await getAffiliationById({
			data: { id: affiliationId },
		});
		if (!affiliation) return;
		const updated = [...getAuthors()];
		updated[0] = {
			...updated[0],
			affiliationId,
			affiliationName: affiliation.name,
		};
		setAuthors(updated);
	} catch {
		// Silently fail — AffiliationSelect has its own fallback.
	}
}

interface UseFirstAuthorAutofillArgs {
	user: SessionUser | undefined;
	hasInitialAuthors: boolean;
	/** Reads the live `authors` field value (not a render-time snapshot). */
	getAuthors: () => Author[];
	setAuthors: (authors: Author[]) => void;
}

/**
 * Auto-fills the first author from the logged-in user on new submissions: once
 * when the author row is still empty, and again if the user's affiliation
 * resolves later. Fetches the affiliation name lazily and degrades gracefully.
 *
 * Returns `markAutoFilled` so callers that populate authors another way (e.g.
 * document extraction) can suppress the auto-fill.
 */
export function useFirstAuthorAutofill({
	user,
	hasInitialAuthors,
	getAuthors,
	setAuthors,
}: UseFirstAuthorAutofillArgs) {
	const hasAutoFilledRef = useRef(false);
	const isFetchingAffiliationRef = useRef(false);

	useEffect(() => {
		if (hasInitialAuthors || !user) return;

		const runFetch = (fetch: () => Promise<void>) => {
			isFetchingAffiliationRef.current = true;
			void fetch().finally(() => {
				isFetchingAffiliationRef.current = false;
			});
		};

		const authors = getAuthors();
		const firstAuthor = authors[0];

		if (!hasAutoFilledRef.current && isFirstAuthorEmpty(firstAuthor)) {
			hasAutoFilledRef.current = true;
			runFetch(() => fillFirstAuthorFromUser(user, authors, setAuthors));
			return;
		}

		const needsBackfill = needsAffiliationBackfill(
			firstAuthor,
			hasAutoFilledRef.current,
			isFetchingAffiliationRef.current,
		);
		if (needsBackfill && user.affiliationId) {
			const affiliationId = user.affiliationId;
			runFetch(() =>
				backfillFirstAuthorAffiliation(affiliationId, getAuthors, setAuthors),
			);
		}
	}, [user, hasInitialAuthors, getAuthors, setAuthors]);

	return {
		markAutoFilled: () => {
			hasAutoFilledRef.current = true;
		},
	};
}
