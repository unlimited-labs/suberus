// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
	// Public URL where these docs are hosted (used for sitemap & canonical URLs).
	site: 'https://docs.suberus.app',
	// The Program pages moved into the dedicated "Program Planner" section.
	redirects: {
		'/configuration/program/': '/planner/setup/',
		'/managing/program/': '/planner/overview/',
	},
	markdown: {
		// remark-gfm enables GFM tables inside .mdx pages; since @astrojs/mdx 6 the
		// MDX pipeline inherits plugins from `markdown.processor` (unified) directly.
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
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			// Show "Last updated" (from Git history) and prev/next pagination on every page.
			lastUpdated: true,
			pagination: true,
			sidebar: [
				{
					label: 'Configuration',
					items: [
						{ label: 'Quick start', slug: 'configuration/quick-start' },
						{
							label: 'First-time install',
							slug: 'configuration/first-time-install',
						},
						{
							label: 'Roles & permissions',
							slug: 'configuration/roles-and-permissions',
						},
						{ label: 'Conference', slug: 'configuration/conference' },
						{ label: 'Submissions', slug: 'configuration/submissions' },
						{ label: 'Submission Types', slug: 'configuration/submission-types' },
						{ label: 'Tracks', slug: 'configuration/tracks' },
						{ label: 'Email Templates', slug: 'configuration/email-templates' },
						{ label: 'Branding', slug: 'configuration/branding' },
						{ label: 'Fee', slug: 'configuration/fee' },
						{ label: 'Reminders', slug: 'configuration/reminders' },
						{ label: 'Survey', slug: 'configuration/survey' },
						{
							label: 'Terms of Service',
							slug: 'configuration/terms-of-service',
						},
						{ label: 'Invitations', slug: 'configuration/invitations' },
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
