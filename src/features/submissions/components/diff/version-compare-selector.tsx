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
				<span className="text-muted-foreground text-xs">Base (older)</span>
				<Select
					items={versionItems}
					onValueChange={(value) => onBaseChange(Number(value))}
					value={base.toString()}
				>
					<SelectTrigger
						aria-label="Base version (older)"
						className="w-full"
						data-testid="diff-base-select"
					>
						<SelectValue />
					</SelectTrigger>
					<VersionOptions currentVersion={currentVersion} versions={versions} />
				</Select>
			</div>
			<IconArrowRight className="text-muted-foreground mb-2 size-4 shrink-0" />
			<div className="flex-1 space-y-1">
				<span className="text-muted-foreground text-xs">Compare (newer)</span>
				<Select
					items={versionItems}
					onValueChange={(value) => onCompareChange(Number(value))}
					value={compare.toString()}
				>
					<SelectTrigger
						aria-label="Compare version (newer)"
						className="w-full"
						data-testid="diff-compare-select"
					>
						<SelectValue />
					</SelectTrigger>
					<VersionOptions currentVersion={currentVersion} versions={versions} />
				</Select>
			</div>
		</div>
	);
}
