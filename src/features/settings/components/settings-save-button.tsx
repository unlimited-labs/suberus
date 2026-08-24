import { IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";

interface SettingsSaveButtonProps {
	isSaving: boolean;
	testId: string;
	label?: string;
}

/** Submits the enclosing `Form`; every caller must render one. */
export function SettingsSaveButton({
	isSaving,
	testId,
	label = "Save",
}: SettingsSaveButtonProps) {
	return (
		<div className="mt-6 flex justify-end">
			<Button data-testid={testId} disabled={isSaving} type="submit">
				{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
				{label}
			</Button>
		</div>
	);
}
