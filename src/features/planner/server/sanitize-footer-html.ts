import {
	createDomPurifier,
	type Purifier,
} from "@/shared/server/sanitize-html";

let purifier: Purifier | null = null;

function getPurifier(): Purifier {
	if (!purifier) {
		purifier = createDomPurifier();
		purifier.addHook("afterSanitizeAttributes", (node) => {
			if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
				node.setAttribute("rel", "noopener noreferrer");
			}
			const style = node.getAttribute("style");
			if (style?.includes("url(")) {
				node.setAttribute("style", style.replace(/url\([^)]*\)/gi, ""));
			}
		});
	}
	return purifier;
}

const CONFIG = {
	ALLOWED_TAGS: [
		"div",
		"p",
		"span",
		"a",
		"img",
		"br",
		"strong",
		"em",
		"b",
		"i",
		"ul",
		"ol",
		"li",
	],
	ALLOWED_ATTR: [
		"class",
		"style",
		"href",
		"target",
		"rel",
		"src",
		"alt",
		"title",
		"width",
		"height",
		"loading",
		"decoding",
	],
	FORBID_TAGS: [
		"script",
		"style",
		"iframe",
		"object",
		"embed",
		"form",
		"input",
		"svg",
	],
};

export function sanitizeProgramFooterHtml(html: string): string {
	return getPurifier().sanitize(html, CONFIG);
}
