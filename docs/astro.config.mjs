// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightImageZoom from 'starlight-image-zoom';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
	// Public URL where these docs are hosted (used for sitemap & canonical URLs).
	site: 'https://docs.suberus.app',
	// The Program pages moved into the dedicated "Program Planner" section.
	redirects: {
		'/configuration/program/': '/planner/setup/',
		'/managing/program/': '/planner/overview/',
		// Configuration section renamed to Settings (slug parity with /admin/settings).
		'/configuration/quick-start/': '/settings/quick-start/',
		'/configuration/first-time-install/': '/settings/first-time-install/',
		'/configuration/roles-and-permissions/': '/settings/roles-and-permissions/',
		'/configuration/conference/': '/settings/conference/',
		'/configuration/submissions/': '/settings/submissions/',
		'/configuration/submission-types/': '/settings/submission-types/',
		'/configuration/tracks/': '/settings/tracks/',
		'/configuration/email-templates/': '/settings/email-templates/',
		'/configuration/branding/': '/settings/branding/',
		'/configuration/fee/': '/settings/fee/',
		'/configuration/reminders/': '/settings/reminders/',
		'/configuration/survey/': '/settings/survey/',
		'/configuration/terms-of-service/': '/settings/terms-of-service/',
		'/configuration/invitations/': '/settings/invitations/',
	},
	markdown: {
		// Starlight injects remark plugins via Astro's (now-deprecated)
		// `markdown.remarkPlugins`. Setting our own `unified` processor forces the
		// unified pipeline so those plugins actually run (the native `satteri`
		// default would silently drop them). The deprecation notice itself comes
		// from Starlight 0.40 and only disappears with Starlight 0.41 + Astro 7.
		processor: unified({ remarkPlugins: [remarkGfm] }),
	},
	integrations: [
		starlight({
			title: 'Suberus Admin Manual',
			description:
				'Configure and run your conference with Suberus — a guide for administrators.',
			logo: {
				light: './src/assets/suberus-logo-light.svg',
				dark: './src/assets/suberus-logo-dark.svg',
				alt: 'Suberus',
				replacesTitle: true,
			},
			customCss: ['./src/styles/custom.css'],
			// Click any screenshot to open it full-screen (zoom/lightbox).
			plugins: [starlightImageZoom()],
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			// Show "Last updated" (from Git history) and prev/next pagination on every page.
			lastUpdated: true,
			pagination: true,
			sidebar: [
				{
					label: 'Settings',
					items: [
						{ label: 'Quick start', slug: 'settings/quick-start' },
						{
							label: 'First-time install',
							slug: 'settings/first-time-install',
						},
						{
							label: 'Roles & permissions',
							slug: 'settings/roles-and-permissions',
						},
						{ label: 'Conference', slug: 'settings/conference' },
						{ label: 'Submissions', slug: 'settings/submissions' },
						{ label: 'Submission Types', slug: 'settings/submission-types' },
						{ label: 'Tracks', slug: 'settings/tracks' },
						{ label: 'Email Templates', slug: 'settings/email-templates' },
						{ label: 'Branding', slug: 'settings/branding' },
						{ label: 'Fee', slug: 'settings/fee' },
						{ label: 'Reminders', slug: 'settings/reminders' },
						{ label: 'Survey', slug: 'settings/survey' },
						{
							label: 'Terms of Service',
							slug: 'settings/terms-of-service',
						},
						{ label: 'Invitations', slug: 'settings/invitations' },
					],
				},
				{
					label: 'Managing the conference',
					items: [
						{ label: 'Quick start', slug: 'managing/quick-start' },
						{ label: 'Dashboard', slug: 'managing/dashboard' },
						{ label: 'Submissions', slug: 'managing/submissions' },
						{ label: 'Reviews', slug: 'managing/reviews' },
						{ label: 'Users', slug: 'managing/users' },
						{ label: 'Email campaigns', slug: 'managing/bulk-email' },
						{ label: 'Exhibitors', slug: 'managing/exhibitors' },
						{ label: 'Invitations', slug: 'managing/invitations' },
						{ label: 'Extraction', slug: 'managing/extraction' },
						{ label: 'Activity log', slug: 'managing/activity-log' },
					],
				},
				{
					label: 'Program Planner',
					items: [
						{ label: 'Overview', slug: 'planner/overview' },
						{ label: 'Setup', slug: 'planner/setup' },
						{
							label: 'Manual scheduling',
							slug: 'planner/manual-scheduling',
						},
						{ label: 'Autoplanner', slug: 'planner/autoplanner' },
						{ label: 'Publishing', slug: 'planner/publishing' },
					],
				},
			],
		}),
	],
});
