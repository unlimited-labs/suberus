import { setEmailFooterProvider } from "@/shared/server/email";
import { getSetting } from "./settings";

/** Registers the settings-backed email footer resolver so shared/server/email
 * stays free of a settings import. Called from the app-shell composition. */
export function registerSettingsEmailFooter(): void {
	setEmailFooterProvider(async () => {
		const footer = await getSetting("EMAIL_FOOTER_TEXT");
		if (!footer) return null;
		const conferenceName = await getSetting("CONFERENCE_NAME");
		return footer.replace(/\{\{conferenceName\}\}/g, conferenceName);
	});
}
