import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SpinnerSvg } from "@/components/spinner-svg";
import { DateFormatProvider } from "@/hooks/use-date-format";
import { useSession } from "@/hooks/use-session";
import { APP_SETTINGS_DEFAULTS } from "@/lib/settings/defaults";
import { authRouteMiddleware } from "@/utils/auth.middleware";
import type { AppBranding } from "@/utils/settings.functions";
import { getAppBrandingFn } from "@/utils/settings.functions";

const defaults: AppBranding = {
	conferenceName: APP_SETTINGS_DEFAULTS.CONFERENCE_NAME,
	logoUrl: APP_SETTINGS_DEFAULTS.BRANDING_LOGO_URL,
	faviconUrl: APP_SETTINGS_DEFAULTS.BRANDING_FAVICON_URL,
	primaryColor: APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR,
	secondaryColor: APP_SETTINGS_DEFAULTS.BRANDING_SECONDARY_COLOR,
	footerText: APP_SETTINGS_DEFAULTS.BRANDING_FOOTER_TEXT,
	authBackgroundUrl: "",
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
			: [],
	}),
	component: AppLayoutRoute,
});

function buildCssVarOverrides(branding: AppBranding): CSSProperties {
	const vars: Record<string, string> = {};

	if (
		branding.primaryColor &&
		branding.primaryColor !== defaults.primaryColor
	) {
		vars["--primary"] = branding.primaryColor;
		vars["--ring"] = branding.primaryColor;
		vars["--sidebar-primary"] = branding.primaryColor;
		vars["--sidebar-ring"] = branding.primaryColor;
		vars["--chart-1"] = branding.primaryColor;
	}

	if (
		branding.secondaryColor &&
		branding.secondaryColor !== defaults.secondaryColor
	) {
		vars["--chart-2"] = branding.secondaryColor;
	}

	return vars as CSSProperties;
}

function AppLayoutRoute() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();
	const branding = Route.useLoaderData();
	const cssVars = buildCssVarOverrides(branding);

	useEffect(() => {
		if (!isPending && !user) {
			navigate({ to: "/login" });
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
					logoUrl={branding.logoUrl}
					footerText={branding.footerText}
				>
					<Outlet />
				</AppLayout>
			</DateFormatProvider>
		</div>
	);
}
