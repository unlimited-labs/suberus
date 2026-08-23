import { IconStarFilled } from "@tabler/icons-react";
import { affiliationDisplay } from "@/shared/components/author-card-styles";

export const HEADING =
	"font-(family-name:--prog-font-meta) text-xs font-semibold uppercase tracking-[var(--prog-tracking)] text-muted-foreground";
export const ABSTRACT = "text-sm leading-relaxed text-foreground";

export function ContactDetails({
	affiliationName,
	email,
	orcid,
	website,
	linkedin,
	isPresenter = false,
}: {
	affiliationName: string | null;
	email: string | null;
	orcid: string | null;
	website: string | null;
	linkedin: string | null;
	isPresenter?: boolean;
}) {
	return (
		<div className="space-y-4">
			{isPresenter && (
				<span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
					<IconStarFilled className="size-3" />
					Presenter
				</span>
			)}
			<section className="space-y-1">
				<h3 className={HEADING}>Affiliation</h3>
				<p className={ABSTRACT}>{affiliationDisplay(affiliationName)}</p>
			</section>
			{email && (
				<section className="space-y-1">
					<h3 className={HEADING}>Email</h3>
					<a
						className="text-foreground text-sm break-all underline-offset-4 hover:underline"
						data-testid="author-email"
						href={`mailto:${email}`}
					>
						{email}
					</a>
				</section>
			)}
			{orcid && (
				<section className="space-y-1">
					<h3 className={HEADING}>ORCID</h3>
					<a
						className="text-foreground inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
						data-testid="author-orcid"
						href={`https://orcid.org/${orcid}`}
						rel="noopener noreferrer"
						target="_blank"
					>
						<span
							aria-hidden
							className="flex size-4 items-center justify-center rounded-full bg-[#A6CE39] text-[8px] font-bold text-white"
						>
							iD
						</span>
						{orcid}
					</a>
				</section>
			)}
			{website && (
				<section className="space-y-1">
					<h3 className={HEADING}>Website</h3>
					<a
						className="text-foreground text-sm break-all underline-offset-4 hover:underline"
						data-testid="author-website"
						href={website}
						rel="noopener noreferrer"
						target="_blank"
					>
						{website}
					</a>
				</section>
			)}
			{linkedin && (
				<section className="space-y-1">
					<h3 className={HEADING}>LinkedIn</h3>
					<a
						className="text-foreground text-sm break-all underline-offset-4 hover:underline"
						data-testid="author-linkedin"
						href={linkedin}
						rel="noopener noreferrer"
						target="_blank"
					>
						{linkedin}
					</a>
				</section>
			)}
		</div>
	);
}
