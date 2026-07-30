# Soul Player — Soul Food Gospel Radio

A single-file PWA streaming player for Soul Food Gospel Radio, a UK-based 24/7
gospel internet radio station.

## Layout

Everything lives in `index.html` — HTML, CSS and JS are all inline, no build
step, no dependencies, no package manager. Edit the file directly.

| File | Purpose |
|---|---|
| `index.html` | The entire app (~1900 lines) |
| `manifest.json` | PWA manifest; `?autoplay=1` shortcut starts playback on launch |
| `sw.js` | Service worker — **currently inert**, see Gotchas |
| `offline.html` | Offline fallback used by `sw.js` |
| `icon-192.png`, `icon-512.png` | App icons |
| `grantly.jpg`, `shoggy.png` | Locally-hosted presenter photos |
| `test.html` | Standalone stream/audio diagnostic page, not linked from the app |
| `CNAME` | `player.soulfoodgospelradio.live` |

## Deployment

Hosted on **Netlify**, auto-deploying from `main` on GitHub
(`vfadayomi2/soul-player`). Push to `main` and it goes live at
player.soulfoodgospelradio.live. There is no staging environment — commits to
`main` are production.

The remote is HTTPS with no cached credentials, so `git push` from an agent
session will fail; the user has to push themselves.

## Stream

- Audio: `https://phoebe.streamerr.co:3555/stream` (Icecast 2.4.0-kh15, 128kbps MP3)
- Metadata: `https://phoebe.streamerr.co:3555/status-json.xsl`, polled every 12s

Both send `Access-Control-Allow-Origin: *`, which the iOS audio path depends on.
The `7.html` Shoutcast fallback in `META_URLS` returns 404 — it's an Icecast
server. `parseShoutcast` is therefore dead code.

The encoder sends titles as `" - Artist - Title "` with a leading separator.
`cleanRaw()` strips it before the `' - '` split; without it the artist comes out
blank and everything lands on the title line.

## Schedule data

`SCHEDULE` is a hardcoded array near the top of the main script, one object per
weekday, mirroring the StationPlaylist rotation. Each show entry:

```js
{ time:'6:00 PM', name:'Show Name', host:'Host Name', photo:'image.jpg' }
```

- `time` must match `/(\d+):(\d+)\s*(AM|PM)/i` — `timeToMins()` returns 0 otherwise.
- Entries must be in ascending time order within a day. A show runs until the
  *next* entry's start time, so gaps are impossible but ordering mistakes
  silently break the "on air now" highlight.
- Every day must start with a `12:00 AM` entry or the small hours have no show.
- `photo` takes a URL or a local filename; empty string falls back to the host's
  initials. Most remote photos are Squarespace CDN URLs.
- The key is `photo`, not `img`. Two entries still use `img:''` (Monday 10:00 AM,
  Tuesday 6:00 PM) — harmless today because both have no photo, but they'd
  silently drop an image if one were added.
- Avoid spaces in local image filenames.

Schedule rebuilds every 60s. All times are **Europe/London**, derived from
`getLondonTime()` regardless of the visitor's timezone.

## Other conventions

- ES5 style throughout: `var`, `function`, no arrow functions or template
  literals. Match it.
- **Never put HTML entities in JS string literals.** Script content isn't
  entity-decoded, so `&mdash;` inside a `showToast(...)` renders literally. Use
  `\u2014`-style escapes. This does *not* apply to HTML attributes such as
  `onerror="...'&#127925;'"` — attribute values are decoded by the parser, so
  entities there are fine.
- Day-part theming swaps CSS custom properties (`--accent` and friends) on
  `:root` at Morning/Afternoon/Evening/Night boundaries. Hardcoding an accent
  colour will break the transition.
- `showTab` is defined twice; the second definition (in the Wall/Request script)
  wins and is the one to edit.

## Gotchas

- **Service worker is deliberately unregistered** in three places in
  `index.html`, while `sw.js` and `offline.html` remain in the repo. So there's
  no offline support, and Chrome likely never fires `beforeinstallprompt` —
  meaning the "Install Free App" banner and top Install button probably never
  appear on Android/desktop. Re-registering the SW is the fix if install
  prompts are wanted back.
- **Track requests can't fail visibly.** The form POSTs to a *different* Netlify
  site (`hilarious-muffin-668098.netlify.app`) with `mode:'no-cors'`, so the
  promise always resolves and the "Thank you!" alert is unconditional. Test
  delivery end to end after touching it.
- **The Shout Out Wall has no real access control.** `ADMIN_PASS` is plaintext
  in the client, and deletes are direct REST calls to an open Firebase RTDB
  (`soul-player-wall-default-rtdb`). Anyone can post or delete regardless of the
  password prompt. Needs database rules, not client-side checks.
- iOS is the only platform routed through Web Audio (`NEEDS_WEBAUDIO`). Routing
  others risks total silence from a CORS-tainted `MediaElementSource`; there's a
  deliberate fallback that drops `crossorigin` and retries. Don't "simplify" it.
- Section-divider comments contain mojibake from an old double UTF-8 re-encode.
  Cosmetic, but don't propagate it — and be careful with tooling that rewrites
  the file wholesale.
- `sendRequest()`, `notify()`, `CMB`, `ADMIN` and `sleepTimer` are unused.

## Known open issues

- Profanity filter blocks ordinary words (`hate`, `kill`, `damn`, `crap`),
  which trips up scripture references.
- `getLondonTime()`'s catch-branch fallback hardcodes UTC+1, wrong in winter.
- `#onAirCard`'s `position: sticky` has no effect — it sits outside the
  scrolling container.
- Monday lists "Soul Food Morning" twice (9:00 AM and 10:00 AM).
