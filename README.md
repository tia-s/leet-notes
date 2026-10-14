# LeetNotes - Engineering Journal

A static engineering journal focusing on algorithmic problem-solving and system design rationale, emphasizing methodology and engineering thought processes.

Built with [Astro](https://astro.build), the application compiles Markdown source files into optimized static HTML at build time. 

For comprehensive design specifications, see [`architecture.md`](./architecture.md).

## Prerequisites

* **Node.js 22.12.0 or newer** (required by Astro).
* **Git**.

Verify local environment versions:

```bash
node --version   # Expected: v22.12.0 or higher
```

## Local Development

```bash
# 1. Clone the repo
git clone <your-repo-url> leetnotes
cd leetnotes

# 2. Install dependencies (first time only, or after package.json changes)
npm install

# 3. Start the dev server
npm run dev
```

Open **http://localhost:4321**. The dev server hot-reloads: edit a component, a style, or a note, and the browser updates without a manual refresh.

To stop the server, press `Ctrl + C` in the terminal.

## Useful Commands

| Command | Description |
| --- | --- |
| `npm install` | Installs dependencies into `node_modules/` |
| `npm run dev` | Starts the dev server at `localhost:4321` |
| `npm run build` | Builds the production site into `dist/` |
| `npm run preview` | Serves the built `dist/` folder locally so you can test the real output |
| `npm run check` | Type-checks `.astro` and `.ts` files and validates note frontmatter |

## Adding a note

1. Create a Markdown file in `src/content/notes/`, for example `src/content/notes/binary-search.md`.
2. Start it with frontmatter, then write the note below it:

```markdown
title: Binary search without the guesswork
summary: Forget memorizing the loop. Define the search interval and let the invariant do the work.
category: algorithm          # algorithm | system-design
tags: [Searching, Arrays]
date: 2026-09-29
featured: false
```

3. Save. The dev server picks it up and the card appears on the home page.

If the frontmatter is invalid (a missing `title`, a `category` that isn't one of the allowed values, a bad date), the schema check fails and the error names the file and the field. Reading time is calculated automatically, so there's no field for it.

## Project structure

```
src/
├─ content/notes/    # notes (Markdown)
├─ pages/            # routes: home page and one page per note
├─ layouts/          # shared page shells
├─ components/       # sidebar, cards, the search/tabs island
├─ lib/              # helpers for sorting, counting, formatting
└─ styles/           # design tokens and global CSS
```

The complete tree with file descriptions can be found in [`architecture.md`](./architecture.md).

## Deploying

The site is static, so any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Connect the repo and run:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 22 or newer (set this in the host's settings)

Once configured, publishing a note requires only adding the Markdown file and pushing to Git. The host rebuilds and redeploys the site automatically.

## Troubleshooting

* **`npm run dev` fails with a Node version error:** The active Node environment is older than 22.12.0. Verify via `node --version` and upgrade as outlined in Prerequisites.
* **Port 4321 is occupied:** Another service is utilizing the port. Astro will automatically select the next available port, or a custom port can be assigned explicitly via `npm run dev -- --port 3000`.
* **Build fails due to frontmatter validation:** The schema enforcement mechanism has caught a metadata error. Review the error log for the specific file name and field requirement.
* **Configuration updates do not reflect:** While source files update via HMR, edits to `astro.config.mjs` require a manual server restart (`Ctrl + C` followed by `npm run dev`).