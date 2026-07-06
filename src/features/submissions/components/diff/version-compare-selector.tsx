import { IconArrowRight } from "@tabler/icons-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface VersionCompareSelectorProps {
	versions: Array<{ id: string; version: number }>;
	currentVersion: number;
	base: number;
	compare: number;
	onBaseChange: (version: number) => void;
	onCompareChange: (version: number) => void;
}

function VersionOptions({
	versions,
	currentVersion,
}: {
	versions: Array<{ id: string; version: number }>;
	currentVersion: number;
}) {
	return (
		<SelectContent>
			{versions.map((v) => (
				<SelectItem key={v.id} value={v.version.toString()}>
					Version {v.version}
					{v.version === currentVersion && " (current)"}
				</SelectItem>
			))}
		</SelectContent>
	);
}

/** Two version pickers — base (older) → compare (newer) — for the diff view. */
export function VersionCompareSelector({
	versions,
	currentVersion,
	base,
	compare,
	onBaseChange,
	onCompareChange,
}: VersionCompareSelectorProps) {
	const versionItems = versions.map((v) => ({
		value: v.version.toString(),
		label: `Version ${v.version}${v.version === currentVersion ? " (current)" : ""}`,
	}));
	return (
		<div className="flex items-end gap-2">
			<div className="flex-1 space-y-1">
				<span className="text-xs text-muted-foreground">Base (older)</span>
				<Select
					items={versionItems}
					value={base.toString()}
					onValueChange={(value) => onBaseChange(Number(value))}
				>
					<SelectTrigger
						className="w-full"
						data-testid="diff-base-select"
						aria-label="Base version (older)"
					>
						<SelectValue />
					</SelectTrigger>
					<VersionOptions versions={versions} currentVersion={currentVersion} />
				</Select>
			</div>
			<IconArrowRight className="mb-2 size-4 shrink-0 text-muted-foreground" />
			<div className="flex-1 space-y-1">
				<span className="text-xs text-muted-foreground">Compare (newer)</span>
				<Select
					items={versionItems}
					value={compare.toString()}
					onValueChange={(value) => onCompareChange(Number(value))}
				>
					<SelectTrigger
						className="w-full"
						data-testid="diff-compare-select"
						aria-label="Compare version (newer)"
					>
						<SelectValue />
					</SelectTrigger>
					<VersionOptions versions={versions} currentVersion={currentVersion} />
				</Select>
			</div>
		</div>
	);
}
