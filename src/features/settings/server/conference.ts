import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { getSettings, setSetting } from "@/features/settings/server/settings";
import type { ConferenceSettings } from "@/features/settings/validations";

export async function getConferenceSettings(): Promise<ConferenceSettings> {
	const settings = await getSettings([
		"CONFERENCE_NAME",
		"CONFERENCE_LOCATION",
		"CONFERENCE_WEBSITE",
		"CONTACT_EMAIL",
		"CONFERENCE_DATE_START",
		"CONFERENCE_DATE_END",
		"SUBMISSION_DEADLINE",
		"SUBMISSIONS_LOCKED",
		"REVIEW_DEADLINE",
		"NOTIFICATION_DATE",
		"REGISTRATION_DEADLINE",
		"REGISTRATION_LOCKED",
		"CONFERENCE_SUBTITLE",
		"DATE_FORMAT",
		"TIME_FORMAT",
		"FEE_CURRENCY",
		"CONFERENCE_TIMEZONE",
		"CONFERENCE_DAY_START",
		"CONFERENCE_DAY_END",
		"CONFERENCE_DEFAULT_PRESENTATION_MIN",
		"PLANNER_AUTOPLAN_ENABLED",
		"PLANNER_AUTHOR_BUFFER_MIN",
	]);
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
	};
}

/** A patch, so the form (all fields) and the MCP tool (some) share one path. */
export async function updateConferenceSettings(
	patch: Partial<ConferenceSettings>,
	performedBy: string,
): Promise<ConferenceSettings> {
	const current = await getConferenceSettings();
	const data = { ...current, ...patch };
	const changedFields = Object.keys(data).filter(
		(key) =>
			data[key as keyof ConferenceSettings] !==
			current[key as keyof ConferenceSettings],
	);
	if (changedFields.length === 0) return current;

	await Promise.all([
		setSetting("CONFERENCE_NAME", data.name),
		setSetting("CONFERENCE_LOCATION", data.location),
		setSetting("CONFERENCE_WEBSITE", data.website),
		setSetting("CONTACT_EMAIL", data.contactEmail),
		setSetting("CONFERENCE_DATE_START", data.conferenceStartDate),
		setSetting("CONFERENCE_DATE_END", data.conferenceEndDate),
		setSetting("SUBMISSION_DEADLINE", data.submissionDeadline),
		setSetting("SUBMISSIONS_LOCKED", data.submissionsLocked),
		setSetting("REVIEW_DEADLINE", data.reviewDeadline),
		setSetting("NOTIFICATION_DATE", data.notificationDate),
		setSetting("REGISTRATION_DEADLINE", data.registrationDeadline),
		setSetting("REGISTRATION_LOCKED", data.registrationLocked),
		setSetting("CONFERENCE_SUBTITLE", data.subtitle),
		setSetting("DATE_FORMAT", data.dateFormat),
		setSetting("TIME_FORMAT", data.timeFormat),
		setSetting("FEE_CURRENCY", data.currency),
		setSetting("CONFERENCE_TIMEZONE", data.timezone),
		setSetting("CONFERENCE_DAY_START", data.dayStart),
		setSetting("CONFERENCE_DAY_END", data.dayEnd),
		setSetting(
			"CONFERENCE_DEFAULT_PRESENTATION_MIN",
			data.defaultPresentationMin,
		),
		setSetting("PLANNER_AUTOPLAN_ENABLED", data.autoplanEnabled),
		setSetting("PLANNER_AUTHOR_BUFFER_MIN", data.authorBufferMin),
	]);

	await logActivity({
		type: "SETTINGS_CONFERENCE_UPDATED",
		performedBy,
		detail: activityDetail("SETTINGS_CONFERENCE_UPDATED", { changedFields }),
	});

	return data;
}
