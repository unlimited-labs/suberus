import { useQuery } from "@tanstack/react-query";
import type { DocumentDelivery } from "@/features/documents/validations";
import { documentSigningQueryOptions } from "@/features/settings/api/document-signing";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

export const DEFAULT_DELIVERY: DocumentDelivery = {
	sign: true,
	sealVisible: true,
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
	const toggle = (key: keyof DocumentDelivery) => (checked: boolean) =>
		onChange({ ...value, [key]: checked });

	return (
		<div className="space-y-2.5">
			{signing?.enabled && (
				<div className="flex items-center gap-2.5">
					<Checkbox
						checked={value.sign}
						data-testid="document-sign-checkbox"
						id={`${idPrefix}-sign`}
						onCheckedChange={toggle("sign")}
					/>
					<Label className="font-normal" htmlFor={`${idPrefix}-sign`}>
						Sign with the conference certificate
					</Label>
				</div>
			)}
			{signing?.enabled && value.sign && (
				<div className="flex items-center gap-2.5 pl-6">
					<Checkbox
						checked={value.sealVisible}
						data-testid="document-seal-visible-checkbox"
						id={`${idPrefix}-seal-visible`}
						onCheckedChange={toggle("sealVisible")}
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
					onCheckedChange={toggle("notify")}
				/>
				<Label className="font-normal" htmlFor={`${idPrefix}-notify`}>
					E-mail the participant when it is ready
				</Label>
			</div>
		</div>
	);
}
