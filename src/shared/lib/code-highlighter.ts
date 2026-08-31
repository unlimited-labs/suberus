import {
	createHighlighterCore,
	createJavaScriptRegexEngine,
} from "react-shiki/core";
import { appCodeTheme } from "./code-theme";

const LANG_LOADERS = {
	html: () => import("@shikijs/langs/html"),
	markdown: () => import("@shikijs/langs/markdown"),
	xml: () => import("@shikijs/langs/xml"),
};

export type CodeLang = keyof typeof LANG_LOADERS;

export type AppHighlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

let pending: Promise<AppHighlighter> | undefined;

export function getCodeHighlighter() {
	pending ??= createHighlighterCore({
		engine: createJavaScriptRegexEngine(),
		langs: Object.values(LANG_LOADERS).map((load) => load()),
		themes: [appCodeTheme],
	}).catch((cause: unknown) => {
		pending = undefined;
		throw cause;
	});
	return pending;
}
