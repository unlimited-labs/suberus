import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { authRouteMiddleware } from "@/features/auth/server/middleware";
import { myDocumentsCountQueryOptions } from "@/features/documents/api/documents";
import { exhibitorSignupAvailableQueryOptions } from "@/features/exhibitors/api/exhibitors";
import { scheduleStateQueryOptions } from "@/features/planner/api/schedule";
import type { AppBranding } from "@/features/settings/api/settings";
import {
	feeEnabledQueryOptions,
	financesEnabledQueryOptions,
	getAppBrandingFn,
} from "@/features/settings/api/settings";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { AppLayout } from "@/shared/components/layout/app-layout";
import { SpinnerSvg } from "@/shared/components/spinner-svg";
import { VersionSkewBanner } from "@/shared/components/version-skew-banner";
import { DateFormatProvider } from "@/shared/hooks/use-date-format";
import { useSession } from "@/shared/hooks/use-session";

const defaults: AppBranding = {
	conferenceName: APP_SETTINGS_DEFAULTS.CONFERENCE_NAME,
	logoUrl: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_URL,
	faviconUrl: APP_SETTINGS_DEFAULTS.BRANDING_FAVICON_URL,
	logoUploadUrl: "",
	faviconUploadUrl: "",
	primaryColor: APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR,
	secondaryColor: APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR,
	footerText: APP_SETTINGS_DEFAULTS.BRANDING_FOOTER_TEXT,
	authBackgroundUrl: "",
	authBgOverlay: APP_SETTINGS_DEFAULTS.BRANDING_AUTH_BG_OVERLAY,
	logoDarkInvert: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_DARK_INVERT,
	dateFormat: APP_SETTINGS_DEFAULTS.DATE_FORMAT,
	timeFormat: APP_SETTINGS_DEFAULTS.TIME_FORMAT,
};

export const Route = createFileRoute("/_app")({
	server: {
		middleware: [authRouteMiddleware],
	},
	loader: async () => {
		try {
			return await getAppBrandingFn();
		} catch {
			return defaults;
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.conferenceName
					? `${loaderData.conferenceName} | Suberus`
					: "Suberus",
			},
		],
		links: loaderData?.faviconUrl
			? [{ rel: "icon", href: loaderData.faviconUrl }]
			: [{ rel: "icon", href: "favicon.png" }],
	}),
	component: AppLayoutRoute,
});

function buildCssVarOverrides(branding: AppBranding): CSSProperties {
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

function AppLayoutRoute() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();
	const branding = Route.useLoaderData();
	const cssVars = buildCssVarOverrides(branding);
	// Sidebar navigation gates (lifted here so the shared layout stays decoupled
	// from the planner/exhibitors slices).
	const { data: scheduleState } = useQuery(scheduleStateQueryOptions());
	const { data: exhibitorsEnabled } = useQuery(
		exhibitorSignupAvailableQueryOptions(),
	);
	const { data: feeEnabled } = useQuery(feeEnabledQueryOptions());
	const { data: financesEnabled } = useQuery(financesEnabledQueryOptions());
	const { data: documentsCount } = useQuery(myDocumentsCountQueryOptions());

	useEffect(() => {
		if (!isPending && !user) {
			navigate({ to: "/login" });
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

	if (!user) {
		return null;
	}

	return (
		<div style={cssVars}>
			<DateFormatProvider
				dateFormat={branding.dateFormat}
				timeFormat={branding.timeFormat}
			>
				<AppLayout
					conferenceName={branding.conferenceName}
					exhibitorsEnabled={exhibitorsEnabled === true}
					feeEnabled={feeEnabled !== false}
					financesEnabled={financesEnabled === true}
					footerText={branding.footerText}
					hasDocuments={(documentsCount ?? 0) > 0}
					logoDarkInvert={branding.logoDarkInvert}
					logoUrl={branding.logoUrl}
					scheduleStatus={scheduleState?.status}
				>
					<Outlet />
				</AppLayout>
			</DateFormatProvider>
			<VersionSkewBanner />
		</div>
	);
}
