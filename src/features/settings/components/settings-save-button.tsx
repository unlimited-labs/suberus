import { IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";

interface SettingsSaveButtonProps {
	onSave: () => void;
	isSaving: boolean;
	label?: string;
}

export function SettingsSaveButton({
	onSave,
	isSaving,
	label = "Save",
}: SettingsSaveButtonProps) {
	return (
		<div className="mt-6 flex justify-end">
			<Button disabled={isSaving} onClick={onSave}>
				{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
				{label}
			</Button>
		</div>
	);
}
