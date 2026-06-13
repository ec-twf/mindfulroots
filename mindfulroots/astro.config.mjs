import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // TODO: change to your production domain before launch (used for sitemap + canonical URLs)
  site: 'https://mindfulroots.thewisefoolstudio.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
