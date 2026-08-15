# Share test

A single-page harness for testing the **Web Share API** and the **Add to Home Screen**
(PWA install) flow on a real device. No build step, no dependencies.

## What it does

- **Share this page** — calls `navigator.share({ title, text, url })` and reports whether the
  sheet opened, a target was chosen, or the user cancelled.
- **Share a file** — calls `navigator.share({ files: [...] })`, guarded by `navigator.canShare()`.
- **Install app** — captures `beforeinstallprompt` and replays it on tap (Chromium: Android,
  desktop Chrome/Edge). iOS has no equivalent API, so the page shows the manual Safari steps.
- **Environment** — a live table of what the current browser actually supports.
- **Log** — everything is written on-page, so you can debug from the phone with no
  desktop tooling attached.
- The green banner at the top only appears when the page was launched from a Home Screen
  icon, which is the real confirmation that the install worked.

## Testing it

Both the Web Share API and service workers require a **secure context** — HTTPS, or
`localhost`. Opening `index.html` from the filesystem will not work.

### On your phone

Push the branch and turn on GitHub Pages (Settings → Pages → deploy from branch), then open
the `https://<user>.github.io/testing-share/` URL on the phone. GitHub Pages serves HTTPS,
which is all the APIs need.

### Locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. `localhost` counts as a secure context, so both the share
button and the service worker work there. To reach it from a phone on the same network you
need HTTPS — a tunnel (`cloudflared tunnel --url http://localhost:8000`, ngrok, etc.) is the
easy path.

## Platform notes

| | Web Share | Install prompt | Add to Home Screen |
|---|---|---|---|
| iOS Safari | yes | no API | Safari's own Share button → *Add to Home Screen* |
| iOS Chrome/Firefox | yes | no API | not possible — the OS only allows it from Safari |
| Android Chrome | yes | `beforeinstallprompt` | via the prompt, or the ⋮ menu |
| Desktop Chrome/Edge | yes | `beforeinstallprompt` | installs as a desktop app |
| Desktop Firefox | no | no | no |

On iOS, *Add to Home Screen* lives in **Safari's own share sheet** — the button in the browser
toolbar. A sheet opened by `navigator.share()` from page JavaScript may not list it. Section 1
of the page lets you check what your iOS version actually does; section 2 has the manual steps
that always work.

## Icons

`icons/*.png` are generated, not hand-drawn. Regenerate with:

```sh
python3 tools/make-icons.py
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup, manifest link, iOS meta tags |
| `share.js` | Share calls, install prompt capture, diagnostics, logging |
| `styles.css` | Styling, light + dark |
| `manifest.webmanifest` | Name, icons, `display: standalone` — required for install |
| `sw.js` | Minimal service worker; Chromium needs one to offer an install prompt |
| `tools/make-icons.py` | Dependency-free PNG icon generator |
