// Copies the consent library's stylesheet out of node_modules into public/ so
// the banner can load it at runtime instead of at render time.
//
// Importing the CSS from the module would be tidier, but Astro hoists the CSS
// of a dynamically imported chunk into a blocking <link> in <head> — 32KB on
// the critical path of all 192 pages, for a dialog most visitors never see.
// Fetching it on demand keeps the cost on the one page view that opens the UI.
//
// Runs from prebuild/predev, so bumping vanilla-cookieconsent cannot leave a
// stale copy behind.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const src = join(
  import.meta.dirname,
  '../node_modules/vanilla-cookieconsent/dist/cookieconsent.css',
);
const dest = join(import.meta.dirname, '../public/vendor/cookieconsent.css');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('[consent] cookieconsent.css -> public/vendor/');
