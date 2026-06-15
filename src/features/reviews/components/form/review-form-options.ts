import {
	IconAlertCircle,
	IconCheck,
	IconCircleCheck,
	IconX,
} from "@tabler/icons-react";

export const decisionOptions = [
	{
		value: "ACCEPT" as const,
		label: "Accept",
		description: "Recommends accepting the work as-is, with no changes.",
		icon: IconCheck,
		color: "emerald",
	},
	{
		value: "ACCEPT_WITH_MINOR_REVISIONS" as const,
		label: "Accept with Minor Revisions",
		description:
			"Recommends conditional acceptance — the author fixes small issues, with no new review round.",
		icon: IconCircleCheck,
		color: "sky",
	},
	{
		value: "REVISE_AND_RESUBMIT" as const,
		label: "Revise and Resubmit",
		description:
			"Sends the work back for substantial changes and another review round.",
		icon: IconAlertCircle,
		color: "amber",
	},
	{
		value: "REJECT" as const,
		label: "Reject",
		description:
			"Recommends rejection — the work cannot be accepted, even after revisions.",
		icon: IconX,
		color: "red",
	},
];

export const confidenceLevels = [
	{ value: 1, label: "Very Low", description: "Outside my expertise" },
	{ value: 2, label: "Low", description: "Familiar but not expert" },
	{ value: 3, label: "Medium", description: "Knowledgeable" },
	{ value: 4, label: "High", description: "Expert in this area" },
	{ value: 5, label: "Very High", description: "Leading expert" },
];
