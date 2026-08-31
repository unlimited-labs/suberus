import type { ThemeRegistrationRaw } from "shiki/core";

export const APP_CODE_THEME = "app";

export const appCodeTheme: ThemeRegistrationRaw = {
	name: APP_CODE_THEME,
	type: "light",
	colors: {
		"editor.background": "transparent",
		"editor.foreground": "var(--sx-fg)",
	},
	settings: [
		{ settings: { foreground: "var(--sx-fg)" } },
		{
			scope: ["punctuation", "meta.brace"],
			settings: { foreground: "var(--sx-muted)" },
		},
		{
			scope: ["comment", "punctuation.definition.comment"],
			settings: { fontStyle: "italic", foreground: "var(--sx-muted)" },
		},
		{
			scope: [
				"entity.name.tag",
				"punctuation.definition.tag",
				"keyword",
				"storage",
			],
			settings: { foreground: "var(--sx-tag)" },
		},
		{
			scope: [
				"entity.other.attribute-name",
				"variable",
				"support.type.property-name",
			],
			settings: { foreground: "var(--sx-attr)" },
		},
		{
			scope: ["string", "string.quoted", "meta.attribute", "support.constant"],
			settings: { foreground: "var(--sx-string)" },
		},
		{
			scope: ["constant", "constant.character.entity", "constant.numeric"],
			settings: { foreground: "var(--sx-accent)" },
		},
		{
			scope: ["markup.heading", "entity.name.section"],
			settings: { fontStyle: "bold", foreground: "var(--sx-tag)" },
		},
		{
			scope: ["markup.bold"],
			settings: { fontStyle: "bold", foreground: "var(--sx-accent)" },
		},
		{
			scope: ["markup.italic"],
			settings: { fontStyle: "italic", foreground: "var(--sx-accent)" },
		},
		{
			scope: ["markup.underline.link", "string.other.link", "markup.link"],
			settings: { fontStyle: "underline", foreground: "var(--sx-string)" },
		},
		{
			scope: ["markup.inline.raw", "markup.fenced_code", "markup.raw"],
			settings: { foreground: "var(--sx-string)" },
		},
		{
			scope: ["markup.list", "punctuation.definition.list.begin"],
			settings: { foreground: "var(--sx-attr)" },
		},
		{
			scope: ["markup.quote"],
			settings: { fontStyle: "italic", foreground: "var(--sx-muted)" },
		},
	],
};
