import { FileDropzone } from "@/shared/components/file-dropzone";
import type { Sheet } from "@/shared/lib/sheet-mapping";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";

const PREVIEW_ROWS = 5;

interface UploadStepProps {
	picked: { file: File; sheet: Sheet; emailColumn: number } | null;
	onPick: (file: File | null) => void;
	onEmailColumn: (column: number) => void;
}

export function UploadStep({ picked, onPick, onEmailColumn }: UploadStepProps) {
	return (
		<div className="min-w-0 space-y-4 py-1">
			<FileDropzone
				accept=".xlsx,.xls"
				maxSize={5}
				onChange={onPick}
				value={picked?.file ?? null}
			/>

			{picked && (
				<>
					<div className="space-y-2">
						<Label htmlFor="sheet-email-column">Email column</Label>
						<Select
							items={picked.sheet.columns.map((name, index) => ({
								value: String(index),
								label: name,
							}))}
							onValueChange={(value) => onEmailColumn(Number(value))}
							value={String(picked.emailColumn)}
						>
							<SelectTrigger
								data-testid="sheet-email-column"
								id="sheet-email-column"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{picked.sheet.columns.map((name, index) => (
									<SelectItem key={name} value={String(index)}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="min-w-0 overflow-x-auto rounded-md border">
						<Table data-testid="sheet-preview">
							<TableHeader>
								<TableRow>
									{picked.sheet.columns.map((name, index) => (
										<TableHead
											className={cn(
												"whitespace-nowrap",
												index === picked.emailColumn && "bg-primary/10",
											)}
											key={name}
										>
											{name}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{picked.sheet.rows.slice(0, PREVIEW_ROWS).map((row) => (
									<TableRow key={row.join("")}>
										{row.map((value, index) => (
											<TableCell
												className={cn(
													"max-w-40 truncate",
													index === picked.emailColumn && "bg-primary/10",
												)}
												key={picked.sheet.columns[index]}
											>
												{value}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<p className="text-muted-foreground text-xs">
						{picked.sheet.rows.length} rows
						{picked.sheet.rows.length > PREVIEW_ROWS
							? `, showing the first ${PREVIEW_ROWS}`
							: ""}
					</p>
				</>
			)}
		</div>
	);
}
