import { useQuery } from "@tanstack/react-query";
import { documentSigningQueryOptions } from "@/features/settings/api/document-signing";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

interface DocumentDeliveryFieldsProps {
	idPrefix: string;
	sign: boolean;
	notify: boolean;
	onSignChange: (sign: boolean) => void;
	onNotifyChange: (notify: boolean) => void;
}

export function DocumentDeliveryFields({
	idPrefix,
	sign,
	notify,
	onSignChange,
	onNotifyChange,
}: DocumentDeliveryFieldsProps) {
	const { data: signing } = useQuery(documentSigningQueryOptions());

	return (
		<div className="space-y-2.5">
			{signing?.enabled && (
				<div className="flex items-center gap-2.5">
					<Checkbox
						checked={sign}
						data-testid="document-sign-checkbox"
						id={`${idPrefix}-sign`}
						onCheckedChange={(checked) => onSignChange(checked === true)}
					/>
					<Label className="font-normal" htmlFor={`${idPrefix}-sign`}>
						Sign with the conference certificate
					</Label>
				</div>
			)}
			<div className="flex items-center gap-2.5">
				<Checkbox
					checked={notify}
					data-testid="document-notify-checkbox"
					id={`${idPrefix}-notify`}
					onCheckedChange={(checked) => onNotifyChange(checked === true)}
				/>
				<Label className="font-normal" htmlFor={`${idPrefix}-notify`}>
					E-mail the participant when it is ready
				</Label>
			</div>
		</div>
	);
}
