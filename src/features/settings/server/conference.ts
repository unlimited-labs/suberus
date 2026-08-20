import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { getSettings, setSetting } from "@/features/settings/server/settings";
import type { AppSettingKey, AppSettingsMap } from "@/features/settings/types";
import type { ConferenceSettings } from "@/features/settings/validations";

const CONFERENCE_KEYS = {
	name: "CONFERENCE_NAME",
	location: "CONFERENCE_LOCATION",
	website: "CONFERENCE_WEBSITE",
	contactEmail: "CONTACT_EMAIL",
	conferenceStartDate: "CONFERENCE_DATE_START",
	conferenceEndDate: "CONFERENCE_DATE_END",
	submissionDeadline: "SUBMISSION_DEADLINE",
	submissionsLocked: "SUBMISSIONS_LOCKED",
	reviewDeadline: "REVIEW_DEADLINE",
	notificationDate: "NOTIFICATION_DATE",
	registrationDeadline: "REGISTRATION_DEADLINE",
	registrationLocked: "REGISTRATION_LOCKED",
	subtitle: "CONFERENCE_SUBTITLE",
	dateFormat: "DATE_FORMAT",
	timeFormat: "TIME_FORMAT",
	currency: "FEE_CURRENCY",
	timezone: "CONFERENCE_TIMEZONE",
	dayStart: "CONFERENCE_DAY_START",
	dayEnd: "CONFERENCE_DAY_END",
	defaultPresentationMin: "CONFERENCE_DEFAULT_PRESENTATION_MIN",
	autoplanEnabled: "PLANNER_AUTOPLAN_ENABLED",
	authorBufferMin: "PLANNER_AUTHOR_BUFFER_MIN",
	reminderLeadMin: "PROGRAM_REMINDER_LEAD_MIN",
} as const satisfies Record<keyof ConferenceSettings, AppSettingKey>;

export async function getConferenceSettings(): Promise<ConferenceSettings> {
	const settings = await getSettings(Object.values(CONFERENCE_KEYS));
	return {
		name: settings.CONFERENCE_NAME,
		location: settings.CONFERENCE_LOCATION,
		website: settings.CONFERENCE_WEBSITE,
		contactEmail: settings.CONTACT_EMAIL,
		conferenceStartDate: settings.CONFERENCE_DATE_START,
		conferenceEndDate: settings.CONFERENCE_DATE_END,
		submissionDeadline: settings.SUBMISSION_DEADLINE,
		submissionsLocked: settings.SUBMISSIONS_LOCKED,
		reviewDeadline: settings.REVIEW_DEADLINE,
		notificationDate: settings.NOTIFICATION_DATE,
		registrationDeadline: settings.REGISTRATION_DEADLINE,
		registrationLocked: settings.REGISTRATION_LOCKED,
		subtitle: settings.CONFERENCE_SUBTITLE,
		dateFormat: settings.DATE_FORMAT,
		timeFormat: settings.TIME_FORMAT,
		currency: settings.FEE_CURRENCY,
		timezone: settings.CONFERENCE_TIMEZONE,
		dayStart: settings.CONFERENCE_DAY_START,
		dayEnd: settings.CONFERENCE_DAY_END,
		defaultPresentationMin: settings.CONFERENCE_DEFAULT_PRESENTATION_MIN,
		autoplanEnabled: settings.PLANNER_AUTOPLAN_ENABLED,
		authorBufferMin: settings.PLANNER_AUTHOR_BUFFER_MIN,
		reminderLeadMin: settings.PROGRAM_REMINDER_LEAD_MIN,
	};
}

// setSetting's per-key generic cannot see that CONFERENCE_KEYS[field] and
// data[field] describe the same setting; the map above is what pairs them.
// SAFETY: CONFERENCE_KEYS pairs each field with its own setting key; the generic cannot see that.
const writeSetting = setSetting as (
	key: AppSettingKey,
	value: AppSettingsMap[AppSettingKey],
) => Promise<void>;

/** A patch, so the form (all fields) and the MCP tool (some) share one path. */
export async function updateConferenceSettings(
	patch: Partial<ConferenceSettings>,
	performedBy: string,
): Promise<ConferenceSettings> {
	const current = await getConferenceSettings();
	const data = { ...current, ...patch };
	const changedFields =
		// SAFETY: CONFERENCE_KEYS is declared with exactly the ConferenceSettings fields.
		(Object.keys(CONFERENCE_KEYS) as Array<keyof ConferenceSettings>).filter(
			(field) => data[field] !== current[field],
		);
	if (changedFields.length === 0) return current;

	await Promise.all(
		changedFields.map((field) =>
			writeSetting(CONFERENCE_KEYS[field], data[field]),
		),
	);

	await logActivity({
		type: "SETTINGS_CONFERENCE_UPDATED",
		performedBy,
		detail: activityDetail("SETTINGS_CONFERENCE_UPDATED", { changedFields }),
	});

	return data;
}
