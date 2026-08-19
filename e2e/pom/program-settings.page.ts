import { type Locator, type Page, type TestInfo, expect } from "@playwright/test";

/** Program tab inside /admin/settings — contains Rooms + Program Tracks + Planner config */
export class ProgramSettingsPage {
	readonly page: Page;
	readonly roomsList: Locator;
	readonly programTracksList: Locator;
	readonly createRoomButton: Locator;
	readonly createProgramTrackButton: Locator;
	readonly importProgramTracksButton: Locator;
	readonly roomDialog: Locator;
	readonly roomName: Locator;
	readonly roomDescription: Locator;
	readonly roomLink: Locator;
	readonly roomSubmit: Locator;
	readonly programTrackDialog: Locator;
	readonly programTrackName: Locator;
	readonly programTrackSubmit: Locator;
	readonly reminderLeadInput: Locator;
	readonly plannerSettingsSave: Locator;

	constructor(page: Page) {
		this.page = page;
		this.roomsList = page.getByTestId("rooms-list");
		this.programTracksList = page.getByTestId("program-tracks-list");
		this.createRoomButton = page.getByTestId("create-room");
		this.createProgramTrackButton = page.getByTestId("create-program-track");
		this.importProgramTracksButton = page.getByTestId(
			"import-program-tracks-from-intake",
		);
		this.roomDialog = page.getByTestId("room-dialog");
		this.roomName = page.getByTestId("room-name");
		this.roomDescription = page.getByTestId("room-description");
		this.roomLink = page.getByTestId("room-link");
		this.roomSubmit = page.getByTestId("room-submit");
		this.programTrackDialog = page.getByTestId("program-track-dialog");
		this.programTrackName = page.getByTestId("program-track-name");
		this.programTrackSubmit = page.getByTestId("program-track-submit");
		this.reminderLeadInput = page.getByTestId("reminder-lead-input");
		this.plannerSettingsSave = page.getByTestId("planner-settings-save");
	}

	/** Navigate to the Program tab via URL (stable on mobile + desktop) */
	async goto(_testInfo?: TestInfo) {
		await this.page.goto("/admin/settings?tab=program");
		await expect(this.createRoomButton).toBeVisible({ timeout: 10000 });
	}

	roomRow(roomId: string): Locator {
		return this.page.getByTestId(`room-row-${roomId}`);
	}

	programTrackRow(trackId: string): Locator {
		return this.page.getByTestId(`program-track-row-${trackId}`);
	}

	async createRoom(opts: { name: string; description?: string; link?: string }) {
		await this.createRoomButton.click();
		await expect(this.roomDialog).toBeVisible();
		await this.roomName.fill(opts.name);
		if (opts.description) await this.roomDescription.fill(opts.description);
		if (opts.link) await this.roomLink.fill(opts.link);
		await this.roomSubmit.click();
		await expect(this.roomDialog).toBeHidden({ timeout: 15000 });
	}

	async createProgramTrack(opts: { name: string }) {
		await this.createProgramTrackButton.click();
		await expect(this.programTrackDialog).toBeVisible();
		await this.programTrackName.fill(opts.name);
		await this.programTrackSubmit.click();
		await expect(this.programTrackDialog).toBeHidden({ timeout: 15000 });
	}
}
