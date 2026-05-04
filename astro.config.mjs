import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { remarkJobLinks } from './src/lib/remark-job-links.mjs';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://intent-alpha.hide3desudesu.workers.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },

  markdown: {
    remarkPlugins: [remarkJobLinks],
  },

  integrations: [mdx({ remarkPlugins: [remarkJobLinks] }), sitemap()],
  adapter: cloudflare()
});