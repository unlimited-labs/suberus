declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		/** Page name for the document title; the deepest matched route that sets it wins. */
		title?: string;
	}
}

export function pageTitle(
	matches: readonly { staticData?: { title?: string } }[],
	site: string,
): string {
	const page = matches.findLast((m) => m.staticData?.title)?.staticData?.title;
	return page ? `${page} | ${site}` : site;
}
