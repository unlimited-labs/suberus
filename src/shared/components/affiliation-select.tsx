import { IconBuilding, IconLoader2 } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
			id={`affiliation-option-${index}`}
			role="option"
			tabIndex={-1}
			aria-selected={isHighlighted}
			className={cn(
				"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
				isHighlighted && "bg-accent text-accent-foreground",
				isSelected && "font-medium",
			)}
			onMouseEnter={onHighlight}
			onMouseDown={(e) => {
				e.preventDefault(); // Prevent blur
				onSelect();
			}}
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
			id="affiliation-listbox"
			role="listbox"
			className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
		>
			{affiliations.map((affiliation, index) => (
				<AffiliationOption
					key={affiliation.id}
					index={index}
					label={affiliation.name}
					isHighlighted={highlightedIndex === index}
					isSelected={selectedId === affiliation.id}
					onHighlight={() => onHighlight(index)}
					onSelect={() => onSelect(affiliation)}
				/>
			))}
			{showCreate && (
				<AffiliationOption
					index={affiliations.length}
					label={createLabel}
					isHighlighted={highlightedIndex === affiliations.length}
					isSelected={false}
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
			<IconBuilding className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<input
				ref={inputRef}
				type="text"
				role="combobox"
				aria-label="Affiliation"
				aria-expanded={open}
				aria-autocomplete="list"
				{...affiliationAriaProps(open, highlightedIndex)}
				data-affiliation-id={affiliationId || undefined}
				className={cn(
					"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors",
					"file:border-0 file:bg-transparent file:text-sm file:font-medium",
					"placeholder:text-muted-foreground",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"disabled:cursor-not-allowed disabled:opacity-50",
					hasError && "border-destructive",
				)}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
			/>
			{isLoading && (
				<IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
	const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const isCreatingRef = useRef(false);
	const isSelectingRef = useRef(false);

	const debouncedInput = useDebounce(inputValue, 300);

	useEffect(() => {
		setInputValue(displayValue);
	}, [displayValue]);

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

	const { showCreate, totalItems, showDropdown } =
		computeAffiliationDropdownState({
			affiliations,
			inputValue,
			isLoading,
			open,
		});

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

	const handleValueChange = useCallback(
		(val: string) => {
			setInputValue(val);
			if (!val.trim()) {
				onChange(null, "");
				setAffiliations([]);
				setOpen(false);
			} else {
				setOpen(true);
			}
			setHighlightedIndex(-1);
		},
		[onChange],
	);

	const handleFocus = useCallback(() => {
		if (inputValue.trim()) setOpen(true);
	}, [inputValue]);

	const applyKeyAction: Record<
		AffiliationKeyAction["type"],
		(
			action: AffiliationKeyAction,
			e: React.KeyboardEvent<HTMLInputElement>,
		) => void
	> = {
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
	};

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
				inputRef={inputRef}
				value={inputValue}
				open={open}
				highlightedIndex={highlightedIndex}
				affiliationId={value}
				hasError={hasError}
				isLoading={isLoading}
				placeholder={placeholder}
				onValueChange={handleValueChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
			/>
			{showDropdown && (
				<AffiliationDropdown
					affiliations={affiliations}
					showCreate={showCreate}
					highlightedIndex={highlightedIndex}
					selectedId={value}
					createLabel={`Create "${inputValue.trim()}"`}
					onHighlight={setHighlightedIndex}
					onSelect={handleSelect}
					onCreate={() => handleCreate(inputValue.trim())}
				/>
			)}
		</div>
	);
}
