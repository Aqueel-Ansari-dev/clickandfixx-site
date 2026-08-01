# Runbook

Operational procedures for running and maintaining the ClickAndFixx landing
page. See [README.md](./README.md) for a general project overview.

## Deploying a change

There is no build step and no CI. Deploying is pushing to `main`.

1. Make your changes locally.
2. Serve the site locally and eyeball it (see "Local preview" below) —
   especially the hero and the diagnosis form, the two most interactive
   pieces.
3. Commit and push to `main`:
   ```bash
   git add -A
   git commit -m "..."
   git push
   ```
4. GitHub Pages picks up `main` automatically. Allow a minute or two, then
   check https://www.clickandfixx.com.
5. If you just pushed and the live site looks unchanged, hard-refresh
   (Cmd+Shift+R) — GitHub Pages/CDN caching, not your browser, is almost
   always the culprit.

### If `git push` is rejected

The remote may have commits you don't have locally (this has happened
before with stray `CNAME` create/delete commits made via the GitHub web
UI). Fetch and rebase rather than force-pushing:

```bash
git fetch origin
git log --oneline main..origin/main   # see what's new upstream
git rebase origin/main
git push
```

Only reach for `git push --force` if you've confirmed the diverging
upstream commits are genuinely stray/unwanted, and say so explicitly before
doing it — force-pushing `main` can erase someone else's work.

## Local preview

```bash
cd landingpage
python3 -m http.server 8934
# open http://localhost:8934/
```

Must be served over HTTP, not opened as a `file://` URL — `js/scene.js` is
loaded as an ES module and browsers block module imports from `file://`.

## Updating the diagnosis form's destination (Google Sheet)

The form (`#diagnosisForm`) posts to a Google Apps Script Web App URL,
which is set inline in `index.html`:

```html
<script>
  window.FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycb.../exec";
</script>
```

To point it at a different sheet, or after editing `apps-script.gs`:

1. Open the target Google Sheet → **Extensions → Apps Script**.
2. Paste in the contents of `apps-script.gs` (or edit the existing project
   if one's already there).
3. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy.**
   (Editing the script alone does *not* update a live `/exec` URL — you
   must ship a new version, or the old code keeps running.)
4. Copy the `/exec` URL from the deployment.
5. Paste it into `window.FORM_ENDPOINT` in `index.html`, commit, push.
6. Submit a real test entry on the live site and confirm a new row lands
   in the sheet.

If you ever see "Couldn't send. Email hello@clickandfixx.com instead." on
the live site, this endpoint is the first thing to check — either the
deployment's access changed (must be **Execute as: Me**, **Who has
access: Anyone**) or the URL in `index.html` is stale.

## Editing content

Everything lives in `index.html` — there's no CMS. Notable sections and
their ids, top to bottom: `#top` (hero), fault catalog (`#fixes`), process
(`#process`), case studies (`#proof`), pricing (`#pricing`), founder blurb,
form (`#diagnosis`).

- **Case-study numbers** (e.g. `6.2s → 1.1s`): each metric lives in a
  `<span class="count" data-from="..." data-to="..." data-decimals="...">`.
  The count-up animation in `js/main.js` reads those `data-*` attributes
  directly — editing them is enough, no JS changes needed.
- **Pricing**: plain text in `.price-card` blocks — no logic tied to it.
- **HUD "system check" list** (`#hud`) and the marquee ticker are static
  copy; edit directly.

## Design tokens

Colors, fonts, spacing, and animation timing are centralized as CSS custom
properties in `style.css`'s `:root` block (`--void`, `--panel`, `--broken`,
`--fixed`, `--spark`, `--bone`, `--dust`, `--ease-*`, `--dur-*`, `--pad`,
`--max`). Prefer changing a token over hardcoding a new color/size inline —
it's what keeps the "broken red / fixed green / spark amber" motif
consistent across ~10 different components.

## Mobile testing

Two mobile-specific behaviors to check after any layout change:

1. **Nav**: below 860px width, the nav collapses into a hamburger
   (`.nav-toggle` / `#navLinks`). Confirm it opens, all links work, and it
   closes on link click / Escape / outside click.
2. **Hero 3D scene**: below 700px width, `js/scene.js` switches to a
   reduced node/dust count and `style.css` moves `#heroCanvas` from a
   full-bleed background into a bordered panel *below* the headline
   (rather than behind it — the two used to overlap and were hard to
   read). If you change hero markup or the `700px` breakpoint, keep the
   two in sync — the CSS breakpoint and `scene.js`'s `innerWidth < 700`
   check must match, or the layout and the node positions/count will
   disagree.

### If you don't have a real phone or working device emulation handy

Browser devtools' responsive mode is the normal path. If that's not
available, you can fake the mobile CSS breakpoints on a desktop-width tab
to sanity-check *layout* (not the reduced node count, which is decided by
real `innerWidth` at page load):

```js
const s = document.createElement('style');
s.textContent = `/* paste the relevant @media (max-width: 700px) block here, with !important added */`;
document.head.appendChild(s);
```

To test the real mobile JS branch (reduced nodes, `scene.js`'s `mobile`
flag), you need an actual narrow viewport at load time — a real device,
or devtools device emulation, not just a CSS override.

## Known fallbacks / degraded states

- **No WebGL**: if Three.js throws during init (old browser, WebGL
  disabled, etc.), `js/scene.js` catches it, hides `#heroCanvas`, and adds
  `.no-webgl` to `.hero`, which switches to a static gradient background
  (see `.hero.no-webgl` in `style.css`). The rest of the page is
  unaffected.
- **`prefers-reduced-motion`**: most animations (glitch scramble, scanline,
  marquee, 3D fix transition, button spinner) check `matchMedia
  ("(prefers-reduced-motion: reduce)")` and either skip or shorten
  themselves. If you add a new animation, follow the same pattern.
- **Form endpoint unset**: if `window.FORM_ENDPOINT` is missing, the form
  still validates and shows a success message but doesn't send anywhere —
  this is intentional (lets you test the UI locally without touching the
  real sheet), not a bug to "fix" by adding a fallback endpoint.

## Domain / CNAME

`CNAME` contains `www.clickandfixx.com` and is what GitHub Pages reads to
serve the custom domain. If the live domain stops resolving or starts
serving GitHub's default 404:

1. Confirm `CNAME` still exists in the repo root with the right value —
   it's been deleted and recreated by accident before (see git history).
2. Check the repo's **Settings → Pages** for the custom domain and DNS
   check status.
3. DNS itself (the domain's A/CNAME records) is managed outside this repo
   — this runbook can't fix DNS propagation issues, only confirm whether
   the repo side is configured correctly.
