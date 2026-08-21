import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import type { PublicParticipant } from "@/features/planner/api/participants";
import { affiliationDisplay } from "@/shared/components/author-card-styles";
import { cn } from "@/shared/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { ContactDetails } from "./contact-details";
import { Highlight } from "./themes/shared";

const CARD =
	"flex h-full items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3 text-left";

export function ParticipantsList({
	participants,
	query,
	themeId,
}: {
	participants: PublicParticipant[];
	query: string;
	themeId: string;
}) {
	const [selected, setSelected] = useState<PublicParticipant | null>(null);

	if (participants.length === 0) {
		return (
			<p className="text-muted-foreground py-20 text-center text-lg">
				{query ? "Nobody matches your search." : "No participants to show yet."}
			</p>
		);
	}

	return (
		<>
			<p className="text-muted-foreground mb-4 text-xs font-[var(--prog-font-meta)] tracking-[var(--prog-tracking)] uppercase">
				{participants.length} participants
			</p>
			<div
				className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
				data-testid="participants-list"
			>
				{participants.map((p) => {
					const inner = <ParticipantCardBody participant={p} query={query} />;
					if (!p.email && !p.orcid) {
						return (
							<div className={CARD} data-testid="participant-card" key={p.id}>
								{inner}
							</div>
						);
					}
					return (
						<button
							aria-label={`Contact details: ${p.firstName} ${p.lastName}`}
							className={cn(
								CARD,
								"group cursor-pointer transition-colors hover:border-primary/60 hover:bg-accent",
							)}
							data-testid="participant-card-button"
							key={p.id}
							onClick={() => setSelected(p)}
							type="button"
						>
							{inner}
							<IconChevronRight className="text-muted-foreground size-4 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
						</button>
					);
				})}
			</div>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				open={!!selected}
			>
				<DialogContent
					className="bg-background text-foreground font-[var(--prog-font-body)] sm:max-w-md"
					data-program-theme={themeId}
					data-testid="participant-details"
				>
					{selected && (
						<>
							<DialogHeader className="pr-8 text-left">
								<DialogTitle className="text-lg leading-snug font-[var(--prog-font-display)] font-semibold">
									{selected.firstName} {selected.lastName}
								</DialogTitle>
							</DialogHeader>
							<ContactDetails
								affiliationName={selected.affiliationName}
								email={selected.email}
								orcid={selected.orcid}
							/>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function ParticipantCardBody({
	participant,
	query,
}: {
	participant: PublicParticipant;
	query: string;
}) {
	const name = `${participant.firstName} ${participant.lastName}`.trim();
	return (
		<div className="min-w-0 flex-1">
			<span className="text-foreground font-medium">
				<Highlight query={query} text={name} />
			</span>
			<p className="text-muted-foreground mt-0.5 text-xs leading-snug break-words">
				<Highlight
					query={query}
					text={affiliationDisplay(participant.affiliationName)}
				/>
			</p>
		</div>
	);
}
