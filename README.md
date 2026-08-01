# ClickAndFixx — Landing Page

A single-page marketing site for ClickAndFixx, a fix-it studio for small
businesses (websites, automations, tracking, internal tools). The whole
site plays on one idea: **"Click. And it's fixed."** — it loads in a
"broken" state (glitch text, red FAIL badges, a scattered 3D node system)
and snaps into a "fixed" state on the visitor's first click.

Live at: https://www.clickandfixx.com (see `CNAME`)

## Stack

Static site, no build step, no framework.

- `index.html` — all markup/content, single page with anchor-linked sections
- `style.css` — full design system (CSS custom properties, no preprocessor)
- `js/main.js` — page interactivity: broken→fixed state machine, glitch-text
  scramble, scroll reveals, custom cursor, mobile nav, diagnosis form
  validation/submit
- `js/scene.js` — the hero's 3D system, built with [Three.js](https://threejs.org/)
  (loaded via CDN import map, no npm install needed)
- `apps-script.gs` — Google Apps Script backing the diagnosis form (see
  below)
- `CNAME` — GitHub Pages custom domain config

Fonts (Space Grotesk / Inter / JetBrains Mono) and Three.js are pulled from
CDNs at runtime — there's nothing to `npm install`.

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8934
# then open http://localhost:8934/
```

Three.js is loaded as an ES module (`type="module"`), so opening
`index.html` directly via `file://` won't work in most browsers — serve it
over HTTP.

## Site structure (index.html)

Sections, in order, each with an id used by the nav:

1. `#top` — hero (headline, 3D node system, diagnostic HUD)
2. marquee — scrolling "before → after" ticker
3. `#fixes` — fault catalog (4 cards: web, automation, visibility, systems)
4. `#process` — 3-step process (Click / And / Fixx)
5. `#proof` — repair log (3 case-study "tickets" with animated metrics)
6. `#pricing` — 3 pricing tiers
7. founder section
8. `#diagnosis` — final CTA + lead-gen form

## The diagnosis form

`#diagnosisForm` in `index.html` posts to `window.FORM_ENDPOINT`, set near
the bottom of `index.html`:

```html
<script>
  window.FORM_ENDPOINT = "https://script.google.com/macros/s/.../exec";
</script>
```

That URL points at a Google Apps Script Web App deployment (`apps-script.gs`)
that appends each submission as a row in a Google Sheet. See
[RUNBOOK.md](./RUNBOOK.md) for how to redeploy it.

If `FORM_ENDPOINT` is unset, the form still validates and shows a success
message locally, but nothing is sent anywhere — useful for local UI testing
without touching the real sheet.

## Design system

Everything is driven by CSS custom properties at the top of `style.css`
(`:root`): color tokens (`--void`, `--panel`, `--broken`, `--fixed`,
`--spark`, `--bone`, `--dust`), easing curves, durations, fonts, and layout
constants (`--pad`, `--max`). Change a token once, it propagates everywhere.

The "broken/fixed" motif is a `body` class toggle (`is-broken` /
`is-fixed`) flipped once by `runFix()` in `js/main.js` on the visitor's
first click anywhere on the page.

## Mobile

Breakpoints of note in `style.css`:

- `860px` — nav collapses to a hamburger menu (`.nav-toggle` / `#navLinks`)
- `700px` — hero switches from full-bleed 3D background to a boxed panel
  below the copy (see `js/scene.js`'s `mobile` flag, which also reduces
  node/dust count and antialiasing for performance)
- smaller breakpoints (`620px`, `560px`, `520px`, `420px`) fine-tune
  individual components (ticket grid, status chip, form header)

`js/scene.js` computes `mobile` once at load from `innerWidth < 700`, but
the CSS boxed/full-bleed hero layout reacts live to width changes. To keep
the two in sync if the viewport crosses 700px after load (desktop window
resize, tablet rotation), `scene.js` reloads the page once when that
happens rather than running with a stale node count/layout.

## Deployment

The site is static and served via GitHub Pages using the custom domain in
`CNAME`. Pushing to `main` is the deploy — there is no CI/build step.

See [RUNBOOK.md](./RUNBOOK.md) for step-by-step operational procedures.
