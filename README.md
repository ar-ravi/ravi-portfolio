# Ravi Singh — Portfolio

A responsive, retro-styled portfolio with resume-driven content, local question search, light/dark themes, and a small canvas runner. Edit `portfolio-config.json` when your resume changes.

**Live portfolio:** <https://ar-ravi.github.io/ravi-portfolio/>

## Run locally

This version has no package installation or API-key requirement. Because the page loads its JSON file with `fetch`, serve the folder over HTTP instead of opening `index.html` directly.

```sh
git clone https://github.com/ar-ravi/ravi-portfolio.git
cd ravi-portfolio
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy with GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` publishes the static site whenever a commit reaches `main`. In the repository, open **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**, then push to `main` (or run the workflow from the Actions tab). GitHub will show the live URL in the deployment job summary.

## Dino Run

The small runner in the hero is implemented in `game.js` with canvas and browser APIs. It needs no external game engine, model API, or paid service.

- Press **Space** or **↑** to jump over cacti.
- Hold **↓** to duck under flying obstacles.
- Press **P** or use the on-screen button to pause and resume.
- On touch screens, use **Jump**. Use **Start running** or **Run again** to begin another round.
- The score tracks distance; the best score is saved in this browser's local storage.

## Updating from a new resume

1. Keep a dated copy of the new resume outside the public site if you want a private source archive.
2. Update the matching sections in `portfolio-config.json`: `profile`, `experience`, `projects`, `skills`, `education`, and `certifications`.
3. Give each experience item and project a unique, lowercase `id` made of letters, numbers, and hyphens. The site uses these IDs for links.
4. Use `YYYY-MM` for start and end dates. Use `null` for an ongoing role.
5. Update `resume.version`, `resume.sourceFile`, and `resume.updatedAt` to identify the source version.
6. Refresh the local site and review the visible text, date ranges, metrics, and links before publishing.

The JSON file is the only content source. Components do not contain resume-specific career facts. Sections can be empty arrays when a future resume has no current entries for them. To add an external project link, set that project's `url` to its verified HTTPS URL; leave it empty if there is no public link.

## Content format

- `profile`: name, headline, location, email, intro, and about copy.
- `experience`: company, title, date range, and accomplishment highlights. A highlight may include tags and a metric.
- `projects`: name, summary, details, tags, and optional verified URL.
- `skills`: language and framework/library lists. Coursework remains available in the config for later display.
- `education` and `certifications`: displayed in the About section.
- `questions`: suggested questions shown beneath the prompt.

The question box searches the local config and returns the closest supporting experience or project. It does not send visitor questions or profile content to a model or server. AI narration can be added later as an optional layer, keeping this deterministic profile search as the no-key fallback.

## Current source

Initial content was transcribed from the resume identified in `resume.sourceFile`. The draft intentionally leaves personal links empty until verified destinations are added. Please review all wording and metrics against your source resume before publishing.
