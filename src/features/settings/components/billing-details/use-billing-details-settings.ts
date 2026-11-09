import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	billingDetailsConfigQueryOptions,
	setSettingFn,
} from "@/features/settings/api/settings";
import {
	type BillingDetailsSettings,
	billingDetailsSettingsSchema,
} from "@/features/settings/billing-details-schema";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

export function useBillingDetailsSettings(initialData: BillingDetailsSettings) {
	const queryClient = useQueryClient();

	return useAppForm({
		defaultValues: initialData,
		validators: {
			onChange: billingDetailsSettingsSchema,
			onSubmit: billingDetailsSettingsSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await setSettingFn({
					data: {
						key: "BILLING_DETAILS",
						value: billingDetailsSettingsSchema.parse(value),
					},
				});
				await Promise.all([
					queryClient.invalidateQueries(
						adminSettingQueryOptions("BILLING_DETAILS"),
					),
					queryClient.invalidateQueries(billingDetailsConfigQueryOptions()),
				]);
				toast.success("Billing details saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save settings"));
			}
		},
	});
}

export type BillingDetailsSettingsForm = ReturnType<
	typeof useBillingDetailsSettings
>;
