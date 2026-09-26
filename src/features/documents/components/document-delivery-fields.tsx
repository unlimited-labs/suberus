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

export function DocumentDeliveryFields({
	idPrefix,
	value,
	onChange,
}: DocumentDeliveryFieldsProps) {
	const { data: signing } = useQuery(documentSigningQueryOptions());
	const setSignMode = (signMode: DocumentDelivery["signMode"]) =>
		onChange({ ...value, signMode });

	return (
		<div className="space-y-2.5">
			{signing?.enabled && (
				<div className="flex items-center gap-2.5">
					<Checkbox
						checked={value.signMode !== "NONE"}
						data-testid="document-sign-checkbox"
						id={`${idPrefix}-sign`}
						onCheckedChange={(checked) =>
							setSignMode(checked ? "VISIBLE" : "NONE")
						}
					/>
					<Label className="font-normal" htmlFor={`${idPrefix}-sign`}>
						Sign with the conference certificate
					</Label>
				</div>
			)}
			{signing?.enabled && value.signMode !== "NONE" && (
				<div className="flex items-center gap-2.5 pl-6">
					<Checkbox
						checked={value.signMode === "VISIBLE"}
						data-testid="document-seal-visible-checkbox"
						id={`${idPrefix}-seal-visible`}
						onCheckedChange={(checked) =>
							setSignMode(checked ? "VISIBLE" : "INVISIBLE")
						}
					/>
					<Label className="font-normal" htmlFor={`${idPrefix}-seal-visible`}>
						Visible seal
					</Label>
				</div>
			)}
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
