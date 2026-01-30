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
	const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const isCreatingRef = useRef(false);
	const isSelectingRef = useRef(false);

	const debouncedSearch = useDebounce(inputValue, 300);

	// Sync displayValue with inputValue when it changes externally
	useEffect(() => {
		setInputValue(displayValue);
	}, [displayValue]);

	// Fetch affiliation by ID if provided and no displayValue/inputValue yet
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
		if (open && debouncedSearch.trim()) {
			fetchAffiliations(debouncedSearch);
		} else if (!debouncedSearch.trim()) {
			setAffiliations([]);
		}
	}, [open, debouncedSearch, fetchAffiliations]);

	// Reset highlight when results change
	const prevAffiliationsLength = useRef(affiliations.length);
	if (prevAffiliationsLength.current !== affiliations.length) {
		prevAffiliationsLength.current = affiliations.length;
		setHighlightedIndex(-1);
	}

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setInputValue(newValue);
		setOpen(true);
		// Clear selection when user modifies input
		if (value && newValue !== displayValue) {
			onChange(null, newValue);
		}
	};

	const handleSelect = (affiliation: Affiliation) => {
		isSelectingRef.current = true;
		onChange(affiliation.id, affiliation.name);
		setInputValue(affiliation.name);
		setOpen(false);
		// Reset flag after a tick
		setTimeout(() => {
			isSelectingRef.current = false;
		}, 0);
	};

	const handleCreateAffiliation = useCallback(
		async (name: string) => {
			if (isCreatingRef.current) return;
			isCreatingRef.current = true;
			try {
				const affiliation = await createAffiliation({ data: { name } });
				onChange(affiliation.id, affiliation.name);
			} catch {
				// Silently fail
			} finally {
				isCreatingRef.current = false;
			}
		},
		[onChange],
	);

	const handleBlur = useCallback(() => {
		// Skip if we're selecting from dropdown
		if (isSelectingRef.current) return;

		const name = inputValue.trim();
		// If there's text but no selection, create new affiliation
		if (name && !value) {
			// Check if exact match exists in current results
			const exactMatch = affiliations.find(
				(a) => a.name.toLowerCase() === name.toLowerCase(),
			);
			if (exactMatch) {
				onChange(exactMatch.id, exactMatch.name);
			} else {
				handleCreateAffiliation(name);
			}
		}
		setOpen(false);
	}, [inputValue, value, affiliations, onChange, handleCreateAffiliation]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!open) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				setOpen(true);
				e.preventDefault();
			}
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev < affiliations.length - 1 ? prev + 1 : 0,
				);
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev > 0 ? prev - 1 : affiliations.length - 1,
				);
				break;
			case "Enter":
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < affiliations.length) {
					handleSelect(affiliations[highlightedIndex]);
				} else {
					// Accept current input
					handleBlur();
				}
				break;
			case "Escape":
				setOpen(false);
				break;
		}
	};

	const showDropdown = open && affiliations.length > 0;

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="relative">
				<IconBuilding className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onFocus={() => inputValue.trim() && setOpen(true)}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className={cn(
						"flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 pl-9 text-sm text-foreground transition-colors",
						"placeholder:text-muted-foreground",
						"focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
						"disabled:cursor-not-allowed disabled:opacity-50",
						hasError && "border-destructive",
					)}
				/>
				{isLoading && (
					<IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
				)}
			</div>

			{showDropdown && (
				<div
					role="listbox"
					className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md"
				>
					<div className="max-h-48 overflow-auto">
						{affiliations.map((affiliation, index) => (
							<button
								key={affiliation.id}
								type="button"
								role="option"
								aria-selected={value === affiliation.id}
								onMouseDown={() => {
									isSelectingRef.current = true;
								}}
								onClick={() => handleSelect(affiliation)}
								onMouseEnter={() => setHighlightedIndex(index)}
								className={cn(
									"w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm",
									highlightedIndex === index && "bg-accent",
									value === affiliation.id && "font-medium text-primary",
								)}
							>
								{affiliation.name}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
