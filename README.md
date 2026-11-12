# rijudevx.github.io

Riju Dev Purkayastha's personal site. Astro 7, with Svelte 5 for the interactive parts. Static output, live at https://rijudevx.github.io on GitHub Pages.

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # static site in dist/
```

## Where things live

- `src/data/site.ts`: profile, links, "before you hire me" answers, experience. Every fact comes from `../profile/career-facts.md`.
- `src/content/work/*.md`: one case study per project. Frontmatter schema is in `src/content.config.ts`.
- `src/styles/global.css`: colour, type and spacing tokens, for light and dark.
- `src/lib/sound.ts`: synthesised sound effects. Add `data-sound="tap"` to any clickable element.
- `src/components/`: Astro components for static parts, Svelte for interactive ones (intro, cursor, nav island, smooth scroll, ⌘K palette, question chips, the on-call and heist games, the backlog). Pixel art is drawn on canvas in `Skyline.astro`, `Pixel.astro` and `FooterArt.astro`.
- `public/resume.pdf`: copy of `../resume/Riju Dev Purkayastha Full Stack.pdf`. Replace it when the resume changes.
- `src/assets/portrait*.png`: the pixel portrait, made by `docs/pixel-mk.py` (see `docs/portrait.md`).
- `docs/inspiration.md`: what was taken from which reference site. `docs/build-spec.md`: rules for writing components.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`, once a day (so the contribution graph stays fresh), and on demand from the Actions tab. Nothing else to do: push and it's live in about a minute.
