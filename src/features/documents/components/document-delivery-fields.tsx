import { useQuery } from "@tanstack/react-query";
import type { DocumentDelivery } from "@/features/documents/validations";
import { documentSigningQueryOptions } from "@/features/settings/api/document-signing";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

export const DEFAULT_DELIVERY: DocumentDelivery = {
	signMode: "VISIBLE",
	notify: true,
};

export function appendDelivery(form: FormData, delivery: DocumentDelivery) {
	for (const [key, value] of Object.entries(delivery)) {
		form.set(key, String(value));
	}
}

interface DocumentDeliveryFieldsProps {
	idPrefix: string;
	value: DocumentDelivery;
	onChange: (value: DocumentDelivery) => void;
}

function SignModeFields({
	idPrefix,
	signMode,
	onSignModeChange,
}: {
	idPrefix: string;
	signMode: DocumentDelivery["signMode"];
	onSignModeChange: (signMode: DocumentDelivery["signMode"]) => void;
}) {
	const { data: signing } = useQuery(documentSigningQueryOptions());
	if (!signing?.enabled) return null;

	return (
		<>
			<div className="flex items-center gap-2.5">
				<Checkbox
					checked={signMode !== "NONE"}
					data-testid="document-sign-checkbox"
					id={`${idPrefix}-sign`}
					onCheckedChange={(checked) =>
						onSignModeChange(checked ? "VISIBLE" : "NONE")
					}
				/>
				<Label className="font-normal" htmlFor={`${idPrefix}-sign`}>
					Sign with the conference certificate
				</Label>
			</div>
			{signMode !== "NONE" && (
				<div className="flex items-center gap-2.5 pl-6">
					<Checkbox
						checked={signMode === "VISIBLE"}
						data-testid="document-seal-visible-checkbox"
						id={`${idPrefix}-seal-visible`}
						onCheckedChange={(checked) =>
							onSignModeChange(checked ? "VISIBLE" : "INVISIBLE")
						}
					/>
					<Label className="font-normal" htmlFor={`${idPrefix}-seal-visible`}>
						Visible seal
					</Label>
				</div>
			)}
		</>
	);
}

export function DocumentDeliveryFields({
	idPrefix,
	value,
	onChange,
}: DocumentDeliveryFieldsProps) {
	return (
		<div className="space-y-2.5">
			<SignModeFields
				idPrefix={idPrefix}
				onSignModeChange={(signMode) => onChange({ ...value, signMode })}
				signMode={value.signMode}
			/>
			<div className="flex items-center gap-2.5">
				<Checkbox
					checked={value.notify}
					data-testid="document-notify-checkbox"
					id={`${idPrefix}-notify`}
					onCheckedChange={(notify) => onChange({ ...value, notify })}
				/>
				<Label className="font-normal" htmlFor={`${idPrefix}-notify`}>
					E-mail the participant when it is ready
				</Label>
			</div>
		</div>
	);
}
