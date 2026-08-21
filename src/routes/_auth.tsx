import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { isValid } from "date-fns";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { checkInstallStatusFn } from "@/features/install/api/install";
import type { AuthPageBranding } from "@/features/settings/api/settings";
import { getAuthPageBrandingFn } from "@/features/settings/api/settings";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { SpinnerSvg } from "@/shared/components/spinner-svg";
import { useSession } from "@/shared/hooks/use-session";
import { formatDate } from "@/shared/lib/format-date";

const defaults: AuthPageBranding = {
	conferenceName: APP_SETTINGS_DEFAULTS.CONFERENCE_NAME,
	logoUrl: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_URL,
	primaryColor: APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR,
	secondaryColor: APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR,
	conferenceStartDate: APP_SETTINGS_DEFAULTS.CONFERENCE_DATE_START,
	conferenceEndDate: APP_SETTINGS_DEFAULTS.CONFERENCE_DATE_END,
	conferenceLocation: APP_SETTINGS_DEFAULTS.CONFERENCE_LOCATION,
	conferenceSubtitle: APP_SETTINGS_DEFAULTS.CONFERENCE_SUBTITLE,
	authBackgroundUrl: APP_SETTINGS_DEFAULTS.BRANDING_AUTH_BACKGROUND_KEY,
	authBgOverlay: APP_SETTINGS_DEFAULTS.BRANDING_AUTH_BG_OVERLAY,
	logoDarkInvert: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_DARK_INVERT,
	dateFormat: APP_SETTINGS_DEFAULTS.DATE_FORMAT,
};

function formatDateRange(
	start: string,
	end: string,
	dateFormatStr: string,
): string {
	if (!start && !end) return "";
	const fmt = (d: string) => {
		const date = new Date(d);
		if (!isValid(date)) return "";
		return formatDate(date, dateFormatStr);
	};
	const s = start ? fmt(start) : "";
	const e = end ? fmt(end) : "";
	if (s && e) return `${s} – ${e}`;
	return s || e;
}

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const { installed } = await checkInstallStatusFn();
		if (!installed) {
			throw redirect({ to: "/install" });
		}

		try {
			const branding = await getAuthPageBrandingFn();
			return {
				...branding,
				conferenceDate: formatDateRange(
					branding.conferenceStartDate,
					branding.conferenceEndDate,
					branding.dateFormat,
				),
			};
		} catch {
			return { ...defaults, conferenceDate: "" };
		}
	},
	component: AuthLayoutRoute,
});

function buildCssVarOverrides(branding: AuthPageBranding): CSSProperties {
	const vars: Record<string, string> = {};

	if (
		branding.secondaryColor &&
		branding.secondaryColor !== defaults.secondaryColor
	) {
		vars["--chart-2"] = branding.secondaryColor;
	}

	// SAFETY: the record holds only CSS custom properties.
	return vars as CSSProperties;
}

function AuthLayoutRoute() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();
	const branding = Route.useRouteContext();
	const cssVars = buildCssVarOverrides(branding);

	useEffect(() => {
		if (!isPending && user) {
			navigate({ to: "/" });
		}
	}, [isPending, user, navigate]);

	if (isPending) {
		return (
			<div
				className="text-primary flex h-screen items-center justify-center"
				style={cssVars}
			>
				<SpinnerSvg size={48} />
			</div>
		);
	}

	if (user) {
		return null;
	}

	return (
		<div style={cssVars}>
			<AuthLayout
				backgroundImageUrl={branding.authBackgroundUrl || undefined}
				logoDarkInvert={branding.logoDarkInvert}
				logoUrl={branding.logoUrl}
				overlayOpacity={branding.authBgOverlay}
			>
				<Outlet />
			</AuthLayout>
		</div>
	);
}
