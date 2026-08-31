import { IconBuilding, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import {
	type AffiliationKeyAction,
	affiliationAriaProps,
	computeAffiliationDropdownState,
	resolveAffiliationKeyAction,
} from "@/shared/components/affiliation-select-helpers";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { cn } from "@/shared/lib/utils";
import {
	createAffiliation,
	getAffiliationById,
	getAffiliations,
} from "@/shared/server/affiliations-fn";

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

function AffiliationOption({
	index,
	label,
	isHighlighted,
	isSelected,
	onHighlight,
	onSelect,
}: {
	index: number;
	label: string;
	isHighlighted: boolean;
	isSelected: boolean;
	onHighlight: () => void;
	onSelect: () => void;
}) {
	return (
		<div
			aria-selected={isHighlighted}
			className={cn(
				"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
				isHighlighted && "bg-accent text-accent-foreground",
				isSelected && "font-medium",
			)}
			id={`affiliation-option-${index}`}
			onMouseDown={(e) => {
				e.preventDefault();
				onSelect();
			}}
			onMouseEnter={onHighlight}
			role="option"
			tabIndex={-1}
		>
			{label}
		</div>
	);
}

function AffiliationDropdown({
	affiliations,
	showCreate,
	highlightedIndex,
	selectedId,
	createLabel,
	onHighlight,
	onSelect,
	onCreate,
}: {
	affiliations: Affiliation[];
	showCreate: boolean;
	highlightedIndex: number;
	selectedId: string | null;
	createLabel: string;
	onHighlight: (index: number) => void;
	onSelect: (affiliation: Affiliation) => void;
	onCreate: () => void;
}) {
	return (
		<div
			className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md"
			id="affiliation-listbox"
			role="listbox"
		>
			{affiliations.map((affiliation, index) => (
				<AffiliationOption
					index={index}
					isHighlighted={highlightedIndex === index}
					isSelected={selectedId === affiliation.id}
					key={affiliation.id}
					label={affiliation.name}
					onHighlight={() => onHighlight(index)}
					onSelect={() => onSelect(affiliation)}
				/>
			))}
			{showCreate && (
				<AffiliationOption
					index={affiliations.length}
					isHighlighted={highlightedIndex === affiliations.length}
					isSelected={false}
					label={createLabel}
					onHighlight={() => onHighlight(affiliations.length)}
					onSelect={onCreate}
				/>
			)}
		</div>
	);
}

function AffiliationInput({
	inputRef,
	value,
	open,
	highlightedIndex,
	affiliationId,
	hasError,
	isLoading,
	placeholder,
	onValueChange,
	onFocus,
	onBlur,
	onKeyDown,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>;
	value: string;
	open: boolean;
	highlightedIndex: number;
	affiliationId: string | null;
	hasError?: boolean;
	isLoading: boolean;
	placeholder: string;
	onValueChange: (value: string) => void;
	onFocus: () => void;
	onBlur: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
	return (
		<div className="relative">
			<IconBuilding className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<input
				aria-autocomplete="list"
				aria-controls="affiliation-listbox"
				aria-expanded={open}
				aria-label="Affiliation"
				ref={inputRef}
				role="combobox"
				type="text"
				{...affiliationAriaProps(highlightedIndex)}
				className={cn(
					"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors",
					"file:border-0 file:bg-transparent file:text-sm file:font-medium",
					"placeholder:text-muted-foreground",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"disabled:cursor-not-allowed disabled:opacity-50",
					hasError && "border-destructive",
				)}
				data-affiliation-id={affiliationId || undefined}
				onBlur={onBlur}
				onChange={(e) => onValueChange(e.target.value)}
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				value={value}
			/>
			{isLoading && (
				<IconLoader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
			)}
		</div>
	);
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
	const [searchResults, setSearchResults] = useState<{
		query: string;
		items: Affiliation[];
	}>({ query: "", items: [] });

	const inputRef = useRef<HTMLInputElement>(null);
	const isCreatingRef = useRef(false);
	const isSelectingRef = useRef(false);

	const debouncedInput = useDebounce(inputValue, 300);

	const [prevDisplayValue, setPrevDisplayValue] = useState(displayValue);
	if (prevDisplayValue !== displayValue) {
		setPrevDisplayValue(displayValue);
		setInputValue(displayValue);
	}

	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	});
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

	useEffect(() => {
		if (!debouncedInput.trim() || searchResults.query === debouncedInput) {
			return;
		}
		let stale = false;
		getAffiliations({ data: { q: debouncedInput } })
			.then((items) => {
				if (!stale) setSearchResults({ query: debouncedInput, items });
			})
			.catch(() => {
				if (!stale) {
					setSearchResults((prev) => ({
						query: debouncedInput,
						items: prev.items,
					}));
				}
			});
		return () => {
			stale = true;
		};
	}, [debouncedInput, searchResults.query]);

	const affiliations = debouncedInput.trim() ? searchResults.items : [];
	const isLoading =
		!!debouncedInput.trim() && searchResults.query !== debouncedInput;

	const { showCreate, totalItems, showDropdown } =
		computeAffiliationDropdownState({
			affiliations,
			inputValue,
			isLoading,
			open,
		});

	const handleSelect = (affiliation: Affiliation) => {
		isSelectingRef.current = true;
		onChange(affiliation.id, affiliation.name);
		setInputValue(affiliation.name);
		setOpen(false);
		setHighlightedIndex(-1);
		inputRef.current?.blur();
	};

	const handleCreate = async (name: string) => {
		if (isCreatingRef.current) return;
		isCreatingRef.current = true;
		isSelectingRef.current = true;
		try {
			const affiliation = await createAffiliation({ data: { name } });
			onChange(affiliation.id, affiliation.name);
			setInputValue(affiliation.name);
			setOpen(false);
			setHighlightedIndex(-1);
		} catch {}
		isCreatingRef.current = false;
	};

	const handleBlur = () => {
		// Delay to allow click events on dropdown items to fire
		setTimeout(() => {
			if (isSelectingRef.current) {
				isSelectingRef.current = false;
				return;
			}
			const trimmed = inputValue.trim();
			if (trimmed && !value) {
				handleCreate(trimmed);
			}
			setOpen(false);
			setHighlightedIndex(-1);
		}, 200);
	};

	const handleValueChange = (val: string) => {
		setInputValue(val);
		if (!val.trim()) {
			onChange(null, "");
			setSearchResults({ query: debouncedInput, items: [] });
			setOpen(false);
		} else {
			setOpen(true);
		}
		setHighlightedIndex(-1);
	};

	const handleFocus = () => {
		if (inputValue.trim()) setOpen(true);
	};

	const applyKeyAction = {
		none: () => {},
		open: () => setOpen(true),
		navigate: (action, e) => {
			e.preventDefault();
			if (action.type === "navigate") setHighlightedIndex(action.index);
		},
		select: (action, e) => {
			e.preventDefault();
			if (action.type === "select") handleSelect(affiliations[action.index]);
		},
		create: (_action, e) => {
			e.preventDefault();
			handleCreate(inputValue.trim());
		},
		close: () => {
			setOpen(false);
			setHighlightedIndex(-1);
			inputRef.current?.blur();
		},
	} satisfies Record<
		AffiliationKeyAction["type"],
		(
			action: AffiliationKeyAction,
			e: React.KeyboardEvent<HTMLInputElement>,
		) => void
	>;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const action = resolveAffiliationKeyAction(e.key, {
			open,
			hasQuery: !!inputValue.trim(),
			highlightedIndex,
			totalItems,
			affiliationsLength: affiliations.length,
			showCreate,
		});
		applyKeyAction[action.type](action, e);
	};

	return (
		<div className={cn("relative", className)}>
			<AffiliationInput
				affiliationId={value}
				hasError={hasError}
				highlightedIndex={highlightedIndex}
				inputRef={inputRef}
				isLoading={isLoading}
				onBlur={handleBlur}
				onFocus={handleFocus}
				onKeyDown={handleKeyDown}
				onValueChange={handleValueChange}
				open={open}
				placeholder={placeholder}
				value={inputValue}
			/>
			{showDropdown && (
				<AffiliationDropdown
					affiliations={affiliations}
					createLabel={`Create "${inputValue.trim()}"`}
					highlightedIndex={highlightedIndex}
					onCreate={() => handleCreate(inputValue.trim())}
					onHighlight={setHighlightedIndex}
					onSelect={handleSelect}
					selectedId={value}
					showCreate={showCreate}
				/>
			)}
		</div>
	);
}
