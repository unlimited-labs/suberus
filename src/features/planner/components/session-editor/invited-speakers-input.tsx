import {
	IconPlus,
	IconStar,
	IconStarFilled,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import type { InvitedSpeaker } from "@/features/planner/server/invited";
import { hasCompleteSpeakerName } from "@/features/planner/validations";
import { AffiliationSelect } from "@/shared/components/affiliation-select";
import {
	presenterAriaLabel,
	presenterButtonClassName,
	presenterLabel,
} from "@/shared/components/author-card-styles";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface InvitedSpeakersInputProps {
	value: InvitedSpeaker[];
	onChange: (updater: (previous: InvitedSpeaker[]) => InvitedSpeaker[]) => void;
}

const ROW_GRID =
	"grid gap-2 sm:grid-cols-[5rem_1fr_1fr_1.6fr_2rem] sm:items-center sm:gap-3";

export function InvitedSpeakersInput({
	value,
	onChange,
}: InvitedSpeakersInputProps) {
	// AffiliationSelect holds its own input state. An index key would hand a removed
	// row's state to the speaker that moves up into it.
	const [rowIds, setRowIds] = useState<string[]>(() =>
		value.map(() => crypto.randomUUID()),
	);
	let ids = rowIds;
	if (ids.length !== value.length) {
		ids =
			ids.length < value.length
				? [
						...ids,
						...Array.from({ length: value.length - ids.length }, () =>
							crypto.randomUUID(),
						),
					]
				: ids.slice(0, value.length);
		setRowIds(ids);
	}

	// AffiliationSelect calls onChange from a delayed blur handler, so a closed-over
	// array would restore a stale speaker list.
	const addSpeaker = () => {
		onChange((previous) => [
			...previous,
			{
				firstName: "",
				lastName: "",
				affiliationId: null,
				affiliationName: "",
				isPresenter: previous.length === 0,
			},
		]);
	};

	const removeSpeaker = (index: number) => {
		setRowIds((previous) => previous.filter((_, i) => i !== index));
		onChange((previous) => {
			const next = previous.filter((_, i) => i !== index);
			if (previous[index]?.isPresenter && next.length > 0) {
				next[0] = { ...next[0], isPresenter: true };
			}
			return next;
		});
	};

	const updateSpeaker = (index: number, updates: Partial<InvitedSpeaker>) => {
		onChange((previous) =>
			previous.map((speaker, i) =>
				i === index ? { ...speaker, ...updates } : speaker,
			),
		);
	};

	const setPresenter = (index: number) => {
		onChange((previous) =>
			previous.map((speaker, i) => ({ ...speaker, isPresenter: i === index })),
		);
	};

	return (
		<div className="space-y-2">
			{value.length > 0 && (
				<div
					aria-hidden
					className={cn(
						ROW_GRID,
						"text-muted-foreground hidden px-1 text-xs sm:grid",
					)}
				>
					<span>Presenter</span>
					<span>First name</span>
					<span>Last name</span>
					<span>Affiliation</span>
					<span />
				</div>
			)}

			{value.map((speaker, index) => {
				const nameIncomplete = !hasCompleteSpeakerName(speaker);
				return (
					<div
						className={cn(
							"relative rounded-lg border p-3 sm:rounded-md sm:border-0 sm:p-1",
							speaker.isPresenter
								? "border-primary/30 bg-primary/5"
								: "border-border/50",
						)}
						data-testid={`invited-talk-speaker-${index}`}
						key={ids[index]}
					>
						<div className={ROW_GRID}>
							<button
								aria-label={presenterAriaLabel(speaker.isPresenter)}
								className={cn(
									presenterButtonClassName(speaker.isPresenter),
									"justify-self-start",
								)}
								onClick={() => setPresenter(index)}
								type="button"
							>
								{speaker.isPresenter ? (
									<IconStarFilled className="size-4" />
								) : (
									<IconStar className="size-4" />
								)}
								<span className="sm:hidden">
									{presenterLabel(speaker.isPresenter)}
								</span>
							</button>

							<div className="space-y-1.5 sm:space-y-0">
								<Label
									className="text-muted-foreground text-xs sm:sr-only"
									htmlFor={`invited-speaker-${index}-first-name`}
								>
									First name
								</Label>
								<Input
									className="h-9"
									data-testid={`invited-talk-speaker-${index}-first-name`}
									id={`invited-speaker-${index}-first-name`}
									onChange={(e) =>
										updateSpeaker(index, { firstName: e.target.value })
									}
									value={speaker.firstName}
								/>
							</div>

							<div className="space-y-1.5 sm:space-y-0">
								<Label
									className="text-muted-foreground text-xs sm:sr-only"
									htmlFor={`invited-speaker-${index}-last-name`}
								>
									Last name
								</Label>
								<Input
									className="h-9"
									data-testid={`invited-talk-speaker-${index}-last-name`}
									id={`invited-speaker-${index}-last-name`}
									onChange={(e) =>
										updateSpeaker(index, { lastName: e.target.value })
									}
									value={speaker.lastName}
								/>
							</div>

							<div className="space-y-1.5 sm:space-y-0">
								<Label className="text-muted-foreground text-xs sm:sr-only">
									Affiliation
								</Label>
								<AffiliationSelect
									displayValue={speaker.affiliationName}
									initValueId={speaker.affiliationId}
									onChange={(id, name) =>
										updateSpeaker(index, {
											affiliationId: id,
											affiliationName: name,
										})
									}
									onTextChange={(name) =>
										updateSpeaker(index, {
											affiliationId: null,
											affiliationName: name,
										})
									}
									testId={`invited-talk-speaker-${index}-affiliation`}
									value={speaker.affiliationId ?? null}
								/>
							</div>

							<Button
								aria-label="Remove speaker"
								className="absolute top-2 right-2 sm:static sm:justify-self-end"
								onClick={() => removeSpeaker(index)}
								size="icon-xs"
								type="button"
								variant="ghost"
							>
								<IconTrash className="size-3.5" />
							</Button>
						</div>
						{nameIncomplete && (
							<p className="text-destructive mt-1.5 px-1 text-xs">
								Provide both the speaker's first and last name, or neither
							</p>
						)}
					</div>
				);
			})}

			<button
				className="text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium transition-colors"
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
