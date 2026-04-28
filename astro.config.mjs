import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// SITE: replace before deploy. Used for canonical URLs, sitemap, RSS, og:url.
export default defineConfig({
  site: 'https://intent-alpha.pages.dev',
  trailingSlash: 'never',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap()],
});
