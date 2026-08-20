export const titleLabels = {
	dr: "Dr",
	prof: "Prof",
	"prof-dr": "Prof. Dr",
	"dr-hab": "Dr hab.",
	mgr: "MSc",
	inz: "Eng",
	lic: "BSc",
} satisfies Record<string, string>;

export const titleOptions = [
	{ value: "dr", label: "Dr" },
	{ value: "prof", label: "Prof" },
	{ value: "prof-dr", label: "Prof. Dr" },
	{ value: "dr-hab", label: "Dr hab." },
	{ value: "mgr", label: "MSc" },
	{ value: "inz", label: "Eng" },
	{ value: "lic", label: "BSc" },
] as const;
