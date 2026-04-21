import { IconSparkles } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";

interface Props {
	id?: string;
	value: string;
	onChange: (v: string) => void;
	onEnter?: () => void;
	placeholder?: string;
	suggestion?: string | null;
	onApplySuggestion?: () => void;
	suggestLabel?: string;
	suggestTitle?: string;
	testId?: string;
	autoFocus?: boolean;
	className?: string;
}

export function TitleWithSuggest({
	id,
	value,
	onChange,
	onEnter,
	placeholder,
	suggestion,
	onApplySuggestion,
	suggestLabel = "suggest",
	suggestTitle,
	testId,
	autoFocus,
	className,
}: Props) {
	const showSuggest = Boolean(suggestion && onApplySuggestion);
	return (
		<div className="relative">
			<Input
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && onEnter) onEnter();
				}}
				placeholder={placeholder}
				data-testid={testId}
				autoFocus={autoFocus}
				className={className ?? (showSuggest ? "pr-20" : undefined)}
			/>
			{showSuggest && (
				<button
					type="button"
					onClick={onApplySuggestion}
					className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
					title={suggestTitle}
				>
					<IconSparkles size={10} />
					{suggestLabel}
				</button>
			)}
		</div>
	);
}
