import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import type { VatIdCheck } from "@/generated/prisma/client";
import { lookup } from "@/shared/lib/lookup";
import { cn } from "@/shared/lib/utils";

const REGISTRY_LABELS = {
	VIES: "VIES",
	MF: "the Polish VAT register",
	UID: "the Swiss UID register",
	BRREG: "the Norwegian VAT register",
};

export const VAT_ID_STATUS_VIEW = {
	VERIFIED: {
		Icon: IconCircleCheck,
		className: "text-green-700 dark:text-green-400",
	},
	NOT_FOUND: {
		Icon: IconAlertTriangle,
		className: "text-amber-700 dark:text-amber-400",
		text: "Not found in the registry. Check the number; you can still continue.",
	},
	UNAVAILABLE: {
		Icon: IconClock,
		className: "text-muted-foreground",
		text: "Registry unavailable, we'll check later.",
	},
} as const;

export function VatIdStatus({
	check,
}: {
	check:
		| Pick<VatIdCheck, "status" | "source" | "registryName">
		| null
		| undefined;
}) {
	if (!check || check.status === "NOT_CHECKABLE") return null;
	const view = VAT_ID_STATUS_VIEW[check.status];
	const text =
		"text" in view
			? view.text
			: `Found in ${lookup(REGISTRY_LABELS, check.source ?? "") ?? "the registry"}${check.registryName ? `: ${check.registryName}` : ""}`;

	return (
		<p
			className={cn("flex items-start gap-1.5 text-sm", view.className)}
			data-testid="vat-id-status"
		>
			<view.Icon className="mt-0.5 size-4 shrink-0" />
			{text}
		</p>
	);
}
