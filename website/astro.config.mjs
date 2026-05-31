import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import nestgramCodeTheme from './src/styles/nestgram-code-theme.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://nestgram.com',
  integrations: [
    starlight({
      title: 'Nestgram',
      description: 'Telegram bots, the NestJS way.',
      favicon: '/favicon.svg',
      logo: {
        src: './src/assets/nestgram.svg',
        alt: 'Nestgram',
      },
      customCss: ['./src/styles/nestgram.css'],
      components: {
        // breadcrumb trail above the page title (design parity)
        PageTitle: './src/components/PageTitle.astro',
      },
      expressiveCode: {
        themes: [nestgramCodeTheme],
        styleOverrides: {
          borderRadius: '13px',
          borderColor: 'var(--border-strong)',
          codeBackground: '#080a0f',
          codeFontFamily: 'var(--font-mono)',
          codeFontSize: '13.5px',
          codeLineHeight: '1.8',
          frames: {
            editorBackground: '#080a0f',
            editorTabBarBackground: 'rgba(255,255,255,.015)',
            editorTabBarBorderBottomColor: 'var(--border)',
            editorActiveTabBackground: 'rgba(255,255,255,.04)',
            editorActiveTabIndicatorTopColor: 'transparent',
            editorActiveTabIndicatorBottomColor: 'var(--accent)',
            editorActiveTabForeground: 'var(--text)',
            editorTabBarBorderColor: 'var(--border)',
            terminalBackground: '#080a0f',
            terminalTitlebarBackground: 'rgba(255,255,255,.015)',
            terminalTitlebarBorderBottomColor: 'var(--border)',
            frameBoxShadowCssValue: '0 24px 60px -30px rgba(0,0,0,.8)',
          },
          textMarkers: {
            markBackground: 'rgba(54,180,244,.10)',
            markBorderColor: 'var(--accent)',
          },
        },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Degreet/nestgram-v2',
        },
      ],
      sidebar: [
        {
          label: 'Getting started',
          items: [{ label: 'Quickstart', slug: '01-quickstart' }],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Commands & keyboards',
              slug: '02-commands-and-keyboards',
            },
            { label: 'Callbacks', slug: '03-callbacks' },
            { label: 'Guards & pipeline', slug: '04-guards-and-pipeline' },
          ],
        },
      ],
    }),
  ],
});
