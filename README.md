# PhotoClipper

A small static web app to crop a local photo to 16:9 and other common
formats (4:3, 3:2, 1:1, 5:4, 21:9, original, free), in landscape or portrait.

- Load a photo via file picker, drag & drop, or paste.
- Drag the selection to move it, drag the handles to resize, arrow keys to nudge.
- Live preview of the result.
- Download as JPEG, PNG or WebP at full resolution or a custom width.

Everything runs in the browser; the photo is never uploaded. The UI is shown
in German when the browser language is German, otherwise in English.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## GitHub Pages

`.github/workflows/pages.yml` deploys the site on every push to the default
branch (or manually via *Run workflow*). In the repository settings under
**Pages**, set **Source** to **GitHub Actions** once.
