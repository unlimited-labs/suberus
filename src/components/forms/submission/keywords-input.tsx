import { IconX } from "@tabler/icons-react";
import {
	type ChangeEvent,
	type KeyboardEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

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
	placeholder = "",
	className,
}: KeywordsInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const addKeyword = useCallback(
		(keyword: string) => {
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
		},
		[value, onChange, maxKeywords],
	);

	const removeKeyword = useCallback(
		(keyword: string) => {
			onChange(value.filter((k) => k !== keyword));
			setError(null);
		},
		[value, onChange],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addKeyword(inputValue);
			} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
				removeKeyword(value[value.length - 1]);
			}
		},
		[inputValue, value, addKeyword, removeKeyword],
	);

	const handleInputChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
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
		},
		[addKeyword],
	);

	const handleContainerClick = () => {
		inputRef.current?.focus();
	};

	return (
		<div className={cn("space-y-2", className)}>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: click focuses inner input */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: visual wrapper for input */}
			<div
				onClick={handleContainerClick}
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
						key={keyword}
						className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-secondary text-secondary-foreground rounded"
					>
						{keyword}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								removeKeyword(keyword);
							}}
							className="rounded hover:bg-foreground/20 p-0.5 transition-colors"
							aria-label={`Remove ${keyword}`}
						>
							<IconX className="size-3" />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					placeholder={value.length === 0 ? placeholder : ""}
					disabled={value.length >= maxKeywords}
					className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
				/>
			</div>

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			<p className="text-xs text-muted-foreground">
				{value.length} / {maxKeywords} keywords
			</p>
		</div>
	);
}
