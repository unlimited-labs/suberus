import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { SpinnerSvg } from "@/components/spinner-svg";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useSession } from "@/hooks/use-session";
import { APP_SETTINGS_DEFAULTS } from "@/lib/settings/defaults";
import type { AuthPageBranding } from "@/utils/settings.functions";
import { getAuthPageBrandingFn } from "@/utils/settings.functions";

const defaults: AuthPageBranding = {
	conferenceName: APP_SETTINGS_DEFAULTS.CONFERENCE_NAME,
	logoUrl: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_URL,
	primaryColor: APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR,
	secondaryColor: APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR,
	conferenceStartDate: APP_SETTINGS_DEFAULTS.CONFERENCE_DATE_START,
	conferenceEndDate: APP_SETTINGS_DEFAULTS.CONFERENCE_DATE_END,
	conferenceLocation: APP_SETTINGS_DEFAULTS.CONFERENCE_LOCATION,
};

function formatDateRange(start: string, end: string): string {
	if (!start && !end) return "";
	const fmt = (d: string) => {
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return "";
		return date.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};
	const s = start ? fmt(start) : "";
	const e = end ? fmt(end) : "";
	if (s && e) return `${s} – ${e}`;
	return s || e;
}

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		try {
			const branding = await getAuthPageBrandingFn();
			return {
				...branding,
				conferenceDate: formatDateRange(
					branding.conferenceStartDate,
					branding.conferenceEndDate,
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
		branding.primaryColor &&
		branding.primaryColor !== defaults.primaryColor
	) {
		vars["--primary"] = branding.primaryColor;
		vars["--ring"] = branding.primaryColor;
	}

	if (
		branding.secondaryColor &&
		branding.secondaryColor !== defaults.secondaryColor
	) {
		vars["--chart-2"] = branding.secondaryColor;
	}

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
				className="flex h-screen items-center justify-center text-primary"
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
				conferenceName={branding.conferenceName}
				logoUrl={branding.logoUrl}
			>
				<Outlet />
			</AuthLayout>
		</div>
	);
}
