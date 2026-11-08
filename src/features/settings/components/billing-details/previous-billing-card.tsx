import { IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	billingTextSplitAvailableQueryOptions,
	splitBillingTextFn,
} from "@/features/settings/api/billing-text-split";
import {
	type BillingColumnValues,
	fillEmptyActiveFields,
	showsPreviousText,
} from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";

export function PreviousBillingCard({
	values,
	config,
	country,
	onFill,
}: {
	values: BillingColumnValues;
	config: BillingDetailsSettings;
	country: string;
	onFill: (fill: BillingColumnValues) => void;
}) {
	const { data: canSplit } = useQuery(billingTextSplitAvailableQueryOptions());
	const split = useMutation({
		mutationFn: (text: string) =>
			splitBillingTextFn({ data: { text, country: country || undefined } }),
		onSuccess: (found) => onFill(fillEmptyActiveFields(values, config, found)),
		onError: (error) =>
			toast.error(getErrorMessage(error, "Could not split the text")),
	});
	const [saved] = useState(values);
	if (!showsPreviousText(saved, config)) return null;
	const text = saved.billingText ?? "";

	return (
		<div
			className="bg-muted/40 space-y-2 rounded-lg border p-3 text-sm"
			data-testid="previous-billing-card"
		>
			<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				Your previous billing details
			</p>
			<p className="whitespace-pre-line">{text}</p>
			{canSplit && (
				<Button
					disabled={split.isPending}
					onClick={() => split.mutate(text)}
					size="sm"
					type="button"
					variant="outline"
				>
					<IconSparkles className="size-4" />
					Fill fields from this text
				</Button>
			)}
		</div>
	);
}
