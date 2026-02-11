import { IconBuilding, IconLoader2, IconSelector } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [selectedName, setSelectedName] = useState(displayValue);
	const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const isCreatingRef = useRef(false);

	const debouncedSearch = useDebounce(search, 300);

	// Sync displayValue externally
	useEffect(() => {
		setSelectedName(displayValue);
	}, [displayValue]);

	// Fetch affiliation by ID on mount
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const isFetchingRef = useRef(false);

	useEffect(() => {
		if (displayValue || selectedName || !initValueId || isFetchingRef.current)
			return;
		isFetchingRef.current = true;

		getAffiliationById({ data: { id: initValueId } })
			.then((affiliation) => {
				if (affiliation) {
					setSelectedName(affiliation.name);
					onChangeRef.current(affiliation.id, affiliation.name);
				}
			})
			.catch(() => {
				// Silently fail
			})
			.finally(() => {
				isFetchingRef.current = false;
			});
	}, [initValueId, displayValue, selectedName]);

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

	const handleSelect = (affiliation: Affiliation) => {
		onChange(affiliation.id, affiliation.name);
		setSelectedName(affiliation.name);
		setOpen(false);
	};

	const handleCreate = useCallback(
		async (name: string) => {
			if (isCreatingRef.current) return;
			isCreatingRef.current = true;
			try {
				const affiliation = await createAffiliation({ data: { name } });
				onChange(affiliation.id, affiliation.name);
				setSelectedName(affiliation.name);
				setOpen(false);
			} catch {
				// Silently fail
			} finally {
				isCreatingRef.current = false;
			}
		},
		[onChange],
	);

	const hasExactMatch = affiliations.some(
		(a) => a.name.toLowerCase() === search.trim().toLowerCase(),
	);
	const showCreate = search.trim() && !hasExactMatch && !isLoading;

	return (
		<Popover
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (!isOpen) {
					setSearch("");
					setAffiliations([]);
				}
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label="Select affiliation"
					data-affiliation-id={value || undefined}
					className={cn(
						"h-9 w-full justify-between pl-3 font-normal",
						!selectedName && "text-muted-foreground",
						hasError && "border-destructive",
						className,
					)}
				>
					<span className="flex items-center gap-2 truncate">
						<IconBuilding className="size-4 shrink-0 text-muted-foreground" />
						{selectedName || placeholder}
					</span>
					<IconSelector className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search affiliation..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						{isLoading && (
							<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
								<IconLoader2 className="size-4 animate-spin" />
								Loading...
							</div>
						)}
						{!isLoading &&
							!affiliations.length &&
							!showCreate &&
							search.trim() && (
								<CommandEmpty>No affiliations found.</CommandEmpty>
							)}
						{affiliations.length > 0 && (
							<CommandGroup>
								{affiliations.map((affiliation) => (
									<CommandItem
										key={affiliation.id}
										value={affiliation.id}
										data-checked={value === affiliation.id || undefined}
										onSelect={() => handleSelect(affiliation)}
									>
										{affiliation.name}
									</CommandItem>
								))}
							</CommandGroup>
						)}
						{showCreate && (
							<CommandGroup>
								<CommandItem
									value={`create-${search.trim()}`}
									onSelect={() => handleCreate(search.trim())}
								>
									Create &quot;{search.trim()}&quot;
								</CommandItem>
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
