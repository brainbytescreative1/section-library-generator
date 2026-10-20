# Layout Atlas — Section Library Generator

Turn a public website into a visual library of reusable section layouts, with generic examples and links to the pages using each layout.

**GitHub Pages:** https://brainbytescreative1.github.io/section-library-generator/

## Features

- Navigation discovery and bounded scans of up to 24 selected pages.
- 24 editable section templates with neutral copy and placeholder artwork.
- Source-page links and evidence for each suggested layout.
- Review, rename, merge, add, include, and exclude layouts.
- Standalone HTML, scoped Elementor HTML-widget markup, and project JSON exports.
- Browser-local saved projects, rendered HTML import, and a reviewed sample library.

## Hosting architecture

The interface is a static React application served by GitHub Pages from main → /docs. Live scans call the existing public backend at https://layout-atlas.brain-bytes-5762.chatgpt.site/api/page because GitHub Pages cannot run server-side code.

The backend allows browser requests from its own site and https://brainbytescreative1.github.io. CORS works at origin level, including other project pages on that GitHub account. No API keys or visitor credentials are sent. The crawler reads public HTML/CSS, honors robots rules, validates public destinations and redirects, and bounds request size, time, and rate.

Projects remain in the visitor's browser; clearing browser storage removes saved projects. The backend processes submitted website URLs to fetch pages but does not provide project storage.

Live scans depend on the backend staying available. The sample, manual editing, project import, and HTML exports run in the browser. JavaScript-heavy or bot-protected websites may require rendered HTML import. Detection produces suggestions that should be reviewed; it does not inspect private CMS templates or guarantee exact Elementor widget detection.

## Development

Requires Node.js 22.13+ and npm.

~~~sh
npm ci
npm run build:pages
npm test
npx tsc --noEmit
~~~

For the static interface's local development server:

~~~sh
npx vite --config vite.pages.config.ts
~~~

Visit the printed URL including /section-library-generator/. A local origin is deliberately not allowed by the production crawler. Use the full-stack development server (npm run dev) for same-origin live scans, or use sample/import features in the static preview.

## Publish changes to GitHub Pages

1. Run npm run build:pages.
2. Commit the source and generated docs/ files, including docs/.nojekyll.
3. Push to main.

Repository Settings → Pages must use Deploy from a branch, branch main, folder /docs. GitHub rebuilds Pages after each relevant push. Generated assets use the /section-library-generator/ base path. Changing the repository name requires updating vite.pages.config.ts and rebuilding.

To use another crawler backend, set ATLAS_CRAWLER_URL when building the Pages interface. This is a public URL embedded in the downloaded JavaScript, not a secret. Configure that backend's CORS allowlist for the deployed interface origin.

## Source map

- app/atlas-app.tsx, app/atlas.css: shared interface.
- static-app/, vite.pages.config.ts: static GitHub Pages entry and build.
- docs/: generated files published by GitHub Pages.
- lib/analyze.ts: navigation discovery and browser layout analysis.
- lib/model.ts, lib/presentation.ts: validation, templates, and exports.
- app/api/page/route.ts, lib/fetch-page.ts, lib/crawler-origin.ts: crawler and request policy.
- scripts/test-atlas.mjs: validation checks.

The full-stack version uses Vinext on Cloudflare Workers through Sites. Its deployment identity remains in .openai/hosting.json; GitHub Pages builds do not use that manifest. Build the full-stack application with npm run build and publish its Worker output through the existing Sites project workflow.

