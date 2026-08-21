import { IconX } from "@tabler/icons-react";
import { type ChangeEvent, type KeyboardEvent, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface KeywordsInputProps {
	value: string[];
	onChange: (keywords: string[]) => void;
	maxKeywords?: number;
	placeholder?: string;
	className?: string;
}

export function KeywordsInput({
	value,
	onChange,
	maxKeywords = 5,
	placeholder = "Separate with comma or Enter",
	className,
}: KeywordsInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isFocused, setIsFocused] = useState(false);

	const addKeyword = (keyword: string) => {
		const trimmed = keyword.trim().toLowerCase();

		if (!trimmed) {
			return;
		}

		if (value.length >= maxKeywords) {
			setError(`Maximum ${maxKeywords} keywords allowed`);
			return;
		}

		if (value.includes(trimmed)) {
			setError("Keyword already added");
			return;
		}

		onChange([...value, trimmed]);
		setInputValue("");
		setError(null);
	};

	const removeKeyword = (keyword: string) => {
		onChange(value.filter((k) => k !== keyword));
		setError(null);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addKeyword(inputValue);
		} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
			removeKeyword(value[value.length - 1]);
		}
	};

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (val.includes(",")) {
			const tokens = val.split(",");
			const lastToken = tokens.pop() ?? "";
			for (const t of tokens) {
				addKeyword(t);
			}
			setInputValue(lastToken);
		} else {
			setInputValue(val);
		}
		setError(null);
	};

	const handleBlur = () => {
		setIsFocused(false);
		if (inputValue.trim()) {
			addKeyword(inputValue);
		}
	};

	return (
		<div className={cn("space-y-2", className)} data-testid="keywords-section">
			<label
				className={cn(
					"flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-2 rounded-md border bg-background transition-colors cursor-text",
					isFocused
						? "border-ring ring-1 ring-ring"
						: "border-input hover:border-ring/50",
					value.length >= maxKeywords && "opacity-60",
				)}
			>
				{value.map((keyword) => (
					<span
						className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-secondary text-secondary-foreground rounded"
						key={keyword}
					>
						{keyword}
						<button
							aria-label={`Remove ${keyword}`}
							className="rounded hover:bg-foreground/20 p-0.5 transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								removeKeyword(keyword);
							}}
							type="button"
						>
							<IconX className="size-3" />
						</button>
					</span>
				))}
				<input
					className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
					disabled={value.length >= maxKeywords}
					onBlur={handleBlur}
					onChange={handleInputChange}
					onFocus={() => setIsFocused(true)}
					onKeyDown={handleKeyDown}
					placeholder={value.length === 0 ? placeholder : ""}
					type="text"
					value={inputValue}
				/>
			</label>

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
