import { IconBuilding, IconLoader2 } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
	createAffiliation,
	getAffiliationById,
	getAffiliations,
} from "@/utils/affiliations.functions";

interface Affiliation {
	id: string;
	name: string;
}

interface AffiliationSelectProps {
	value: string | null;
	displayValue?: string;
	/** If provided, fetches affiliation name on mount when displayValue is empty */
	initValueId?: string | null;
	onChange: (affiliationId: string | null, affiliationName: string) => void;
	hasError?: boolean;
	className?: string;
	placeholder?: string;
}

export function AffiliationSelect({
	value,
	displayValue = "",
	initValueId,
	onChange,
	hasError,
	className,
	placeholder = "Type affiliation...",
}: AffiliationSelectProps) {
	const [inputValue, setInputValue] = useState(displayValue);
	const [open, setOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const isCreatingRef = useRef(false);
	const isSelectingRef = useRef(false);

	const debouncedInput = useDebounce(inputValue, 300);

	// Sync displayValue externally
	useEffect(() => {
		setInputValue(displayValue);
	}, [displayValue]);

	// Fetch affiliation by ID on mount
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const isFetchingRef = useRef(false);

	useEffect(() => {
		if (displayValue || inputValue || !initValueId || isFetchingRef.current)
			return;
		isFetchingRef.current = true;

		getAffiliationById({ data: { id: initValueId } })
			.then((affiliation) => {
				if (affiliation) {
					setInputValue(affiliation.name);
					onChangeRef.current(affiliation.id, affiliation.name);
				}
			})
			.catch(() => {
				// Silently fail
			})
			.finally(() => {
				isFetchingRef.current = false;
			});
	}, [initValueId, displayValue, inputValue]);

	const fetchAffiliations = useCallback(async (query: string) => {
		if (!query.trim()) {
			setAffiliations([]);
			return;
		}
		setIsLoading(true);
		try {
			const data = await getAffiliations({ data: { q: query } });
			setAffiliations(data);
		} catch {
			// Silently fail
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (debouncedInput.trim()) {
			fetchAffiliations(debouncedInput);
		} else {
			setAffiliations([]);
		}
	}, [debouncedInput, fetchAffiliations]);

	const hasExactMatch = affiliations.some(
		(a) => a.name.toLowerCase() === inputValue.trim().toLowerCase(),
	);
	const showCreate = !!inputValue.trim() && !hasExactMatch && !isLoading;
	const totalItems = affiliations.length + (showCreate ? 1 : 0);
	const showDropdown =
		open && (affiliations.length > 0 || showCreate || isLoading);

	const handleSelect = useCallback(
		(affiliation: Affiliation) => {
			isSelectingRef.current = true;
			onChange(affiliation.id, affiliation.name);
			setInputValue(affiliation.name);
			setOpen(false);
			setHighlightedIndex(-1);
			inputRef.current?.blur();
		},
		[onChange],
	);

	const handleCreate = useCallback(
		async (name: string) => {
			if (isCreatingRef.current) return;
			isCreatingRef.current = true;
			isSelectingRef.current = true;
			try {
				const affiliation = await createAffiliation({ data: { name } });
				onChange(affiliation.id, affiliation.name);
				setInputValue(affiliation.name);
				setOpen(false);
				setHighlightedIndex(-1);
			} catch {
				// Silently fail
			} finally {
				isCreatingRef.current = false;
			}
		},
		[onChange],
	);

	const handleBlur = useCallback(() => {
		// Delay to allow click events on dropdown items to fire
		setTimeout(() => {
			if (isSelectingRef.current) {
				isSelectingRef.current = false;
				return;
			}
			const trimmed = inputValue.trim();
			if (trimmed && !value) {
				// Auto-create on blur if no selection was made
				handleCreate(trimmed);
			}
			setOpen(false);
			setHighlightedIndex(-1);
		}, 200);
	}, [inputValue, value, handleCreate]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!open && e.key !== "Escape") {
			if (inputValue.trim()) setOpen(true);
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
				break;
			case "Enter":
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < affiliations.length) {
					handleSelect(affiliations[highlightedIndex]);
				} else if (showCreate && highlightedIndex === affiliations.length) {
					handleCreate(inputValue.trim());
				}
				break;
			case "Escape":
				setOpen(false);
				setHighlightedIndex(-1);
				inputRef.current?.blur();
				break;
		}
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="relative">
				<IconBuilding className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<input
					ref={inputRef}
					type="text"
					role="combobox"
					aria-label="Affiliation"
					aria-expanded={open}
					aria-autocomplete="list"
					aria-controls={open ? "affiliation-listbox" : undefined}
					aria-activedescendant={
						highlightedIndex >= 0
							? `affiliation-option-${highlightedIndex}`
							: undefined
					}
					data-affiliation-id={value || undefined}
					className={cn(
						"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors",
						"file:border-0 file:bg-transparent file:text-sm file:font-medium",
						"placeholder:text-muted-foreground",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
						"disabled:cursor-not-allowed disabled:opacity-50",
						hasError && "border-destructive",
					)}
					placeholder={placeholder}
					value={inputValue}
					onChange={(e) => {
						const val = e.target.value;
						setInputValue(val);
						if (!val.trim()) {
							onChange(null, "");
							setAffiliations([]);
							setOpen(false);
						} else {
							setOpen(true);
						}
						setHighlightedIndex(-1);
					}}
					onFocus={() => {
						if (inputValue.trim()) setOpen(true);
					}}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
				/>
				{isLoading && (
					<IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
				)}
			</div>
			{showDropdown && (
				<div
					id="affiliation-listbox"
					role="listbox"
					className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
				>
					{affiliations.map((affiliation, index) => (
						<div
							key={affiliation.id}
							id={`affiliation-option-${index}`}
							role="option"
							tabIndex={-1}
							aria-selected={highlightedIndex === index}
							className={cn(
								"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
								highlightedIndex === index &&
									"bg-accent text-accent-foreground",
								value === affiliation.id && "font-medium",
							)}
							onMouseEnter={() => setHighlightedIndex(index)}
							onMouseDown={(e) => {
								e.preventDefault(); // Prevent blur
								handleSelect(affiliation);
							}}
						>
							{affiliation.name}
						</div>
					))}
					{showCreate && (
						<div
							id={`affiliation-option-${affiliations.length}`}
							role="option"
							tabIndex={-1}
							aria-selected={highlightedIndex === affiliations.length}
							className={cn(
								"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
								highlightedIndex === affiliations.length &&
									"bg-accent text-accent-foreground",
							)}
							onMouseEnter={() => setHighlightedIndex(affiliations.length)}
							onMouseDown={(e) => {
								e.preventDefault(); // Prevent blur
								handleCreate(inputValue.trim());
							}}
						>
							Create &quot;{inputValue.trim()}&quot;
						</div>
					)}
				</div>
			)}
		</div>
	);
}
