// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

const site = 'https://stellar.hypertheory-labs.dev';

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [
		starlight({
			title: 'Stellar Devtools',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/jeffrygonzalez/stellar' }],
			customCss: ['./src/styles/theme.css'],
			plugins: [
				starlightLlmsTxt({
					projectName: 'Stellar Devtools',
					description: 'In-browser developer tools for Angular applications, designed with AI coding assistants as first-class users. Includes @hypertheory-labs/stellar-ng-devtools (NgRx Signal Store devtools) and @hypertheory-labs/sanitize (standalone state sanitization library).',
					promote: ['overview/**', 'guides/**'],
					demote: ['explainers/**'],
				}),
			],
			sidebar: [
				{
					label: 'Overview',
					items: [
						{ label: 'What This Is', slug: 'overview' },
						{ label: 'The Libraries', slug: 'overview/libraries' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Getting Started', slug: 'guides/getting-started' },
						{ label: 'Using Stellar', slug: 'guides/using-stellar' },
						{ label: 'Working with AI assistants', slug: 'guides/working-with-ai' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Explainers',
					autogenerate: { directory: 'explainers' },
				},
			],
		}),
	],
});
