# PhotoClipper

Crop photos to 16:9 and other common aspect ratios, right in the browser.
No upload, no account, no install.

**Live:** https://bytekeeper.github.io/PhotoClipper/

PhotoClipper is a small static web app. You load a photo from your device,
pick a format, place the crop area where you want it, check the preview and
download the result. The image is processed entirely on your device with the
HTML canvas; it is never sent to a server.

## Features

- **Load photos** with the file picker, by dragging them onto the page, or by
  pasting an image from the clipboard (Ctrl/Cmd + V).
- **Aspect ratios:** 16:9, 4:3, 3:2, 1:1, 5:4, 21:9, the photo's original
  ratio, or free cropping.
- **Portrait or landscape:** one click flips the ratio, e.g. 16:9 → 9:16 or
  4:3 → 3:4.
- **Crop area:**
  - Drag inside the area to move it.
  - Drag a corner or edge handle to resize it; the ratio stays locked.
  - Use the arrow keys to nudge it by 1 px (Shift + arrow: 10 px).
  - It always stays inside the photo, and a rule-of-thirds grid helps with
    composition.
  - **Reset area** selects the largest possible area, centred.
- **Live preview** of the cropped result, with the selection size and the
  output size in pixels.
- **Download** as JPEG, PNG or WebP:
  - Quality slider for JPEG and WebP.
  - Full resolution by default, or enter an output width to scale the
    result (the height follows from the ratio).
  - Files are named after the original and the format, e.g.
    `holiday_16x9.jpg`.
- **German and English:** the interface is shown in German when the
  browser's preferred language is German, and in English otherwise.
- Works with mouse, touch and pen, and adapts to small screens.

## Usage

1. Open the app and load a photo.
2. Pick a format; use **Portrait ⇄** for upright formats.
3. Move and resize the crop area until the preview looks right.
4. Choose file type, quality and (optionally) an output width.
5. Click **Download**.

## Run locally

There is no build step. Open `index.html` directly in a browser, or serve
the folder with any static web server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `style.css` | Layout and styling (light and dark mode) |
| `app.js` | Loading, crop interaction, preview, export and translations |
| `.github/workflows/pages.yml` | Deployment to GitHub Pages |

To add another language, add a block to the `STRINGS` table at the top of
`app.js`.

## Deployment

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every
push to the repository's default branch; it can also be started manually
with **Run workflow**. One-time setup in the repository settings:

1. **Settings → Pages:** set **Source** to **GitHub Actions**.
2. **Settings → Environments → github-pages:** make sure the default branch
   is allowed to deploy.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. WebP export depends
on browser support; Safari may save a PNG instead.
