import {
	IconChevronDown,
	IconChevronUp,
	IconCut,
	IconPlus,
	IconRepeat,
	IconSparkles,
	IconTrash,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { adminUsersQueryOptions } from "@/utils/admin-users.functions";
import {
	deleteSlotFn,
	reorderSlotsFn,
} from "@/utils/presentation-slots.functions";
import {
	allSessionsQueryOptions,
	assignChairFn,
	continueSeriesFn,
	deleteSessionFn,
	removeChairFn,
	splitSessionFn,
	updateSessionFn,
} from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { suggestSessionName } from "./suggest-session-name";
import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
	utcToTzLocalInput,
} from "./tz-datetime";

interface SessionEditorSheetProps {
	sessionId: string | null;
	onClose: () => void;
}

export function SessionEditorSheet({
	sessionId,
	onClose,
}: SessionEditorSheetProps) {
	return (
		<Sheet
			open={sessionId !== null}
			onOpenChange={(open) => !open && onClose()}
		>
			<SheetContent
				side="right"
				className="flex flex-col gap-0 p-0 sm:max-w-md"
			>
				{sessionId !== null && (
					<SessionEditorBody sessionId={sessionId} onClose={onClose} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function SessionEditorBody({
	sessionId,
	onClose,
}: {
	sessionId: string;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: users } = useQuery(adminUsersQueryOptions());
	const tz = settings.timezone || undefined;

	const session = sessions.find((s) => s.id === sessionId);

	const [title, setTitle] = useState(session?.title ?? "");
	const [titleDirty, setTitleDirty] = useState(false);
	const [chairSearch, setChairSearch] = useState("");
	const [chairOpen, setChairOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [splitOpen, setSplitOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local state when session changes
	useEffect(() => {
		setTitle(session?.title ?? "");
		setTitleDirty(false);
	}, [session?.id]);

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: allSessionsQueryOptions().queryKey,
		});
	}, [queryClient]);

	if (!session) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-sm text-muted-foreground">Session not found</p>
			</div>
		);
	}

	const sortedPresentations = [...session.presentations].sort(
		(a, b) => a.order - b.order,
	);

	const sessionDurationMin = Math.round(
		(new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) /
			60_000,
	);
	const usedMin = sortedPresentations.reduce((s, p) => s + p.durationMin, 0);
	const remainingMin = sessionDurationMin - usedMin;
	const capacityFull = usedMin >= sessionDurationMin;

	const handleSaveTitle = async () => {
		if (!titleDirty) return;
		try {
			await updateSessionFn({ data: { id: sessionId, title } });
			invalidate();
			setTitleDirty(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to save");
		}
	};

	const handleTrackChange = async (value: string) => {
		try {
			await updateSessionFn({
				data: { id: sessionId, trackId: value === "none" ? null : value },
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to update track");
		}
	};

	const handleRoomChange = async (value: string) => {
		try {
			await updateSessionFn({
				data: { id: sessionId, roomId: value === "none" ? null : value },
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to update room");
		}
	};

	const handleStartChange = async (local: string) => {
		if (!local || !session) return;
		const newStart = tzLocalInputToUtc(local, tz);
		const duration = formatDurationMin(
			new Date(session.startAt),
			new Date(session.endAt),
		);
		const newEnd = addMinutes(newStart, duration);
		try {
			await updateSessionFn({
				data: {
					id: sessionId,
					startAt: newStart.toISOString(),
					endAt: newEnd.toISOString(),
				},
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to update time");
		}
	};

	const handleDurationChange = async (minutes: number) => {
		if (!session) return;
		const newEnd = addMinutes(new Date(session.startAt), minutes);
		try {
			await updateSessionFn({
				data: { id: sessionId, endAt: newEnd.toISOString() },
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to update duration");
		}
	};

	const handleAddChair = async (userId: string) => {
		try {
			await assignChairFn({ data: { sessionId, userId } });
			invalidate();
			setChairOpen(false);
			setChairSearch("");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to add chair");
		}
	};

	const handleRemoveChair = async (userId: string) => {
		try {
			await removeChairFn({ data: { sessionId, userId } });
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to remove chair");
		}
	};

	const handleRemovePresentation = async (id: string) => {
		try {
			await deleteSlotFn({ data: { id } });
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to remove");
		}
	};

	const handleMovePresentation = async (index: number, dir: "up" | "down") => {
		const reordered = [...sortedPresentations];
		const swap = dir === "up" ? index - 1 : index + 1;
		[reordered[index], reordered[swap]] = [reordered[swap], reordered[index]];
		try {
			await reorderSlotsFn({
				data: { sessionId, orderedIds: reordered.map((p) => p.id) },
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to reorder");
		}
	};

	const handleContinueSeries = async () => {
		try {
			await continueSeriesFn({ data: { sessionId } });
			invalidate();
			toast.success("Created next session in series");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to continue series");
		}
	};

	const handleSplit = async (afterSlotOrder: number) => {
		try {
			await splitSessionFn({ data: { sessionId, afterSlotOrder } });
			invalidate();
			setSplitOpen(false);
			toast.success("Session split");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to split");
		}
	};

	const handleSuggestName = () => {
		const suggestion = suggestSessionName(
			session.presentations.map((p) => ({
				id: p.submissionId,
				title: p.submissionTitle,
				type: "ABSTRACT",
				abstract: null,
				trackId: null,
				trackName: null,
				authors: p.authors,
				keywords: [],
			})),
		);
		if (suggestion && suggestion !== "Session") {
			setTitle(suggestion);
			setTitleDirty(true);
		} else {
			toast.info("No suggestion available (need common title words)");
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteSessionFn({ data: { id: sessionId } });
			invalidate();
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to delete session");
		} finally {
			setDeleting(false);
		}
	};

	const chairUserIds = new Set(session.chairs.map((c) => c.userId));
	const filteredUsers = (users ?? []).filter((u) => {
		if (chairUserIds.has(u.id)) return false;
		if (!chairSearch) return true;
		const q = chairSearch.toLowerCase();
		const name = [u.firstName, u.lastName]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return name.includes(q) || u.email.toLowerCase().includes(q);
	});

	const userName = (u: {
		firstName: string | null;
		lastName: string | null;
		email: string;
	}) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

	const chairName = (c: {
		firstName: string | null;
		lastName: string | null;
	}) => [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

	return (
		<>
			<SheetHeader className="gap-3 border-b p-4">
				<SheetTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Session editor
				</SheetTitle>
				<div className="relative">
					<Input
						value={title}
						onChange={(e) => {
							setTitle(e.target.value);
							setTitleDirty(true);
						}}
						onBlur={handleSaveTitle}
						onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
						className="pr-20 text-base font-medium"
						placeholder="Session title"
					/>
					{session.presentations.length >= 2 && (
						<button
							type="button"
							onClick={handleSuggestName}
							className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
							title="Auto-suggest from presentations"
						>
							<IconSparkles size={10} />
							suggest
						</button>
					)}
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<Label
							htmlFor="session-start"
							className="text-xs text-muted-foreground"
						>
							Start
						</Label>
						<Input
							id="session-start"
							type="datetime-local"
							value={utcToTzLocalInput(new Date(session.startAt), tz)}
							onChange={(e) => handleStartChange(e.target.value)}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1">
						<Label
							htmlFor="session-duration"
							className="text-xs text-muted-foreground"
						>
							Duration (min)
						</Label>
						<Input
							id="session-duration"
							type="number"
							min={5}
							step={5}
							defaultValue={formatDurationMin(
								new Date(session.startAt),
								new Date(session.endAt),
							)}
							key={`${session.startAt}-${session.endAt}`}
							onBlur={(e) => {
								const v = Number(e.target.value);
								if (
									v >= 5 &&
									v !==
										formatDurationMin(
											new Date(session.startAt),
											new Date(session.endAt),
										)
								)
									handleDurationChange(v);
							}}
							className="h-8 text-sm"
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Room</Label>
						<Select
							value={session.roomId ?? "none"}
							onValueChange={handleRoomChange}
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue placeholder="No room" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No room</SelectItem>
								{rooms.map((r) => (
									<SelectItem key={r.id} value={r.id}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Track</Label>
						<Select
							value={session.trackId ?? "none"}
							onValueChange={handleTrackChange}
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue placeholder="No track" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">No track</SelectItem>
								{tracks.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										<span className="flex items-center gap-2">
											{t.color && (
												<span
													className="size-2.5 shrink-0 rounded-full"
													style={{ backgroundColor: t.color }}
												/>
											)}
											{t.name}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</SheetHeader>

			<div className="flex-1 divide-y overflow-y-auto">
				{/* Chairs */}
				<div className="space-y-2 p-4">
					<div className="flex items-center justify-between">
						<Label className="text-sm font-medium">
							Chairs{" "}
							<span className="font-normal text-muted-foreground">
								({session.chairs.length}/3)
							</span>
						</Label>
						{session.chairs.length < 3 && (
							<Popover open={chairOpen} onOpenChange={setChairOpen}>
								<PopoverTrigger asChild>
									<Button size="xs" variant="outline" className="gap-1">
										<IconPlus size={11} />
										Add chair
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-64 p-0" align="end">
									<Command>
										<CommandInput
											placeholder="Search by name or email..."
											value={chairSearch}
											onValueChange={setChairSearch}
										/>
										<CommandList>
											<CommandEmpty>No users found</CommandEmpty>
											<CommandGroup>
												{filteredUsers.slice(0, 20).map((u) => (
													<CommandItem
														key={u.id}
														value={userName(u)}
														onSelect={() => handleAddChair(u.id)}
													>
														<IconUser size={13} className="mr-2 shrink-0" />
														<div className="min-w-0">
															<div className="truncate text-sm">
																{userName(u)}
															</div>
															<div className="truncate text-xs text-muted-foreground">
																{u.email}
															</div>
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						)}
					</div>

					{session.chairs.length === 0 ? (
						<p className="text-xs text-muted-foreground">No chairs assigned</p>
					) : (
						<div className="space-y-1">
							{session.chairs.map((c) => (
								<div
									key={c.userId}
									className="flex items-center justify-between rounded-md border px-3 py-1.5"
								>
									<span className="text-sm">{chairName(c)}</span>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleRemoveChair(c.userId)}
									>
										<IconX size={12} />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Presentations */}
				<div className="space-y-2 p-4">
					<div className="flex items-center justify-between">
						<Label className="text-sm font-medium">
							Presentations{" "}
							<span className="font-normal text-muted-foreground">
								({sortedPresentations.length})
							</span>
						</Label>
						<span
							className={`text-xs tabular-nums ${capacityFull ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
						>
							{usedMin}/{sessionDurationMin} min
							{!capacityFull && remainingMin > 0 && (
								<span className="opacity-60"> · {remainingMin} free</span>
							)}
						</span>
					</div>

					{sortedPresentations.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No presentations assigned
						</p>
					) : (
						<div className="space-y-1">
							{sortedPresentations.map((p, i) => (
								<div
									key={p.id}
									className="flex items-center gap-2 rounded-md border px-2 py-1.5"
								>
									<div className="flex flex-col">
										<Button
											variant="ghost"
											size="icon-xs"
											disabled={i === 0}
											onClick={() => handleMovePresentation(i, "up")}
										>
											<IconChevronUp size={11} />
										</Button>
										<Button
											variant="ghost"
											size="icon-xs"
											disabled={i === sortedPresentations.length - 1}
											onClick={() => handleMovePresentation(i, "down")}
										>
											<IconChevronDown size={11} />
										</Button>
									</div>
									<div className="min-w-0 flex-1">
										<p className="line-clamp-2 text-sm leading-snug">
											{p.submissionTitle}
										</p>
										<p className="mt-0.5 truncate text-xs text-muted-foreground">
											{p.authors.length > 0
												? p.authors
														.map((a) => `${a.firstName} ${a.lastName}`)
														.join(", ")
												: "No authors"}{" "}
											· {p.durationMin} min
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleRemovePresentation(p.id)}
									>
										<IconX size={12} />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<SheetFooter className="flex flex-col gap-2 border-t p-4">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleContinueSeries}
						className="flex-1"
					>
						<IconRepeat size={13} />
						Continue series
					</Button>
					<Popover open={splitOpen} onOpenChange={setSplitOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={sortedPresentations.length < 2}
								className="flex-1"
							>
								<IconCut size={13} />
								Split
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-72 p-0" align="end">
							<div className="border-b p-2 text-xs font-medium">
								Split after presentation:
							</div>
							<div className="max-h-64 overflow-y-auto p-1">
								{sortedPresentations.slice(0, -1).map((p) => (
									<button
										key={p.id}
										type="button"
										onClick={() => handleSplit(p.order)}
										className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
									>
										<span className="mr-2 font-mono text-muted-foreground">
											{p.order + 1}.
										</span>
										<span className="line-clamp-1">{p.submissionTitle}</span>
									</button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<Button
					variant="destructive"
					size="sm"
					disabled={deleting}
					onClick={handleDelete}
					className="w-full"
				>
					<IconTrash size={14} />
					Delete session
				</Button>
			</SheetFooter>
		</>
	);
}
