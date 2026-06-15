import {
	IconLoader2,
	IconPhotoUp,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import type { RefObject } from "react";
import type { BrandingSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import {
	ACCEPTED_IMAGE_TYPES,
	type BrandingSettingsHandleChange,
	MAX_BG_SIZE_MB,
} from "./use-branding-settings";

interface BgUploadButtonProps {
	bgInputRef: RefObject<HTMLInputElement | null>;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	bgUploading: boolean;
	bgRemoving: boolean;
	hasImage: boolean;
}

function BgUploadButton({
	bgInputRef,
	onUpload,
	bgUploading,
	bgRemoving,
	hasImage,
}: BgUploadButtonProps) {
	return (
		<>
			<input
				ref={bgInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				onChange={onUpload}
				className="hidden"
				aria-label="Upload auth background"
			/>
			<Button
				variant="outline"
				size="sm"
				onClick={() => bgInputRef.current?.click()}
				disabled={bgUploading || bgRemoving}
				data-testid="auth-background-upload"
			>
				{bgUploading ? (
					<IconLoader2 className="mr-2 size-4 animate-spin" />
				) : (
					<IconUpload className="mr-2 size-4" />
				)}
				{hasImage ? "Replace image" : "Upload image"}
			</Button>
		</>
	);
}

interface BgRemoveButtonProps {
	show: boolean;
	bgUploading: boolean;
	bgRemoving: boolean;
	onRemove: () => void;
}

function BgRemoveButton({
	show,
	bgUploading,
	bgRemoving,
	onRemove,
}: BgRemoveButtonProps) {
	if (!show) return null;
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={onRemove}
			disabled={bgUploading || bgRemoving}
			data-testid="auth-background-remove"
		>
			{bgRemoving ? (
				<IconLoader2 className="mr-2 size-4 animate-spin" />
			) : (
				<IconTrash className="mr-2 size-4" />
			)}
			Remove
		</Button>
	);
}

interface AuthBackgroundSectionProps {
	data: BrandingSettings;
	onChange: BrandingSettingsHandleChange;
	onSave: () => void;
	isSaving: boolean;
	bgUploading: boolean;
	bgRemoving: boolean;
	bgInputRef: RefObject<HTMLInputElement | null>;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onRemove: () => void;
}

export function AuthBackgroundSection({
	data,
	onChange,
	onSave,
	isSaving,
	bgUploading,
	bgRemoving,
	bgInputRef,
	onUpload,
	onRemove,
}: AuthBackgroundSectionProps) {
	const hasImage = Boolean(data.authBackgroundUrl);

	return (
		<SettingsSection
			icon={IconPhotoUp}
			title="Auth Background Image"
			description="Background image for login and registration pages"
			delay={50}
		>
			<div className="space-y-4">
				{hasImage && (
					<div
						className="overflow-hidden rounded-lg border border-border/50"
						data-testid="auth-background-preview"
					>
						<img
							src={data.authBackgroundUrl}
							alt="Auth background preview"
							className="h-40 w-full object-cover"
						/>
					</div>
				)}

				<div className="flex flex-wrap gap-2">
					<BgUploadButton
						bgInputRef={bgInputRef}
						onUpload={onUpload}
						bgUploading={bgUploading}
						bgRemoving={bgRemoving}
						hasImage={hasImage}
					/>
					<BgRemoveButton
						show={hasImage}
						bgUploading={bgUploading}
						bgRemoving={bgRemoving}
						onRemove={onRemove}
					/>
				</div>

				{hasImage && (
					<div className="space-y-2">
						<Label>Overlay darkness: {data.authBgOverlay}%</Label>
						<Slider
							value={[data.authBgOverlay]}
							onValueChange={([v]) => onChange("authBgOverlay", v)}
							min={0}
							max={100}
							step={5}
						/>
						<p className="text-xs text-muted-foreground">
							Controls how dark the overlay is on the auth background image
						</p>
					</div>
				)}

				<p className="text-xs text-muted-foreground">
					Accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
				</p>
			</div>
			{hasImage && <SettingsSaveButton onSave={onSave} isSaving={isSaving} />}
		</SettingsSection>
	);
}
