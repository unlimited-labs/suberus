import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { saveProgramQrSettingsFn } from "@/features/planner/api/qr-codes";
import { programQrSettingsSchema } from "@/features/planner/validations";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import type { ProgramQrSettings } from "@/features/settings/types";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

type QrTarget = "zip" | "program";

const DOWNLOAD_URL = {
	zip: "/api/admin/program/qr-codes",
	program: "/api/admin/program/qr-program",
} satisfies Record<QrTarget, string>;

export function useQrSettingsForm(initial: ProgramQrSettings) {
	const queryClient = useQueryClient();
	const target = useRef<QrTarget>("zip");

	const form = useAppForm({
		defaultValues: initial,
		validators: {
			onChange: programQrSettingsSchema,
			onSubmit: programQrSettingsSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await saveProgramQrSettingsFn({ data: value });
				await queryClient.invalidateQueries({
					queryKey: adminSettingQueryOptions("PROGRAM_QR").queryKey,
				});
				window.location.assign(DOWNLOAD_URL[target.current]);
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to generate QR codes"));
			}
		},
	});

	const submitFor = (next: QrTarget) => {
		target.current = next;
		void form.handleSubmit();
	};

	return { form, submitFor };
}
