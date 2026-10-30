(() => {
  'use strict';

  const MIN_SIZE = 16; // minimum crop size in image pixels
  const PREVIEW_MAX = 300; // max preview edge in CSS pixels

  const $ = (id) => document.getElementById(id);
  const fileInput = $('file-input');
  const dropzone = $('dropzone');
  const stage = $('stage');
  const photo = $('photo');
  const cropEl = $('crop');
  const ratiosEl = $('ratios');
  const orientationBtn = $('orientation');
  const resetBtn = $('reset');
  const preview = $('preview');
  const previewEmpty = $('preview-empty');
  const dimensions = $('dimensions');
  const formatSel = $('format');
  const quality = $('quality');
  const qualityValue = $('quality-value');
  const qualityField = $('quality-field');
  const outWidth = $('out-width');
  const downloadBtn = $('download');
  const changeBtn = $('change-photo');

  const state = {
    fileName: 'photo',
    imgW: 0,
    imgH: 0,
    ratioKey: '16:9',
    portrait: false,
    // Crop rectangle in natural image pixels.
    crop: { x: 0, y: 0, w: 0, h: 0 },
  };

  // ---------- Translations ----------

  const STRINGS = {
    en: {
      tagline: 'Crop a local photo to 16:9 and other common formats. Everything stays in your browser.',
      dropHere: '<strong>Drop a photo here</strong> or',
      chooseFile: 'Choose file',
      photoAlt: 'Loaded photo',
      cropAria: 'Crop area. Drag to move, arrow keys to nudge.',
      format: 'Format',
      aspectRatio: 'Aspect ratio',
      original: 'Original',
      free: 'Free',
      portrait: 'Portrait ⇄',
      landscape: 'Landscape ⇄',
      reset: 'Reset area',
      hint: 'Drag the area to move it, drag the handles to resize. Arrow keys nudge (Shift = 10 px).',
      preview: 'Preview',
      previewEmpty: 'Load a photo to see the preview.',
      export: 'Export',
      fileType: 'File type',
      quality: 'Quality',
      outWidth: 'Output width (px, empty = full resolution)',
      full: 'full',
      download: 'Download',
      another: 'Load another photo',
      sourceLink: 'Source on GitHub',
      dimensions: 'Selection: {sw} × {sh} px · Output: {ow} × {oh} px',
      notImage: 'Please choose an image file.',
      decodeFailed: 'This image could not be decoded by your browser.',
      exportFailed: 'Export failed. The image may be too large for this browser.',
    },
    de: {
      tagline: 'Schneide ein lokales Foto auf 16:9 und andere gängige Formate zu. Alles bleibt in deinem Browser.',
      dropHere: '<strong>Foto hierher ziehen</strong> oder',
      chooseFile: 'Datei auswählen',
      photoAlt: 'Geladenes Foto',
      cropAria: 'Ausschnitt. Ziehen zum Verschieben, Pfeiltasten zum Feinjustieren.',
      format: 'Format',
      aspectRatio: 'Seitenverhältnis',
      original: 'Original',
      free: 'Frei',
      portrait: 'Hochformat ⇄',
      landscape: 'Querformat ⇄',
      reset: 'Zurücksetzen',
      hint: 'Ausschnitt ziehen zum Verschieben, Griffe ziehen zum Skalieren. Pfeiltasten verschieben (Umschalt = 10 px).',
      preview: 'Vorschau',
      previewEmpty: 'Lade ein Foto, um die Vorschau zu sehen.',
      export: 'Export',
      fileType: 'Dateityp',
      quality: 'Qualität',
      outWidth: 'Ausgabebreite (px, leer = volle Auflösung)',
      full: 'voll',
      download: 'Herunterladen',
      another: 'Anderes Foto laden',
      sourceLink: 'Quellcode auf GitHub',
      dimensions: 'Auswahl: {sw} × {sh} px · Ausgabe: {ow} × {oh} px',
      notImage: 'Bitte wähle eine Bilddatei aus.',
      decodeFailed: 'Dieses Bild kann dein Browser nicht lesen.',
      exportFailed: 'Export fehlgeschlagen. Das Bild ist für diesen Browser möglicherweise zu groß.',
    },
  };

  const lang = (navigator.languages || [navigator.language || 'en'])
    .map((l) => l.toLowerCase().split('-')[0])
    .find((l) => l in STRINGS) || 'en';

  function t(key, vars = {}) {
    const text = STRINGS[lang][key] ?? STRINGS.en[key];
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  }

  function translatePage() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  }

  // ---------- Aspect ratio ----------

  // Returns width / height of the crop, or null for free cropping.
  function currentRatio() {
    let r;
    if (state.ratioKey === 'free') return null;
    if (state.ratioKey === 'original') {
      r = state.imgW && state.imgH ? state.imgW / state.imgH : 1;
      // "Original" already has an orientation; the toggle flips it.
      return state.portrait ? 1 / r : r;
    }
    const [a, b] = state.ratioKey.split(':').map(Number);
    r = a / b;
    return state.portrait ? 1 / r : r;
  }

  function ratioLabel() {
    if (state.ratioKey === 'free') return 'free';
    if (state.ratioKey === 'original') return state.portrait ? 'original-rotated' : 'original';
    const [a, b] = state.ratioKey.split(':');
    return state.portrait ? `${b}x${a}` : `${a}x${b}`;
  }

  // Largest centered crop with the current ratio.
  function resetCrop() {
    const r = currentRatio();
    const W = state.imgW, H = state.imgH;
    let w = W, h = H;
    if (r) {
      if (W / H > r) { h = H; w = H * r; } else { w = W; h = W / r; }
    } else {
      w = W * 0.8; h = H * 0.8;
    }
    state.crop = { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }

  // Keep crop center and as much size as possible when the ratio changes.
  function applyRatioToCrop() {
    const r = currentRatio();
    if (!r) return;
    const c = state.crop;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const area = c.w * c.h;
    let w = Math.sqrt(area * r), h = w / r;
    const maxW = state.imgW, maxH = state.imgH;
    if (w > maxW) { w = maxW; h = w / r; }
    if (h > maxH) { h = maxH; w = h * r; }
    let x = clamp(cx - w / 2, 0, state.imgW - w);
    let y = clamp(cy - h / 2, 0, state.imgH - h);
    state.crop = { x, y, w, h };
  }

  // ---------- Loading ----------

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert(t('notImage'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (photo.dataset.url) URL.revokeObjectURL(photo.dataset.url);
      photo.dataset.url = url;
      photo.src = url;
      state.fileName = file.name.replace(/\.[^.]+$/, '') || 'photo';
      state.imgW = img.naturalWidth;
      state.imgH = img.naturalHeight;
      dropzone.hidden = true;
      stage.hidden = false;
      changeBtn.hidden = false;
      downloadBtn.disabled = false;
      previewEmpty.hidden = true;
      preview.hidden = false;
      resetCrop();
      // Wait for the visible <img> to lay out before positioning the overlay.
      if (photo.complete) render(); else photo.onload = render;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert(t('decodeFailed'));
    };
    img.src = url;
  }

  fileInput.addEventListener('change', () => {
    loadFile(fileInput.files[0]);
    fileInput.value = '';
  });
  changeBtn.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && e.relatedTarget) return;
      dropzone.classList.remove('over');
    })
  );
  document.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });
  document.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  // ---------- Rendering ----------

  function displayScale() {
    return photo.clientWidth / state.imgW;
  }

  let frame = 0;
  function render() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!state.imgW) return;
      const s = displayScale();
      const c = state.crop;
      cropEl.style.left = `${c.x * s}px`;
      cropEl.style.top = `${c.y * s}px`;
      cropEl.style.width = `${c.w * s}px`;
      cropEl.style.height = `${c.h * s}px`;
      drawPreview();
      const [ow, oh] = outputSize();
      dimensions.textContent =
        t('dimensions', { sw: Math.round(c.w), sh: Math.round(c.h), ow, oh });
    });
  }

  function drawPreview() {
    const c = state.crop;
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(PREVIEW_MAX / c.w, PREVIEW_MAX / c.h, 1);
    const cssW = Math.max(1, Math.round(c.w * scale));
    const cssH = Math.max(1, Math.round(c.h * scale));
    preview.style.width = `${cssW}px`;
    preview.style.height = `${cssH}px`;
    preview.width = Math.round(cssW * dpr);
    preview.height = Math.round(cssH * dpr);
    const ctx = preview.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photo, c.x, c.y, c.w, c.h, 0, 0, preview.width, preview.height);
  }

  window.addEventListener('resize', render);

  // ---------- Interaction ----------

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  let drag = null;

  cropEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    cropEl.focus({ preventScroll: true });
    cropEl.setPointerCapture(e.pointerId);
    drag = {
      handle: e.target.dataset.handle || 'move',
      startX: e.clientX,
      startY: e.clientY,
      start: { ...state.crop },
    };
  });

  cropEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const s = displayScale();
    const dx = (e.clientX - drag.startX) / s;
    const dy = (e.clientY - drag.startY) / s;
    if (drag.handle === 'move') {
      const c = drag.start;
      state.crop = {
        ...c,
        x: clamp(c.x + dx, 0, state.imgW - c.w),
        y: clamp(c.y + dy, 0, state.imgH - c.h),
      };
    } else {
      state.crop = resize(drag.start, drag.handle, dx, dy);
    }
    render();
  });

  const endDrag = () => { drag = null; };
  cropEl.addEventListener('pointerup', endDrag);
  cropEl.addEventListener('pointercancel', endDrag);

  // Resize the rectangle `c` by dragging `handle` by (dx, dy) image pixels.
  function resize(c, handle, dx, dy) {
    const W = state.imgW, H = state.imgH;
    const r = currentRatio();
    const hasE = handle.includes('e'), hasW = handle.includes('w');
    const hasN = handle.includes('n'), hasS = handle.includes('s');
    let left = c.x, top = c.y, right = c.x + c.w, bottom = c.y + c.h;

    if (!r) {
      if (hasW) left = clamp(left + dx, 0, right - MIN_SIZE);
      if (hasE) right = clamp(right + dx, left + MIN_SIZE, W);
      if (hasN) top = clamp(top + dy, 0, bottom - MIN_SIZE);
      if (hasS) bottom = clamp(bottom + dy, top + MIN_SIZE, H);
      return { x: left, y: top, w: right - left, h: bottom - top };
    }

    const minW = Math.max(MIN_SIZE, MIN_SIZE * r);
    const corner = (hasE || hasW) && (hasN || hasS);

    if (corner) {
      // Opposite corner stays fixed.
      const ax = hasE ? left : right;
      const ay = hasS ? top : bottom;
      const wCand = hasE ? right + dx - ax : ax - (left + dx);
      const hCand = hasS ? bottom + dy - ay : ay - (top + dy);
      let w = Math.max(wCand, hCand * r);
      const maxW = Math.min(hasE ? W - ax : ax, (hasS ? H - ay : ay) * r);
      w = clamp(w, Math.min(minW, maxW), maxW);
      const h = w / r;
      return { x: hasE ? ax : ax - w, y: hasS ? ay : ay - h, w, h };
    }

    if (hasE || hasW) {
      // Opposite edge stays fixed, vertical center stays fixed.
      const ax = hasE ? left : right;
      const cy = c.y + c.h / 2;
      let w = hasE ? c.w + dx : c.w - dx;
      const maxW = Math.min(hasE ? W - ax : ax, 2 * Math.min(cy, H - cy) * r);
      w = clamp(w, Math.min(minW, maxW), maxW);
      const h = w / r;
      return { x: hasE ? ax : ax - w, y: cy - h / 2, w, h };
    }

    // North / south edge.
    const ay = hasS ? top : bottom;
    const cx = c.x + c.w / 2;
    let h = hasS ? c.h + dy : c.h - dy;
    const maxH = Math.min(hasS ? H - ay : ay, (2 * Math.min(cx, W - cx)) / r);
    h = clamp(h, Math.min(minW / r, maxH), maxH);
    const w = h * r;
    return { x: cx - w / 2, y: hasS ? ay : ay - h, w, h };
  }

  cropEl.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 1;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const c = state.crop;
    state.crop = {
      ...c,
      x: clamp(c.x + m[0], 0, state.imgW - c.w),
      y: clamp(c.y + m[1], 0, state.imgH - c.h),
    };
    render();
  });

  // ---------- Controls ----------

  function updateOrientationButton() {
    orientationBtn.disabled = state.ratioKey === 'free' || state.ratioKey === '1:1';
    orientationBtn.textContent = t(state.portrait ? 'landscape' : 'portrait');
  }

  ratiosEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ratio]');
    if (!btn) return;
    ratiosEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    state.ratioKey = btn.dataset.ratio;
    updateOrientationButton();
    if (state.imgW) { applyRatioToCrop(); render(); }
  });

  orientationBtn.addEventListener('click', () => {
    state.portrait = !state.portrait;
    updateOrientationButton();
    if (state.imgW) { applyRatioToCrop(); render(); }
  });

  resetBtn.addEventListener('click', () => {
    if (!state.imgW) return;
    resetCrop();
    render();
  });

  function updateQualityVisibility() {
    qualityField.hidden = formatSel.value === 'image/png';
  }
  formatSel.addEventListener('change', updateQualityVisibility);
  quality.addEventListener('input', () => { qualityValue.textContent = quality.value; });
  outWidth.addEventListener('input', render);

  function outputSize() {
    const c = state.crop;
    const requested = parseInt(outWidth.value, 10);
    if (requested >= 1) {
      return [requested, Math.max(1, Math.round((requested * c.h) / c.w))];
    }
    return [Math.max(1, Math.round(c.w)), Math.max(1, Math.round(c.h))];
  }

  downloadBtn.addEventListener('click', () => {
    if (!state.imgW) return;
    const c = state.crop;
    const [ow, oh] = outputSize();
    const canvas = document.createElement('canvas');
    canvas.width = ow;
    canvas.height = oh;
    const ctx = canvas.getContext('2d');
    const type = formatSel.value;
    if (type === 'image/jpeg') {
      // JPEG has no alpha; avoid black backgrounds for transparent sources.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ow, oh);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photo, c.x, c.y, c.w, c.h, 0, 0, ow, oh);

    const exts = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    downloadBtn.disabled = true;
    canvas.toBlob((blob) => {
      downloadBtn.disabled = false;
      if (!blob) {
        alert(t('exportFailed'));
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // Browsers without WebP encoding fall back to PNG; name the file after what we got.
      a.download = `${state.fileName}_${ratioLabel()}.${exts[blob.type] || 'png'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, type, Number(quality.value) / 100);
  });

  translatePage();
  updateOrientationButton();
  updateQualityVisibility();
})();
