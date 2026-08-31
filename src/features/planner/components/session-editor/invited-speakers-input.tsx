import {
	IconPlus,
	IconStar,
	IconStarFilled,
	IconTrash,
} from "@tabler/icons-react";
import type { InvitedSpeaker } from "@/features/planner/server/invited";
import {
	presenterAriaLabel,
	presenterButtonClassName,
	presenterLabel,
} from "@/shared/components/author-card-styles";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface InvitedSpeakersInputProps {
	value: InvitedSpeaker[];
	onChange: (speakers: InvitedSpeaker[]) => void;
}

export function InvitedSpeakersInput({
	value,
	onChange,
}: InvitedSpeakersInputProps) {
	const addSpeaker = () => {
		onChange([
			...value,
			{
				firstName: "",
				lastName: "",
				affiliationName: "",
				isPresenter: value.length === 0,
			},
		]);
	};

	const removeSpeaker = (index: number) => {
		const next = value.filter((_, i) => i !== index);
		if (value[index]?.isPresenter && next.length > 0) {
			next[0] = { ...next[0], isPresenter: true };
		}
		onChange(next);
	};

	const updateSpeaker = (index: number, updates: Partial<InvitedSpeaker>) => {
		onChange(
			value.map((speaker, i) =>
				i === index ? { ...speaker, ...updates } : speaker,
			),
		);
	};

	const setPresenter = (index: number) => {
		onChange(
			value.map((speaker, i) => ({ ...speaker, isPresenter: i === index })),
		);
	};

	return (
		<div className="space-y-3">
			{value.map((speaker, index) => (
				<div
					className="border-border/30 space-y-3 rounded-lg border p-3"
					data-testid={`invited-talk-speaker-${index}`}
					key={index}
				>
					<div className="flex items-center justify-between">
						<button
							aria-label={presenterAriaLabel(speaker.isPresenter)}
							className={presenterButtonClassName(speaker.isPresenter)}
							onClick={() => setPresenter(index)}
							type="button"
						>
							{speaker.isPresenter ? (
								<IconStarFilled className="size-3" />
							) : (
								<IconStar className="size-3" />
							)}
							<span>{presenterLabel(speaker.isPresenter)}</span>
						</button>
						<Button
							aria-label="Remove speaker"
							onClick={() => removeSpeaker(index)}
							size="icon-xs"
							type="button"
							variant="ghost"
						>
							<IconTrash className="size-3.5" />
						</Button>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label className="text-muted-foreground text-xs">
								First name
							</Label>
							<Input
								data-testid={`invited-talk-speaker-${index}-first-name`}
								onChange={(e) =>
									updateSpeaker(index, { firstName: e.target.value })
								}
								value={speaker.firstName}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-muted-foreground text-xs">Last name</Label>
							<Input
								data-testid={`invited-talk-speaker-${index}-last-name`}
								onChange={(e) =>
									updateSpeaker(index, { lastName: e.target.value })
								}
								value={speaker.lastName}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label className="text-muted-foreground text-xs">Affiliation</Label>
						<Input
							data-testid={`invited-talk-speaker-${index}-affiliation`}
							onChange={(e) =>
								updateSpeaker(index, { affiliationName: e.target.value })
							}
							value={speaker.affiliationName}
						/>
					</div>
				</div>
			))}
			<button
				className="text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-xs font-medium transition-all"
				data-testid="invited-talk-add-speaker"
				onClick={addSpeaker}
				type="button"
			>
				<IconPlus className="size-3.5" />
				Add speaker
			</button>
		</div>
	);
}
