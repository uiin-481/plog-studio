(() => {
'use strict';

const $ = id => document.getElementById(id);
const clone = v => JSON.parse(JSON.stringify(v));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const DB_NAME = 'plog-studio-db-v1';
const STORE = 'kv';
const INDEX_KEY = 'plog-projects-index';
const ACTIVE_KEY = 'plog-active-project';
const FONTS_KEY = 'plog-user-fonts';
const STICKERS_KEY = 'plog-user-stickers';

const serif = "'Noto Serif CJK SC','Songti SC',serif";
const sans = "'Microsoft YaHei','PingFang SC',sans-serif";
const hand = "'KaiTi','Kaiti SC',cursive";
const eng = "'Georgia',serif";
const mono = "'Courier New',monospace";

const T = (text, x, y, w, h, size = 48, color = '#3f312b', family = serif, extra = {}) => ({
  id: uid(), type: 'text', text, x, y, w, h, size, color, family,
  align: 'left', weight: 'normal', rotation: 0, opacity: 1, ...extra
});
const S = (x, y, w, h, fill = '#e7dfd4', extra = {}) => ({
  id: uid(), type: 'shape', x, y, w, h, fill, shape: 'rect', radius: 0, rotation: 0, opacity: 1, ...extra
});

const PLOG_PALETTES = [
  { name: '奶油原木', colors: ['#f6f4f0', '#e8dfd3', '#b99f82', '#42342e'] },
  { name: '抹茶燕麦', colors: ['#f1f3eb', '#d0d7bd', '#6b7f5e', '#233022'] },
  { name: '樱桃摩卡', colors: ['#f6eee9', '#e7b9b2', '#b24a4a', '#2b181b'] },
  { name: '黄油复古', colors: ['#fff3e1', '#ffd8a8', '#a4b5c4', '#4a2a20'] },
  { name: '清冷极简', colors: ['#f5f6f8', '#e2e5ea', '#7d8997', '#1c2026'] },
  { name: '暗夜电影', colors: ['#1b1420', '#2b2434', '#c7ac79', '#f1e5ce'] }
];
const PLOG_BG_PATTERNS = [
  ['none', '纯色底'], ['grid', '手帐方格'], ['dots', '波点网格'], ['lined', '日记横线'], ['grain', '胶片颗粒']
];
const plogSvgUri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const PLOG_TEXT_PRESETS = [
  { name: '📅 日期印章', desc: '打字机等宽风', make: (w) => [T('2026.11 · SCENE', Math.round(w * 0.15), 110, Math.round(w * 0.7), 56, 34, '#4a3b34', mono, { align: 'center' }), S(Math.round(w * 0.3), 172, Math.round(w * 0.4), 3, '#b89b72')] },
  { name: '🏷 荧光高亮条', desc: '鹅黄高亮底+手写', make: (w) => [S(Math.round(w * 0.16), 170, Math.round(w * 0.68), 76, '#ffeaa0', { radius: 12, rotation: -1 }), T('今天也是值得记录的好天气 ~', Math.round(w * 0.18), 184, Math.round(w * 0.64), 56, 34, '#47392e', hand, { align: 'center', rotation: -1 })] },
  { name: '🎬 电影双语字幕', desc: '中文+英文副题', make: (w, h) => [T('故事发生的时候', Math.round(w * 0.12), h - 180, Math.round(w * 0.76), 64, 44, '#f7efe2', serif, { align: 'center' }), T('THE MOMENT WE KEPT IN FRAME', Math.round(w * 0.12), h - 112, Math.round(w * 0.76), 40, 20, '#d5be96', eng, { align: 'center' })] },
  { name: '📍 地点坐标卡', desc: '胶囊标签+坐标', make: (w) => [S(Math.round(w * 0.2), 150, Math.round(w * 0.6), 68, '#ffffff', { radius: 34, stroke: '#b99f82' }), T("📍 NANJING · 32°03'N", Math.round(w * 0.22), 164, Math.round(w * 0.56), 44, 26, '#4a3b34', mono, { align: 'center' })] },
  { name: '✉ 备忘录便签', desc: '圆角便签纸', make: (w) => [S(Math.round(w * 0.15), 220, Math.round(w * 0.7), 300, '#fffaf0', { radius: 18, stroke: '#d8c8b4' }), T('NOTE TO SELF', Math.round(w * 0.19), 248, Math.round(w * 0.62), 40, 22, '#9c7e62', eng), S(Math.round(w * 0.19), 294, Math.round(w * 0.62), 2, '#e6d8c6'), T('把平凡的日子折叠起来，\n写进这一页慢慢翻看。', Math.round(w * 0.19), 318, Math.round(w * 0.62), 170, 32, '#4a3d35', serif)] },
  { name: '🎞 杂志大标题', desc: '大字衬线+短线', make: (w) => [T('CORE MEMORY', 90, 110, w - 180, 44, 24, '#8f775e', eng), T('特别出演：我们的日常', 90, 156, w - 180, 82, 54, '#2d2420', serif), S(90, 248, 140, 6, '#b88d5d')] },
  { name: '💬 气泡碎碎念', desc: '圆角对话框', make: (w) => [S(Math.round(w * 0.18), 240, Math.round(w * 0.64), 120, '#f4edf7', { radius: 28, stroke: '#bba6ca' }), T('此时此刻的心情，满分！', Math.round(w * 0.2), 274, Math.round(w * 0.6), 58, 34, '#4f3459', hand, { align: 'center' })] },
  { name: '📹 CCD 时间戳', desc: '复古 DV 角标', make: () => [T('REC ●   2026/11/24   00:24', 70, 65, 560, 44, 24, '#e35b4f', mono)] }
];

const PLOG_PATTERNS = [
  { name: '胶带 · 格纹', desc: '半透斜贴纸胶带', w: 260, h: 76, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 76"><rect x="4" y="6" width="252" height="64" rx="4" fill="#d9c6a5" fill-opacity="0.72" stroke="#bba27c" stroke-width="2" stroke-dasharray="6 4"/><path d="M20 6v64M50 6v64M80 6v64M110 6v64M140 6v64M170 6v64M200 6v64M230 6v64M4 26h252M4 50h252" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/></svg>' },
  { name: '胶带 · 樱花粉', desc: '手撕边缘胶带', w: 250, h: 68, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 68"><path d="M10 8 L242 6 L236 22 L245 38 L238 60 L8 62 L14 42 L6 24 Z" fill="#f3c6cf" fill-opacity="0.82"/></svg>' },
  { name: '拍立得相框', desc: '经典白框（放底层）', w: 440, h: 520, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 520"><rect x="6" y="6" width="428" height="508" rx="6" fill="#fffdf8" stroke="#dfd4c6" stroke-width="4"/><rect x="30" y="30" width="380" height="380" fill="#efe8dd" stroke="#e4d9cb" stroke-width="2"/></svg>' },
  { name: '邮票齿孔框', desc: '复古邮票边框', w: 360, h: 440, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 440"><rect x="14" y="14" width="332" height="412" fill="none" stroke="#c5a882" stroke-width="8" stroke-dasharray="10 10"/><rect x="30" y="30" width="300" height="380" fill="none" stroke="#c5a882" stroke-width="2"/></svg>' },
  { name: '星芒闪烁 ✦', desc: '手绘星星组合', w: 180, h: 180, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><path d="M90 14 Q96 80 166 90 Q96 100 90 166 Q84 100 14 90 Q84 80 90 14Z" fill="#e9c46a"/><path d="M142 22 Q145 42 164 44 Q145 46 142 66 Q139 46 120 44 Q139 42 142 22Z" fill="#f4a261"/></svg>' },
  { name: '手绘波浪线', desc: '涂鸦分隔线', w: 340, h: 70, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 70"><path d="M12 38 Q40 12 68 38 T124 38 T180 38 T236 38 T292 38 T328 38" fill="none" stroke="#7c9070" stroke-width="7" stroke-linecap="round"/></svg>' },
  { name: '手绘小箭头', desc: '标注重点指针', w: 180, h: 120, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120"><path d="M16 92 Q78 86 148 34 M124 24 L154 30 L142 60" fill="none" stroke="#b24a4a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { name: '像素爱心', desc: 'Y2K 复古贴纸', w: 140, h: 130, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 130"><path d="M30 20 H55 V35 H85 V20 H110 V35 H125 V65 H110 V80 H95 V95 H80 V110 H60 V95 H45 V80 H30 V65 H15 V35 H30 Z" fill="#e76f7a" stroke="#2d1e22" stroke-width="5"/></svg>' }
];

const blankPage = () => ({ bg: '#f6f4f0', bgPattern: 'none', elements: [] });

let db = null, dbReady = false, pendingSave = 0;
let doc = { width: 1080, height: 1440, pages: [blankPage()] };
let current = 0, selected = -1, drag = null;
let undoStack = [], redoStack = [];
const imgCache = new Map();
const effectCache = new Map();
let effectCachePixels = 0;
const installedFonts = [];
let stickerLib = { folders: [], stickers: [] };
let userStickers = [];
let activeStickerFolder = 'all';
let stickerQuery = '';

const canvas = $('editCanvas');
const ctx = canvas.getContext('2d');
const status = txt => { $('statusText').textContent = txt; };

function getProjectsIndex() {
  try {
    const l = JSON.parse(localStorage.getItem(INDEX_KEY) || 'null');
    if (Array.isArray(l) && l.length) return l;
  } catch (_) {}
  return [{ id: 'default', title: '我的 Plog', docKey: 'doc:default', width: 1080, height: 1440, updatedAt: Date.now() }];
}
function saveProjectsIndex(list) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); } catch (_) {}
}
function getActiveProjectId() {
  try { return localStorage.getItem(ACTIVE_KEY) || 'default'; } catch (_) { return 'default'; }
}
function getActiveProject() {
  const list = getProjectsIndex(), id = getActiveProjectId();
  return list.find(x => x.id === id) || list[0];
}
function activeDocKey() { return getActiveProject()?.docKey || 'doc:default'; }

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function readDb(key) {
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
function writeDb(key, val) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.objectStore(STORE).put(val, key);
  });
}
function deleteDbKey(key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.objectStore(STORE).delete(key);
  });
}

function persist() {
  if (!dbReady || !db) return;
  clearTimeout(pendingSave);
  pendingSave = setTimeout(async () => {
    const key = activeDocKey();
    await writeDb(key, doc);
    const list = getProjectsIndex(), cur = list.find(b => b.docKey === key);
    if (cur) { cur.width = doc.width; cur.height = doc.height; cur.updatedAt = Date.now(); saveProjectsIndex(list); }
    status('✓ 已自动保存 ' + new Date().toLocaleTimeString().slice(0, 5));
  }, 260);
}

function activePage() { return doc.pages[current] || doc.pages[0]; }
function W() { return doc.width || 1080; }
function H() { return doc.height || 1440; }

function syncPaperSizeUI() {
  const w = W(), h = H();
  canvas.width = w;
  canvas.height = h;
  $('paperW').value = w;
  $('paperH').value = h;
  $('canvasDimLabel').textContent = `画纸 · ${w} × ${h}`;
  const presetVal = `${w}x${h}`;
  const sel = $('paperPreset');
  const hasOption = Array.from(sel.options).some(o => o.value === presetVal);
  sel.value = hasOption ? presetVal : 'custom';
}

function setPaperSize(w, h) {
  w = clamp(Math.round(Number(w) || 1080), 300, 2400);
  h = clamp(Math.round(Number(h) || 1440), 300, 3200);
  doc.width = w;
  doc.height = h;
  syncPaperSizeUI();
  persist();
  redraw();
  renderPagesList();
  status(`✓ 画纸尺寸已调整为 ${w} × ${h}`);
}

// --- Image Loading & Non-Destructive Processing Engine ---
function getImg(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src));
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { imgCache.set(src, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const cropOf = el => {
  const c = el.crop || { x: 0, y: 0, w: 1, h: 1 };
  const x = clamp(Number(c.x) || 0, 0, .95), y = clamp(Number(c.y) || 0, 0, .95);
  return { x, y, w: clamp(Number(c.w) || 1, .05, 1 - x), h: clamp(Number(c.h) || 1, .05, 1 - y) };
};
function placement(el, img) {
  const r = cropOf(el), sx = r.x * img.width, sy = r.y * img.height, sw = img.width * r.w, sh = img.height * r.h;
  const zoom = clamp(Number(el.zoom) || 1, 1, 4);
  const scale = (el.fit === 'contain' ? Math.min(el.w / sw, el.h / sh) : Math.max(el.w / sw, el.h / sh)) * zoom;
  const dw = sw * scale, dh = sh * scale;
  const maxX = Math.max(0, (dw - el.w) / 2), maxY = Math.max(0, (dh - el.h) / 2);
  return { sx, sy, sw, sh, dw, dh, maxX, maxY, ox: clamp(Number(el.offsetX) || 0, -maxX, maxX), oy: clamp(Number(el.offsetY) || 0, -maxY, maxY) };
}
function imageStroke(el) {
  const v = el.stroke || {}, num = (n, d, min, max) => Number.isFinite(Number(n)) ? clamp(Number(n), min, max) : d;
  return { enabled: v.enabled === true, width: num(v.width, 14, 1, 50), color: /^#[0-9a-f]{6}$/i.test(v.color || '') ? v.color : '#ffffff' };
}
function imageFrame(el) {
  const v = el.frame || {}, num = (n, d, min, max) => Number.isFinite(Number(n)) ? clamp(Number(n), min, max) : d;
  const shape = ['none', 'rounded', 'circle', 'torn'].includes(v.shape) ? v.shape : 'none';
  return { shape, radius: num(v.radius, 36, 0, 200), flipX: v.flipX === true, flipY: v.flipY === true };
}
function imageAdjustments(el) {
  const a = el.adjustments || {}, safe = (val, d, min, max) => { const n = Number(val); return Number.isFinite(n) ? clamp(n, min, max) : d; };
  return {
    brightness: safe(a.brightness, 100, 0, 200), contrast: safe(a.contrast, 100, 0, 200), saturation: safe(a.saturation, 100, 0, 200),
    warmth: safe(a.warmth, 0, -100, 100), sepia: safe(a.sepia, 0, 0, 100), fade: safe(a.fade, 0, 0, 60),
    grayscale: safe(a.grayscale, 0, 0, 100), vignette: safe(a.vignette, 0, 0, 100), blur: safe(a.blur, 0, 0, 20)
  };
}
function imageShadow(el) {
  const v = el.shadow || {}, num = (n, d, min, max) => Number.isFinite(Number(n)) ? clamp(Number(n), min, max) : d;
  return { enabled: v.enabled === true, blur: num(v.blur, 15, 0, 60), x: num(v.x, 5, -50, 50), y: num(v.y, 9, -50, 50), opacity: num(v.opacity, .28, 0, 1), color: /^#[0-9a-f]{6}$/i.test(v.color || '') ? v.color : '#32263c' };
}
function photoFilter(el) {
  const a = imageAdjustments(el), p = [`brightness(${a.brightness}%)`, `contrast(${a.contrast}%)`, `saturate(${a.saturation}%)`];
  if (a.sepia > 0) p.push(`sepia(${a.sepia}%)`);
  if (a.grayscale > 0) p.push(`grayscale(${a.grayscale}%)`);
  if (a.blur > 0) p.push(`blur(${a.blur}px)`);
  return p.join(' ');
}
function shadowColor(sh) {
  const n = parseInt(sh.color.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${sh.opacity})`;
}
function tornPaperPath(c, el, x, y) {
  const w = el.w, h = el.h, seedStr = String(el.id || 'torn') + '_' + Math.round(w) + 'x' + Math.round(h);
  let hval = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { hval ^= seedStr.charCodeAt(i); hval = Math.imul(hval, 16777619); }
  const rnd = () => { hval ^= hval << 13; hval ^= hval >>> 17; hval ^= hval << 5; return (hval >>> 0) / 4294967295; };
  const step = Math.max(8, Math.min(18, Math.min(w, h) / 16)), amp = Math.min(10, Math.max(3, Math.min(w, h) * 0.025));
  const pts = [];
  for (let px = 0; px < w; px += step) pts.push([x + px, y + amp * (0.25 + rnd() * 0.75)]);
  for (let py = 0; py < h; py += step) pts.push([x + w - amp * (0.25 + rnd() * 0.75), y + py]);
  for (let px = w; px > 0; px -= step) pts.push([x + px, y + h - amp * (0.25 + rnd() * 0.75)]);
  for (let py = h; py > 0; py -= step) pts.push([x + amp * (0.25 + rnd() * 0.75), y + py]);
  c.beginPath();
  pts.forEach((pt, idx) => idx === 0 ? c.moveTo(pt[0], pt[1]) : c.lineTo(pt[0], pt[1]));
  c.closePath();
}
function applyImageClip(c, el, x, y) {
  const f = imageFrame(el);
  if (f.shape === 'none') return false;
  c.beginPath();
  if (f.shape === 'circle') c.ellipse(x + el.w / 2, y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
  else if (f.shape === 'rounded') {
    const r = Math.min(f.radius, Math.min(el.w, el.h) / 2);
    c.roundRect(x, y, el.w, el.h, r);
  } else if (f.shape === 'torn') tornPaperPath(c, el, x, y);
  c.clip();
  return true;
}
function drawPlacedImage(c, el, img, x, y) {
  const f = imageFrame(el);
  c.save();
  const clipped = applyImageClip(c, el, x, y);
  if (f.flipX || f.flipY) {
    c.translate(x + el.w / 2, y + el.h / 2);
    c.scale(f.flipX ? -1 : 1, f.flipY ? -1 : 1);
    c.translate(-(x + el.w / 2), -(y + el.h / 2));
  }
  if (el.fit === 'stretch') {
    const r = cropOf(el);
    c.drawImage(img, r.x * img.width, r.y * img.height, img.width * r.w, img.height * r.h, x, y, el.w, el.h);
    c.restore();
    return;
  }
  const p = placement(el, img);
  if (!clipped) { c.beginPath(); c.rect(x, y, el.w, el.h); c.clip(); }
  c.drawImage(img, p.sx, p.sy, p.sw, p.sh, x + (el.w - p.dw) / 2 + p.ox, y + (el.h - p.dh) / 2 + p.oy, p.dw, p.dh);
  c.restore();
}
function cachePhotoEffect(el, item) {
  const old = effectCache.get(el);
  if (old) effectCachePixels -= old.buffer.width * old.buffer.height;
  effectCache.delete(el);
  effectCache.set(el, item);
  effectCachePixels += item.buffer.width * item.buffer.height;
  while ((effectCachePixels > 8000000 || effectCache.size > 20) && effectCache.size > 1) {
    const first = effectCache.keys().next().value, expired = effectCache.get(first);
    effectCachePixels -= expired.buffer.width * expired.buffer.height;
    effectCache.delete(first);
  }
}
function paintImageElement(c, el, img, x, y, scale = 1) {
  const sh = imageShadow(el), st = imageStroke(el), fr = imageFrame(el), adjust = imageAdjustments(el);
  const needsBuffer = (sh.enabled && sh.opacity > 0) || (st.enabled && st.width > 0) || adjust.warmth !== 0 || adjust.fade > 0 || adjust.vignette > 0;
  if (!needsBuffer) { c.save(); c.filter = photoFilter(el); drawPlacedImage(c, el, img, x, y); c.restore(); return; }
  const r = cropOf(el), maxSize = 4096, pad = st.enabled && st.width > 0 ? Math.ceil(st.width) : 0;
  const ds = Math.min(Math.max(.25, scale), maxSize / Math.max(1, el.w + pad * 2), maxSize / Math.max(1, el.h + pad * 2));
  const key = [el.w, el.h, el.fit, r.x, r.y, r.w, r.h, el.zoom, el.offsetX, el.offsetY, adjust.brightness, adjust.contrast, adjust.saturation, adjust.warmth, adjust.sepia, adjust.fade, adjust.grayscale, adjust.vignette, adjust.blur, st.enabled ? 1 : 0, st.width, st.color, fr.shape, fr.radius, fr.flipX ? 1 : 0, fr.flipY ? 1 : 0, ds].join('|');
  let item = effectCache.get(el);
  if (item) { effectCache.delete(el); effectCache.set(el, item); }
  if (!item || item.key !== key || item.img !== img) {
    const pw = Math.max(1, Math.round(el.w * ds)), ph = Math.max(1, Math.round(el.h * ds));
    const photoCanvas = document.createElement('canvas'); photoCanvas.width = pw; photoCanvas.height = ph;
    const pg = photoCanvas.getContext('2d'); pg.setTransform(pw / el.w, 0, 0, ph / el.h, 0, 0);
    pg.filter = photoFilter(el); drawPlacedImage(pg, el, img, 0, 0); pg.filter = 'none';
    if (adjust.warmth !== 0) {
      pg.save(); pg.globalCompositeOperation = 'source-atop';
      pg.fillStyle = adjust.warmth > 0 ? `rgba(255,162,72,${(adjust.warmth / 260).toFixed(3)})` : `rgba(88,165,255,${(-adjust.warmth / 260).toFixed(3)})`;
      pg.fillRect(0, 0, el.w, el.h); pg.restore();
    }
    if (adjust.fade > 0) {
      pg.save(); pg.globalCompositeOperation = 'source-atop';
      pg.fillStyle = `rgba(248,240,232,${(adjust.fade / 145).toFixed(3)})`;
      pg.fillRect(0, 0, el.w, el.h); pg.restore();
    }
    if (adjust.vignette > 0) {
      pg.save(); pg.globalCompositeOperation = 'source-atop';
      const cx = el.w / 2, cy = el.h / 2, rad = Math.hypot(el.w, el.h) * 0.54;
      const grad = pg.createRadialGradient(cx, cy, Math.min(el.w, el.h) * 0.22, cx, cy, rad);
      grad.addColorStop(0, 'rgba(18,10,22,0)');
      grad.addColorStop(1, `rgba(18,10,22,${(adjust.vignette / 115).toFixed(3)})`);
      pg.fillStyle = grad; pg.fillRect(0, 0, el.w, el.h); pg.restore();
    }
    const bw = Math.max(1, Math.round((el.w + pad * 2) * ds)), bh = Math.max(1, Math.round((el.h + pad * 2) * ds));
    const buffer = document.createElement('canvas'); buffer.width = bw; buffer.height = bh;
    const g = buffer.getContext('2d'), ox = Math.round(pad * ds), oy = Math.round(pad * ds);
    if (st.enabled && st.width > 0) {
      const sil = document.createElement('canvas'); sil.width = bw; sil.height = bh;
      const sg = sil.getContext('2d'), sr = st.width * ds, steps = 24;
      for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2; sg.drawImage(photoCanvas, ox + Math.cos(a) * sr, oy + Math.sin(a) * sr); }
      if (sr > 10) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sg.drawImage(photoCanvas, ox + Math.cos(a) * sr * 0.52, oy + Math.sin(a) * sr * 0.52); } }
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = st.color; sg.fillRect(0, 0, bw, bh);
      g.drawImage(sil, 0, 0);
    }
    g.drawImage(photoCanvas, ox, oy);
    item = { key, img, buffer, pad }; cachePhotoEffect(el, item);
  }
  c.save();
  if (sh.enabled && sh.opacity > 0) {
    c.shadowColor = shadowColor(sh); c.shadowBlur = sh.blur * scale;
    c.shadowOffsetX = sh.x * scale; c.shadowOffsetY = sh.y * scale;
  }
  c.drawImage(item.buffer, x - item.pad, y - item.pad, el.w + item.pad * 2, el.h + item.pad * 2);
  c.restore();
}

// --- Canvas Rendering ---
function linesOf(c, text, maxWidth) {
  const result = [];
  for (const para of String(text || '').split('\n')) {
    if (!para) { result.push(''); continue; }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (c.measureText(test).width > maxWidth && line) { result.push(line); line = ch; }
      else line = test;
    }
    result.push(line);
  }
  return result;
}

function paintPage(page, target, scale = 1) {
  const c = target.getContext('2d'), w = W(), h = H();
  c.save();
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, w, h);
  c.fillStyle = page.bg || '#f6f4f0';
  c.fillRect(0, 0, w, h);

  if (page.bgPattern && page.bgPattern !== 'none') {
    const hex = (page.bg || '#f6f4f0').replace('#', '');
    const num = parseInt(hex.length === 3 ? hex.split('').map(x => x + x).join('') : hex, 16) || 0xf6f4f0;
    const lum = (((num >> 16) & 255) * 299 + ((num >> 8) & 255) * 587 + (num & 255) * 114) / 1000;
    const ink = lum < 128 ? 'rgba(255,255,255,0.11)' : 'rgba(65,50,40,0.09)';
    c.save(); c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1;
    if (page.bgPattern === 'grid') {
      for (let x = 40; x < w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 40; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    } else if (page.bgPattern === 'dots') {
      for (let y = 32; y < h; y += 36) for (let x = 32; x < w; x += 36) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
    } else if (page.bgPattern === 'lined') {
      for (let y = 72; y < h; y += 48) { c.beginPath(); c.moveTo(44, y); c.lineTo(w - 44, y); c.stroke(); }
    } else if (page.bgPattern === 'grain') {
      let seed = 1337;
      for (let i = 0; i < 1100; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0; const gx = seed % w;
        seed = (seed * 1664525 + 1013904223) >>> 0; const gy = seed % h;
        c.fillRect(gx, gy, 2, 2);
      }
    }
    c.restore();
  }

  for (const el of page.elements) {
    if (el.hidden) continue;
    c.save();
    c.translate(el.x + el.w / 2, el.y + el.h / 2);
    c.rotate((el.rotation || 0) * Math.PI / 180);
    c.globalAlpha = el.opacity ?? 1;
    const x = -el.w / 2, y = -el.h / 2;
    if (el.type === 'text') {
      const size = el.size || 44;
      c.fillStyle = el.color || '#3f312b';
      c.font = `${el.weight || 'normal'} ${size}px ${el.family || serif}`;
      c.textBaseline = 'top';
      const align = el.align || 'left';
      c.textAlign = align;
      const lx = align === 'center' ? 0 : align === 'right' ? el.w / 2 : -el.w / 2;
      const lines = linesOf(c, el.text, el.w), lh = size * 1.33;
      lines.forEach((line, i) => {
        if (i * lh + size <= el.h + lh / 2) c.fillText(line, lx, y + i * lh);
      });
    } else if (el.type === 'shape') {
      const r = clamp(el.radius || 0, 0, Math.min(el.w, el.h) / 2);
      c.beginPath();
      if (el.shape === 'circle') c.ellipse(0, 0, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
      else c.roundRect(x, y, el.w, el.h, r);
      if (el.fill && el.fill !== 'transparent') { c.fillStyle = el.fill; c.fill(); }
      if (el.stroke) { c.strokeStyle = el.stroke; c.lineWidth = 4; c.stroke(); }
    } else if (el.type === 'image') {
      const img = imgCache.get(el.src);
      if (img) paintImageElement(c, el, img, x, y, scale);
      else { c.fillStyle = '#e3dcd6'; c.fillRect(x, y, el.w, el.h); }
    }
    c.restore();
  }
  c.restore();
}

async function ensureImages(page) {
  const srcs = new Set();
  for (const el of page.elements) if (el.type === 'image' && el.src) srcs.add(el.src);
  await Promise.all(Array.from(srcs).map(getImg));
}

function rotatePoint(el, x, y) {
  const rad = (el.rotation || 0) * Math.PI / 180, cx = el.x + el.w / 2, cy = el.y + el.h / 2, dx = x - cx, dy = y - cy;
  return { x: cx + Math.cos(rad) * dx - Math.sin(rad) * dy, y: cy + Math.sin(rad) * dx + Math.cos(rad) * dy };
}
function localPoint(el, p) {
  const rad = -(el.rotation || 0) * Math.PI / 180, cx = el.x + el.w / 2, cy = el.y + el.h / 2, dx = p.x - cx, dy = p.y - cy;
  return { x: cx + Math.cos(rad) * dx - Math.sin(rad) * dy, y: cy + Math.sin(rad) * dx + Math.cos(rad) * dy };
}
function handles(el) {
  return {
    rot: rotatePoint(el, el.x + el.w / 2, el.y - 46),
    size: rotatePoint(el, el.x + el.w, el.y + el.h),
    width: rotatePoint(el, el.x + el.w, el.y + el.h / 2),
    height: rotatePoint(el, el.x + el.w / 2, el.y + el.h)
  };
}

function paintSelection() {
  const el = activePage().elements[selected];
  if (!el) return;
  const h = handles(el);
  ctx.save();
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  ctx.rotate((el.rotation || 0) * Math.PI / 180);
  ctx.strokeStyle = '#6c467c';
  ctx.lineWidth = 3;
  ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
  ctx.beginPath(); ctx.moveTo(0, -el.h / 2); ctx.lineTo(0, -el.h / 2 - 46); ctx.stroke();
  ctx.restore();

  const dot = (pt, fill, r = 10) => {
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  };
  dot(h.rot, '#b38b4d', 10);
  dot(h.size, '#d94862', 11);
  if (el.type === 'image') { dot(h.width, '#6c467c', 9); dot(h.height, '#6c467c', 9); }
}

async function redraw() {
  await ensureImages(activePage());
  paintPage(activePage(), canvas, 1);
  paintSelection();
  updateCurrentThumb();
}

function redrawSync() {
  paintPage(activePage(), canvas, 1);
  paintSelection();
}

function snapshot() {
  undoStack.push(clone(activePage()));
  if (undoStack.length > 35) undoStack.shift();
  redoStack = [];
}
function modify(fn) {
  snapshot();
  fn();
  if (selected >= activePage().elements.length) selected = activePage().elements.length - 1;
  persist();
  redraw();
  renderProps();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(clone(activePage()));
  doc.pages[current] = undoStack.pop();
  selected = -1;
  persist(); redraw(); renderProps();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(clone(activePage()));
  doc.pages[current] = redoStack.pop();
  selected = -1;
  persist(); redraw(); renderProps();
}

function addElement(el) {
  modify(() => {
    activePage().elements.push(el);
    selected = activePage().elements.length - 1;
  });
}

// --- Photo Editor Modal (Crop, Frame/Stroke, Filters/Shadow, Cutout) ---
function showPhotoEditor(initialMode = 'reframe') {
  const original = activePage().elements[selected];
  if (original?.type !== 'image') return;
  const targetPage = activePage(), targetId = original.id;
  getImg(original.src).then(img => {
    if (!img) return alert('无法读取这张图片');
    const draft = clone(original);
    let mode = 'reframe', view = {}, interaction = null;
    draft.adjustments = { ...imageAdjustments(draft) };
    draft.shadow = { ...imageShadow(draft) };
    draft.stroke = { ...imageStroke(draft) };
    draft.frame = { ...imageFrame(draft) };
    let matte = null, matHistory = [], matBase = null, matWork = null, matCtx = null;

    const backdrop = document.createElement('div');
    backdrop.className = 'photo-edit-backdrop';
    backdrop.innerHTML = `<section class="photo-edit-dialog" role="dialog" aria-modal="true">
     <header class="photo-edit-header"><div><b>图片编辑 · 描边、调色与裁剪</b><small>所有修改仅作用于当前排版，不改动原图</small></div><button type="button" data-action="close">✕</button></header>
     <div class="photo-edit-tabs"><button data-tab="reframe" class="active">✋ 移动画面</button><button data-tab="crop">✂ 裁剪</button><button data-tab="frame">✎ 描边与形状</button><button data-tab="adjust">☀ 调色与阴影</button><button data-tab="cutout">✦ 抠图去背景</button></div>
     <div class="photo-edit-content"><div class="photo-edit-viewport"><canvas width="640" height="500"></canvas></div>
     <aside class="photo-edit-settings">
      <div class="pe-reframe">
       <label>显示方式<select data-field="fit"><option value="cover">填满画框</option><option value="contain">完整显示</option></select></label>
       <label>取景放大 <strong data-zoom-value>100%</strong><input data-field="zoom" type="range" min="1" max="4" step="0.01"></label>
       <div class="photo-edit-buttons"><button data-action="center">居中</button><button data-action="fit">完整显示</button></div>
      </div>
      <div class="pe-crop" hidden>
       <label>裁剪比例<select data-field="ratio"><option value="free">自由</option><option value="frame">按画框比例</option><option value="1">1:1</option><option value="0.75">3:4</option><option value="1.333333">4:3</option></select></label>
       <div class="photo-edit-buttons"><button data-action="reset-crop">恢复全部画面</button></div>
      </div>
      <div class="pe-frame" hidden>
       <strong class="pe-title">贴纸 / 照片轮廓描边</strong>
       <label class="pe-shadow-toggle"><input type="checkbox" data-field="strokeEnabled"> 开启轮廓描边</label>
       <div class="pe-stroke-controls">
        <label>描边粗细 <strong data-value="strokeWidth">14px</strong><input data-stroke="width" type="range" min="1" max="50" step="1"></label>
        <label>描边颜色 <input type="color" data-stroke="color"></label>
        <div class="pe-swatches">
         <button type="button" data-swatch="#ffffff" style="background:#ffffff" title="纯白"></button>
         <button type="button" data-swatch="#fbf6ea" style="background:#fbf6ea" title="奶白"></button>
         <button type="button" data-swatch="#dfc6a4" style="background:#dfc6a4" title="牛皮纸"></button>
         <button type="button" data-swatch="#f4cdd6" style="background:#f4cdd6" title="柔粉"></button>
         <button type="button" data-swatch="#2d282c" style="background:#2d282c" title="炭黑"></button>
        </div>
       </div>
       <strong class="pe-title">画框形状与镜像</strong>
       <label>裁切形状<select data-frame="shape"><option value="none">原图直角（或保留透明轮廓）</option><option value="rounded">圆角卡片</option><option value="circle">圆形 / 椭圆</option><option value="torn">手撕纸边</option></select></label>
       <label class="pe-radius-row">圆角大小 <strong data-value="frameRadius">36px</strong><input data-frame="radius" type="range" min="0" max="200" step="2"></label>
       <div class="photo-edit-buttons"><button type="button" data-action="flip-x">⇄ 水平镜像</button><button type="button" data-action="flip-y">⇅ 垂直翻转</button></div>
      </div>
      <div class="pe-adjust" hidden>
       <strong class="pe-title">调色滤镜与预设</strong>
       <div class="photo-edit-buttons">
        <button type="button" data-action="effect-reset">↺ 原图</button>
        <button type="button" data-action="effect-warm">暖调日记</button>
        <button type="button" data-action="effect-soft">柔和复古</button>
        <button type="button" data-action="effect-film">胶片微醺</button>
        <button type="button" data-action="effect-fresh">日系清透</button>
        <button type="button" data-action="effect-bw">黑白叙事</button>
       </div>
       <label>亮度 <strong data-value="brightness">100%</strong><input data-effect="brightness" type="range" min="0" max="200" step="1"></label>
       <label>对比度 <strong data-value="contrast">100%</strong><input data-effect="contrast" type="range" min="0" max="200" step="1"></label>
       <label>饱和度 <strong data-value="saturation">100%</strong><input data-effect="saturation" type="range" min="0" max="200" step="1"></label>
       <label>色温 <strong data-value="warmth">0</strong><input data-effect="warmth" type="range" min="-100" max="100" step="1"></label>
       <label>胶片褪色 <strong data-value="fade">0%</strong><input data-effect="fade" type="range" min="0" max="60" step="1"></label>
       <label>复古怀旧 <strong data-value="sepia">0%</strong><input data-effect="sepia" type="range" min="0" max="100" step="1"></label>
       <label>黑白度 <strong data-value="grayscale">0%</strong><input data-effect="grayscale" type="range" min="0" max="100" step="1"></label>
       <label>暗角聚焦 <strong data-value="vignette">0%</strong><input data-effect="vignette" type="range" min="0" max="100" step="1"></label>
       <label>柔焦模糊 <strong data-value="blur">0px</strong><input data-effect="blur" type="range" min="0" max="20" step="0.5"></label>
       <label class="pe-shadow-toggle"><input type="checkbox" data-field="shadowEnabled"> 添加纸张阴影</label>
       <div class="pe-shadow-controls">
        <label>模糊 <strong data-value="blur">15</strong><input data-shadow="blur" type="range" min="0" max="60" step="1"></label>
        <label>水平 <strong data-value="x">5</strong><input data-shadow="x" type="range" min="-50" max="50" step="1"></label>
        <label>垂直 <strong data-value="y">9</strong><input data-shadow="y" type="range" min="-50" max="50" step="1"></label>
        <label>浓度 <strong data-value="opacity">28%</strong><input data-shadow="opacity" type="range" min="0" max="100" step="1"></label>
        <label>颜色 <input type="color" data-shadow="color"></label>
       </div>
      </div>
      <div class="pe-cutout" hidden>
       <strong class="pe-title">本地背景去除</strong>
       <label>工具<select data-field="matmode"><option value="magic">🪄 点击删除相近背景</option><option value="erase">🖌 橡皮擦</option><option value="restore">↩ 恢复画笔</option></select></label>
       <label>容差 <strong data-mat-tolerance-label>44</strong><input data-field="tolerance" type="range" min="5" max="145" value="44"></label>
       <label>画笔 <strong data-mat-brush-label>28</strong><input data-field="brushsize" type="range" min="5" max="160" value="28"></label>
       <div class="photo-edit-buttons"><button data-action="four-corners">✨ 清除四角</button><button data-action="mat-undo">↶ 撤销</button><button data-action="mat-reset">还原</button></div>
      </div>
      <div class="photo-edit-buttons"><button data-action="reset-all">重置全部效果</button></div>
     </aside></div>
     <footer class="photo-edit-footer"><span data-note>实时预览</span><div><button data-action="cancel">取消</button><button data-action="apply" class="photo-edit-primary">应用修改</button></div></footer>
    </section>`;
    document.body.append(backdrop);

    const cvs = backdrop.querySelector('canvas'), c = cvs.getContext('2d');
    const qa = q => backdrop.querySelector(q), byAction = a => qa(`[data-action="${a}"]`);
    const pick = qa('[data-field="fit"]'), zoomSlider = qa('[data-field="zoom"]'), ratio = qa('[data-field="ratio"]');
    const effectInputs = backdrop.querySelectorAll('[data-effect]'), shadowInputs = backdrop.querySelectorAll('[data-shadow]');
    let ratioValue = 'free';

    function setupMatte() {
      if (matte) return;
      const max = 1400, sc = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
      matBase = document.createElement('canvas'); matBase.width = w; matBase.height = h;
      const bctx = matBase.getContext('2d', { willReadFrequently: true }); bctx.drawImage(img, 0, 0, w, h);
      matte = { w, h, src: bctx.getImageData(0, 0, w, h), removed: new Uint8Array(w * h) };
      matWork = document.createElement('canvas'); matWork.width = w; matWork.height = h;
      matCtx = matWork.getContext('2d', { willReadFrequently: true });
      paintMatte();
    }
    function stashMask() { if (!matte) return; matHistory.push(matte.removed.slice()); if (matHistory.length > 8) matHistory.shift(); }
    function paintMatte() {
      if (!matte) return;
      const src = matte.src.data, res = new ImageData(new Uint8ClampedArray(src), matte.w, matte.h);
      for (let i = 0; i < matte.removed.length; i++) res.data[i * 4 + 3] = Math.round(src[i * 4 + 3] * (255 - matte.removed[i]) / 255);
      matCtx.putImageData(res, 0, 0); img = matWork;
    }
    function colorFlood(ix, iy, tol) {
      if (!matte) return;
      const { w, h, src, removed } = matte, px = src.data;
      ix = clamp(Math.floor(ix), 0, w - 1); iy = clamp(Math.floor(iy), 0, h - 1);
      const start = iy * w + ix, seed = start * 4, r = px[seed], g = px[seed + 1], b = px[seed + 2];
      if (px[seed + 3] < 10) return;
      const lim = 3 * tol * tol, seen = new Uint8Array(w * h), q = new Int32Array(w * h);
      let head = 0, tail = 1; q[0] = start; seen[start] = 1;
      while (head < tail) {
        const p = q[head++], at = p * 4;
        const dr = px[at] - r, dg = px[at + 1] - g, db = px[at + 2] - b;
        if (dr * dr + dg * dg + db * db > lim) continue;
        removed[p] = 255;
        const x = p % w, y = (p - x) / w;
        if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; q[tail++] = p - 1; }
        if (x + 1 < w && !seen[p + 1]) { seen[p + 1] = 1; q[tail++] = p + 1; }
        if (y > 0 && !seen[p - w]) { seen[p - w] = 1; q[tail++] = p - w; }
        if (y + 1 < h && !seen[p + w]) { seen[p + w] = 1; q[tail++] = p + w; }
      }
    }
    function brushMask(ix, iy, restore) {
      if (!matte) return;
      const { w, h, removed } = matte, r = Math.max(2, Number(qa('[data-field="brushsize"]').value) * 0.5 * w / view.w);
      const x0 = Math.max(0, Math.floor(ix - r)), x1 = Math.min(w - 1, Math.ceil(ix + r)), y0 = Math.max(0, Math.floor(iy - r)), y1 = Math.min(h - 1, Math.ceil(iy + r));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - ix, y - iy); if (d > r) continue;
        const a = clamp(1 - d / r, 0, 1) * 0.9, i = y * w + x;
        removed[i] = restore ? Math.round(removed[i] * (1 - a)) : Math.round(255 - (255 - removed[i]) * (1 - a));
      }
    }
    function drawChecker(x, y, w, h) {
      c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.fillStyle = '#ddd6de';
      const s = 14; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      for (let yy = y; yy < y + h; yy += s) for (let xx = x; xx < x + w; xx += s) if ((Math.floor((xx - x) / s) + Math.floor((yy - y) / s)) % 2 === 0) c.fillRect(xx, yy, s, s);
      c.restore();
    }
    function draw() {
      c.clearRect(0, 0, 640, 500); c.fillStyle = '#ede9ef'; c.fillRect(0, 0, 640, 500); c.save();
      if (mode === 'reframe' || mode === 'adjust' || mode === 'frame') {
        const pad = draft.stroke?.enabled ? Math.ceil(draft.stroke.width || 0) : 0;
        const scale = Math.min(545 / Math.max(1, draft.w + pad * 2), 424 / Math.max(1, draft.h + pad * 2)), w = draft.w * scale, h = draft.h * scale, x = (640 - w) / 2, y = (500 - h) / 2;
        view = { x, y, w, h, scale }; drawChecker(x, y, w, h);
        c.save(); c.translate(x, y); c.scale(scale, scale); paintImageElement(c, draft, img, 0, 0, scale); c.restore();
        c.strokeStyle = '#b19357'; c.lineWidth = 2.5; c.strokeRect(x + .5, y + .5, w - 1, h - 1);
      } else if (mode === 'cutout') {
        setupMatte();
        const scale = Math.min(570 / matte.w, 442 / matte.h), w = matte.w * scale, h = matte.h * scale, x = (640 - w) / 2, y = (500 - h) / 2;
        view = { x, y, w, h, scale }; drawChecker(x, y, w, h); c.drawImage(matWork, x, y, w, h);
      } else {
        const scale = Math.min(570 / img.width, 440 / img.height), w = img.width * scale, h = img.height * scale, x = (640 - w) / 2, y = (500 - h) / 2;
        view = { x, y, w, h, scale }; drawChecker(x, y, w, h); c.drawImage(img, x, y, w, h);
        const r = cropOf(draft), rx = x + r.x * w, ry = y + r.y * h, rw = r.w * w, rh = r.h * h;
        c.fillStyle = 'rgba(19,16,30,.55)'; c.fillRect(x, y, w, r.y * h); c.fillRect(x, y + (r.y + r.h) * h, w, h - (r.y + r.h) * h);
        c.fillRect(x, ry, r.x * w, rh); c.fillRect(rx + rw, ry, w - (r.x + r.w) * w, rh);
        c.strokeStyle = '#eecb84'; c.lineWidth = 3; c.strokeRect(rx, ry, rw, rh);
      }
      c.restore();
      pick.value = draft.fit === 'contain' ? 'contain' : 'cover';
      zoomSlider.value = draft.zoom || 1;
      qa('[data-zoom-value]').textContent = (Number(draft.zoom || 1) * 100).toFixed(0) + '%';
    }
    const close = () => backdrop.remove();
    function setTab(tab) {
      mode = tab;
      backdrop.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      qa('.pe-reframe').hidden = tab !== 'reframe';
      qa('.pe-crop').hidden = tab !== 'crop';
      qa('.pe-frame').hidden = tab !== 'frame';
      qa('.pe-adjust').hidden = tab !== 'adjust';
      qa('.pe-cutout').hidden = tab !== 'cutout';
      draw();
    }
    backdrop.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
    const fromEvent = e => { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) * 640 / r.width, y: (e.clientY - r.top) * 500 / r.height }; };
    cvs.addEventListener('pointerdown', e => {
      const p = fromEvent(e);
      if (mode === 'cutout') {
        setupMatte(); const mx = (p.x - view.x) * matte.w / view.w, my = (p.y - view.y) * matte.h / view.h;
        if (mx < 0 || my < 0 || mx >= matte.w || my >= matte.h) return;
        stashMask(); const tool = qa('[data-field="matmode"]').value;
        if (tool === 'magic') colorFlood(mx, my, +qa('[data-field="tolerance"]').value);
        else brushMask(mx, my, tool === 'restore');
        interaction = { kind: 'matte', tool }; paintMatte(); draw(); cvs.setPointerCapture(e.pointerId); return;
      }
      if (mode === 'reframe' || mode === 'adjust' || mode === 'frame') {
        interaction = { kind: 'move-photo', start: p, x: draft.offsetX || 0, y: draft.offsetY || 0 };
      } else {
        const x = clamp((p.x - view.x) / view.w, 0, .95), y = clamp((p.y - view.y) / view.h, 0, .95);
        draft.crop = { x, y, w: .05, h: .05 }; interaction = { kind: 'crop', start: p, ox: x, oy: y };
      }
      cvs.setPointerCapture(e.pointerId);
    });
    cvs.addEventListener('pointermove', e => {
      if (!interaction) return;
      const p = fromEvent(e);
      if (interaction.kind === 'matte') {
        if (interaction.tool === 'magic') return;
        const mx = (p.x - view.x) * matte.w / view.w, my = (p.y - view.y) * matte.h / view.h;
        brushMask(mx, my, interaction.tool === 'restore'); paintMatte(); draw(); return;
      }
      if (interaction.kind === 'move-photo') {
        const m = placement(draft, img);
        draft.offsetX = clamp(interaction.x + (p.x - interaction.start.x) / view.scale, -m.maxX, m.maxX);
        draft.offsetY = clamp(interaction.y + (p.y - interaction.start.y) / view.scale, -m.maxY, m.maxY);
      } else if (interaction.kind === 'crop') {
        const nx = clamp((p.x - view.x) / view.w, 0, 1), ny = clamp((p.y - view.y) / view.h, 0, 1);
        draft.crop = { x: Math.min(interaction.ox, nx), y: Math.min(interaction.oy, ny), w: Math.max(.05, Math.abs(nx - interaction.ox)), h: Math.max(.05, Math.abs(ny - interaction.oy)) };
      }
      draw();
    });
    cvs.addEventListener('pointerup', () => interaction = null);

    function syncEffectInputs() {
      effectInputs.forEach(inp => {
        const k = inp.dataset.effect, v = draft.adjustments[k]; inp.value = v;
        qa(`[data-value="${k}"]`).textContent = v + (k === 'warmth' ? '' : k === 'blur' ? 'px' : '%');
      });
      qa('[data-field="shadowEnabled"]').checked = draft.shadow.enabled;
      shadowInputs.forEach(inp => {
        const k = inp.dataset.shadow, v = k === 'opacity' ? Math.round(draft.shadow.opacity * 100) : draft.shadow[k];
        inp.value = v; if (k !== 'color') qa(`[data-value="${k}"]`).textContent = v + (k === 'opacity' ? '%' : '');
      });
      qa('.pe-shadow-controls').classList.toggle('is-disabled', !draft.shadow.enabled);
    }
    function syncFrameInputs() {
      qa('[data-field="strokeEnabled"]').checked = draft.stroke.enabled;
      qa('[data-stroke="width"]').value = draft.stroke.width;
      qa('[data-value="strokeWidth"]').textContent = draft.stroke.width + 'px';
      qa('[data-stroke="color"]').value = draft.stroke.color;
      qa('.pe-stroke-controls').classList.toggle('is-disabled', !draft.stroke.enabled);
      qa('[data-frame="shape"]').value = draft.frame.shape;
      qa('[data-frame="radius"]').value = draft.frame.radius;
      qa('[data-value="frameRadius"]').textContent = draft.frame.radius + 'px';
      qa('.pe-radius-row').hidden = draft.frame.shape !== 'rounded';
      byAction('flip-x').classList.toggle('active', draft.frame.flipX);
      byAction('flip-y').classList.toggle('active', draft.frame.flipY);
    }

    pick.onchange = () => { draft.fit = pick.value; draft.offsetX = 0; draft.offsetY = 0; draw(); };
    zoomSlider.oninput = () => { draft.zoom = Number(zoomSlider.value); draw(); };
    ratio.onchange = () => { ratioValue = ratio.value; if (ratioValue === 'free') return; const ar = (ratioValue === 'frame' ? draft.w / draft.h : Number(ratioValue)) * img.height / img.width; draft.crop = { x: 0, y: 0, w: Math.min(1, ar), h: Math.min(1, 1 / ar) }; draw(); };
    effectInputs.forEach(i => i.addEventListener('input', () => { draft.adjustments[i.dataset.effect] = Number(i.value); syncEffectInputs(); draw(); }));
    qa('[data-field="shadowEnabled"]').addEventListener('change', e => { draft.shadow.enabled = e.target.checked; syncEffectInputs(); draw(); });
    shadowInputs.forEach(i => i.addEventListener('input', () => { const k = i.dataset.shadow; draft.shadow[k] = k === 'color' ? i.value : k === 'opacity' ? Number(i.value) / 100 : Number(i.value); syncEffectInputs(); draw(); }));
    qa('[data-field="strokeEnabled"]').addEventListener('change', e => { draft.stroke.enabled = e.target.checked; syncFrameInputs(); draw(); });
    qa('[data-stroke="width"]').addEventListener('input', e => { draft.stroke.width = Number(e.target.value); syncFrameInputs(); draw(); });
    qa('[data-stroke="color"]').addEventListener('input', e => { draft.stroke.color = e.target.value; syncFrameInputs(); draw(); });
    backdrop.querySelectorAll('[data-swatch]').forEach(b => b.addEventListener('click', () => { draft.stroke.enabled = true; draft.stroke.color = b.dataset.swatch; syncFrameInputs(); draw(); }));
    qa('[data-frame="shape"]').addEventListener('change', e => { draft.frame.shape = e.target.value; syncFrameInputs(); draw(); });
    qa('[data-frame="radius"]').addEventListener('input', e => { draft.frame.radius = Number(e.target.value); syncFrameInputs(); draw(); });
    byAction('flip-x').onclick = () => { draft.frame.flipX = !draft.frame.flipX; syncFrameInputs(); draw(); };
    byAction('flip-y').onclick = () => { draft.frame.flipY = !draft.frame.flipY; syncFrameInputs(); draw(); };

    const applyPreset = p => { draft.adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, sepia: 0, fade: 0, grayscale: 0, vignette: 0, blur: 0, ...p }; syncEffectInputs(); draw(); };
    byAction('effect-reset').onclick = () => applyPreset({});
    byAction('effect-warm').onclick = () => applyPreset({ brightness: 105, contrast: 96, saturation: 113, warmth: 38, vignette: 18 });
    byAction('effect-soft').onclick = () => applyPreset({ brightness: 107, contrast: 87, saturation: 77, warmth: 22, sepia: 22, fade: 18 });
    byAction('effect-film').onclick = () => applyPreset({ brightness: 102, contrast: 112, saturation: 88, warmth: 18, fade: 24, vignette: 36 });
    byAction('effect-fresh').onclick = () => applyPreset({ brightness: 110, contrast: 95, saturation: 116, warmth: -20, fade: 10 });
    byAction('effect-bw').onclick = () => applyPreset({ brightness: 104, contrast: 118, saturation: 0, grayscale: 100, vignette: 28 });

    byAction('center').onclick = () => { draft.offsetX = 0; draft.offsetY = 0; draw(); };
    byAction('fit').onclick = () => { draft.fit = 'contain'; draft.zoom = 1; draft.offsetX = 0; draft.offsetY = 0; draw(); };
    byAction('reset-crop').onclick = () => { draft.crop = { x: 0, y: 0, w: 1, h: 1 }; draw(); };
    byAction('reset-all').onclick = () => { draft.crop = { x: 0, y: 0, w: 1, h: 1 }; draft.fit = 'contain'; draft.zoom = 1; draft.offsetX = 0; draft.offsetY = 0; applyPreset({}); draft.stroke = { enabled: false, width: 14, color: '#ffffff' }; draft.frame = { shape: 'none', radius: 36, flipX: false, flipY: false }; draft.shadow = { enabled: false, blur: 15, x: 5, y: 9, opacity: .28, color: '#32263c' }; syncFrameInputs(); draw(); };
    byAction('four-corners').onclick = () => { setupMatte(); stashMask(); const t = +qa('[data-field="tolerance"]').value; for (const [x, y] of [[1, 1], [matte.w - 2, 1], [1, matte.h - 2], [matte.w - 2, matte.h - 2]]) colorFlood(x, y, t); paintMatte(); draw(); };
    byAction('mat-undo').onclick = () => { if (!matte || !matHistory.length) return; matte.removed = matHistory.pop(); paintMatte(); draw(); };
    byAction('mat-reset').onclick = () => { if (!matte) return; stashMask(); matte.removed.fill(0); paintMatte(); draw(); };
    byAction('close').onclick = close;
    byAction('cancel').onclick = close;
    byAction('apply').onclick = () => {
      if (activePage() !== targetPage) return close();
      const live = targetPage.elements.find(e => e.id === targetId);
      if (!live) return close();
      const matSrc = matte ? matWork.toDataURL('image/png') : null;
      modify(() => {
        Object.assign(live, { crop: cropOf(draft), fit: draft.fit, zoom: draft.zoom || 1, offsetX: draft.offsetX || 0, offsetY: draft.offsetY || 0, adjustments: { ...draft.adjustments }, shadow: { ...draft.shadow }, stroke: { ...draft.stroke }, frame: { ...draft.frame } });
        if (matSrc) { live.src = matSrc; live.fit = 'contain'; live.zoom = 1; live.offsetX = 0; live.offsetY = 0; }
      });
      close();
      status('✓ 已应用图片编辑效果');
    };
    syncEffectInputs(); syncFrameInputs();
    setTab(['adjust', 'frame', 'crop', 'cutout', 'reframe'].includes(initialMode) ? initialMode : 'reframe');
  });
}

// --- Projects (Works / Books) Manager ---
function showProjectsManager() {
  const backdrop = document.createElement('div');
  backdrop.className = 'photo-edit-backdrop';
  backdrop.innerHTML = `<section class="books-modal-dialog" role="dialog" aria-modal="true">
   <header class="photo-edit-header"><div><b>Plog 作品集 · 新建与切换</b><small>每个作品独立保存画纸尺寸与页面</small></div><button type="button" data-action="close">✕</button></header>
   <div class="books-modal-body">
    <div class="books-list" data-list></div>
    <div class="book-create-card">
     <h3>＋ 创建新 Plog 作品</h3>
     <div class="book-create-grid">
      <label>作品名称<input type="text" data-new-title value="新 Plog 日记"></label>
      <label>画纸尺寸<select data-new-size><option value="1080x1440" selected>小红书 3:4 (1080×1440)</option><option value="1080x1920">手机长图 9:16 (1080×1920)</option><option value="1200x1200">正方形 1:1 (1200×1200)</option><option value="1440x1080">横版 4:3 (1440×1080)</option></select></label>
     </div>
     <div class="photo-edit-buttons"><button type="button" data-action="create" class="photo-edit-primary">＋ 创建并打开</button></div>
    </div>
   </div>
  </section>`;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('[data-action="close"]').onclick = close;
  backdrop.onclick = e => { if (e.target === backdrop) close(); };
  const listEl = backdrop.querySelector('[data-list]');

  function renderList() {
    const list = getProjectsIndex(), curId = getActiveProjectId();
    listEl.innerHTML = '';
    list.forEach(p => {
      const row = document.createElement('div'); row.className = 'book-item' + (p.id === curId ? ' is-active' : '');
      row.innerHTML = `<div class="book-item-meta"><strong>${p.title}${p.id === curId ? ' · 当前' : ''}</strong><small>${p.width || 1080}×${p.height || 1440}</small></div>`;
      const acts = document.createElement('div'); acts.className = 'book-item-actions';
      if (p.id !== curId) {
        const b = document.createElement('button'); b.className = 'primary'; b.textContent = '打开';
        b.onclick = async () => {
          if (db) await writeDb(activeDocKey(), doc);
          localStorage.setItem(ACTIVE_KEY, p.id);
          location.reload();
        };
        acts.append(b);
      }
      const ren = document.createElement('button'); ren.textContent = '重命名';
      ren.onclick = () => {
        const next = prompt('输入新名称：', p.title);
        if (!next?.trim()) return;
        const all = getProjectsIndex(), item = all.find(x => x.id === p.id);
        if (item) { item.title = next.trim(); saveProjectsIndex(all); if (p.id === curId) $('projectTitle').textContent = item.title; }
        renderList();
      };
      acts.append(ren);
      if (p.id !== 'default') {
        const del = document.createElement('button'); del.textContent = '删除';
        del.onclick = async () => {
          if (!confirm(`确定删除「${p.title}」吗？`)) return;
          if (db) await deleteDbKey(p.docKey);
          const next = getProjectsIndex().filter(x => x.id !== p.id);
          saveProjectsIndex(next);
          if (p.id === curId) { localStorage.setItem(ACTIVE_KEY, next[0].id); location.reload(); return; }
          renderList();
        };
        acts.append(del);
      }
      row.append(acts); listEl.append(row);
    });
  }
  renderList();

  backdrop.querySelector('[data-action="create"]').onclick = async () => {
    const title = (backdrop.querySelector('[data-new-title]').value || '').trim() || '新 Plog 日记';
    const [w, h] = backdrop.querySelector('[data-new-size]').value.split('x').map(Number);
    if (db) await writeDb(activeDocKey(), doc);
    const id = 'p_' + uid(), docKey = 'doc:' + id;
    const newDoc = { width: w || 1080, height: h || 1440, pages: [blankPage()] };
    if (db) await writeDb(docKey, newDoc);
    const list = getProjectsIndex();
    list.push({ id, title, docKey, width: newDoc.width, height: newDoc.height, updatedAt: Date.now() });
    saveProjectsIndex(list);
    localStorage.setItem(ACTIVE_KEY, id);
    location.reload();
  };
}

// --- Panels Rendering ---
function renderPagesList() {
  const list = $('pageList'); list.replaceChildren();
  $('pageCountLabel').textContent = doc.pages.length + ' 页';
  doc.pages.forEach((pg, i) => {
    const btn = document.createElement('button');
    btn.className = 'page-item' + (i === current ? ' active' : '');
    const thumb = document.createElement('canvas');
    thumb.width = 92; thumb.height = Math.round(92 * H() / W());
    thumb.dataset.page = i;
    const info = document.createElement('div');
    info.innerHTML = `<span>第 ${i + 1} 页</span><small>${pg.elements.length} 个元素</small>`;
    btn.append(thumb, info);
    btn.onclick = () => { current = i; selected = -1; undoStack = []; redoStack = []; $('pageLabel').textContent = `第 ${i + 1} 页`; renderPagesList(); redraw(); renderProps(); };
    list.append(btn);
    ensureImages(pg).then(() => paintPage(pg, thumb, thumb.width / W()));
  });
}
function updateCurrentThumb() {
  const thumb = $('pageList').querySelector(`canvas[data-page="${current}"]`);
  if (thumb) { thumb.height = Math.round(thumb.width * H() / W()); paintPage(activePage(), thumb, thumb.width / W()); }
}

function renderProps() {
  const panel = $('elementProps'), layers = $('layersList');
  panel.replaceChildren(); layers.replaceChildren();

  // 1. Page Background & Curated Palettes Card
  const bgCard = document.createElement('div'); bgCard.className = 'plog-card';
  const bgHead = document.createElement('div'); bgHead.className = 'plog-card-head';
  bgHead.innerHTML = '<strong>🎨 页底颜色与 Plog 色系</strong>';
  const bgAll = document.createElement('button'); bgAll.type = 'button'; bgAll.textContent = '应用到全部页';
  bgAll.onclick = () => { modify(() => { const bg = activePage().bg, pat = activePage().bgPattern; doc.pages.forEach(p => { p.bg = bg; p.bgPattern = pat; }); }); status('✓ 已应用到全部页'); };
  bgHead.append(bgAll);

  const bgRow = document.createElement('div'); bgRow.className = 'plog-bg-row';
  const bgPick = document.createElement('input'); bgPick.type = 'color'; bgPick.value = activePage().bg || '#f6f4f0';
  bgPick.oninput = e => { activePage().bg = e.target.value; redrawSync(); };
  bgPick.onchange = e => { const v = e.target.value; modify(() => { activePage().bg = v; }); };
  const patSel = document.createElement('select');
  PLOG_BG_PATTERNS.forEach(([v, lbl]) => { const o = document.createElement('option'); o.value = v; o.textContent = lbl; patSel.append(o); });
  patSel.value = activePage().bgPattern || 'none';
  patSel.onchange = () => modify(() => { activePage().bgPattern = patSel.value; });
  bgRow.append(bgPick, patSel);

  const palBox = document.createElement('div'); palBox.className = 'plog-palettes';
  PLOG_PALETTES.forEach(pal => {
    const row = document.createElement('div'); row.className = 'plog-palette-row';
    row.innerHTML = `<span>${pal.name}</span>`;
    const dots = document.createElement('div'); dots.className = 'plog-palette-dots';
    pal.colors.forEach((col, idx) => {
      const dot = document.createElement('button'); dot.type = 'button'; dot.style.background = col; dot.title = col;
      dot.onclick = () => {
        const cur = activePage().elements[selected];
        if (idx > 0 && cur && (cur.type === 'text' || cur.type === 'shape')) {
          modify(() => { cur[cur.type === 'text' ? 'color' : 'fill'] = col; });
        } else {
          modify(() => { activePage().bg = col; });
          status(`✓ 页底已切换为「${pal.name}」`);
        }
      };
      dots.append(dot);
    });
    row.append(dots); palBox.append(row);
  });
  bgCard.append(bgHead, bgRow, palBox);
  panel.append(bgCard);

  // 2. Selected Element Properties
  const el = activePage().elements[selected];
  if (el) {
    const field = (name, key, val, kind = 'text', onChg = null) => {
      const w = document.createElement('label'); w.className = 'prop-line'; w.textContent = name;
      const inp = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
      if (kind !== 'textarea') inp.type = kind;
      inp.value = val ?? '';
      inp.onchange = () => onChg ? onChg(inp.value) : modify(() => { el[key] = kind === 'number' ? Number(inp.value) : inp.value; });
      w.append(inp); return w;
    };
    const grid = document.createElement('div'); grid.className = 'prop-grid';
    [['X', 'x'], ['Y', 'y'], ['宽', 'w'], ['高', 'h'], ['旋转 °', 'rotation'], ['不透明度', 'opacity']].forEach(([n, k]) => {
      grid.append(field(n, k, k === 'opacity' ? (el[k] ?? 1) : Math.round(el[k] || 0), 'number', v => modify(() => { el[k] = k === 'opacity' ? clamp(+v, 0, 1) : +v; })));
    });
    panel.append(grid);

    if (el.type === 'text') {
      panel.append(field('文字内容', 'text', el.text, 'textarea'));
      panel.append(field('字号 px', 'size', el.size || 44, 'number'));
      const fWrap = document.createElement('label'); fWrap.className = 'prop-line'; fWrap.textContent = '字体';
      const fSel = document.createElement('select');
      [[serif, '宋体 · 文学'], [sans, '黑体 · 清晰'], [hand, '手写楷体'], [eng, 'Georgia 衬线'], [mono, '打字机等宽'], ...installedFonts.map(f => [f.family, f.label])].forEach(([v, l]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = l; fSel.append(o);
      });
      fSel.value = el.family || serif;
      fSel.onchange = () => modify(() => { el.family = fSel.value; });
      fWrap.append(fSel); panel.append(fWrap);
      panel.append(field('文字颜色', 'color', el.color || '#3f312b', 'color'));
      const al = document.createElement('div'); al.className = 'prop-btns';
      [['左对齐', 'left'], ['居中', 'center'], ['右对齐', 'right']].forEach(([s, v]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.onclick = () => modify(() => { el.align = v; }); al.append(b);
      });
      panel.append(al);
    } else if (el.type === 'shape') {
      panel.append(field('填充颜色', 'fill', el.fill || '#e7dfd4', 'color'));
      panel.append(field('圆角 px', 'radius', el.radius || 0, 'number'));
    } else if (el.type === 'image') {
      const b1 = document.createElement('button'); b1.className = 'image-crop-primary'; b1.textContent = '✂ 裁剪 / 移动 / 抠图'; b1.onclick = () => showPhotoEditor('reframe');
      const b2 = document.createElement('button'); b2.className = 'image-frame-primary'; b2.textContent = '✎ 描边 / 形状 / 镜像'; b2.onclick = () => showPhotoEditor('frame');
      const b3 = document.createElement('button'); b3.className = 'image-effect-primary'; b3.textContent = '☀ 调色滤镜 / 纸张阴影'; b3.onclick = () => showPhotoEditor('adjust');
      const bRep = document.createElement('button'); bRep.textContent = '↻ 替换照片'; bRep.onclick = () => $('replacePhotoInput').click();
      panel.append(b1, b2, b3, bRep);
    }

    const acts = document.createElement('div'); acts.className = 'prop-btns';
    [['上移一层', () => { if (selected < activePage().elements.length - 1) modify(() => { const a = activePage().elements; [a[selected], a[selected + 1]] = [a[selected + 1], a[selected]]; selected++; }); }],
     ['下移一层', () => { if (selected > 0) modify(() => { const a = activePage().elements; [a[selected], a[selected - 1]] = [a[selected - 1], a[selected]]; selected--; }); }],
     ['删除', () => { modify(() => { activePage().elements.splice(selected, 1); selected = -1; }); }]].forEach(([s, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.onclick = fn; acts.append(b);
    });
    panel.append(acts);
  }

  // 3. Layer List
  activePage().elements.slice().reverse().forEach((layer, j) => {
    const idx = activePage().elements.length - 1 - j;
    const b = document.createElement('button');
    b.className = 'layer-row' + (idx === selected ? ' active' : '');
    b.textContent = (layer.type === 'text' ? 'T ' + String(layer.text).slice(0, 20) : layer.type === 'image' ? '▣ 图片 / 贴纸' : '◇ 装饰色块');
    b.onclick = () => { selected = idx; redraw(); renderProps(); };
    layers.append(b);
  });
}

function buildPlogLibrary() {
  const host = $('plogLibrary'); host.replaceChildren();
  const sec1 = document.createElement('div'); sec1.className = 'plog-section';
  sec1.innerHTML = '<h4>✦ Plog 文字模板（点击插入）</h4><p>插入后可任意修改文字、字号、字体与颜色</p>';
  const g1 = document.createElement('div'); g1.className = 'plog-chip-grid';
  PLOG_TEXT_PRESETS.forEach(item => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'plog-chip-btn';
    b.innerHTML = `<b>${item.name}</b><small>${item.desc}</small>`;
    b.onclick = () => {
      modify(() => {
        const els = item.make(W(), H());
        activePage().elements.push(...els);
        selected = activePage().elements.length - 1;
      });
      status(`✓ 已插入「${item.name}」`);
    };
    g1.append(b);
  });
  sec1.append(g1);
  host.append(sec1);
}

async function loadOriginalStickers() {
  try {
    const res = await fetch('stickers-index.json');
    if (res.ok) stickerLib = await res.json();
  } catch (e) { console.warn('stickers-index load:', e); }
  renderStickersPanel();
}

function renderStickersPanel() {
  const fBar = $('stickerFolders'), grid = $('stickerGrid');
  if (!fBar || !grid) return;
  fBar.replaceChildren();
  grid.replaceChildren();

  const folders = [
    { id: 'all', name: `全部 (${stickerLib.stickers.length + userStickers.length})` },
    ...(userStickers.length ? [{ id: 'user', name: `我的导入 (${userStickers.length})` }] : []),
    ...stickerLib.folders
  ];
  folders.forEach(f => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sticker-folder-btn' + (activeStickerFolder === f.id ? ' active' : '');
    b.textContent = f.name;
    b.onclick = () => { activeStickerFolder = f.id; renderStickersPanel(); };
    fBar.append(b);
  });

  const q = stickerQuery.trim().toLowerCase();
  const all = [
    ...userStickers.map(s => ({ ...s, folderId: 'user' })),
    ...stickerLib.stickers
  ].filter(s => {
    if (activeStickerFolder !== 'all' && s.folderId !== activeStickerFolder) return false;
    if (q && !(s.name || '').toLowerCase().includes(q)) return false;
    return true;
  });

  all.forEach(st => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sticker-card';
    card.title = st.name;
    card.innerHTML = `<img loading="lazy" src="${st.src}" alt="${st.name}"><span>${st.name}</span>`;
    card.onclick = async () => {
      const img = await getImg(st.src);
      const iw = img?.width || st.w || 240, ih = img?.height || st.h || 240;
      const targetW = clamp(Math.round(Math.min(W() * 0.36, iw)), 80, Math.round(W() * 0.65));
      const targetH = Math.max(40, Math.round(targetW * ih / iw));
      addElement({
        id: uid(), type: 'image', src: st.src,
        x: Math.round((W() - targetW) / 2), y: Math.round((H() - targetH) / 2),
        w: targetW, h: targetH, fit: 'contain',
        crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1
      });
      status(`✓ 已添加素材「${st.name}」`);
    };
    grid.append(card);
  });
}

// --- Canvas Pointer Interaction ---
function locate(e) {
  const b = canvas.getBoundingClientRect();
  return { x: (e.clientX - b.left) * W() / b.width, y: (e.clientY - b.top) * H() / b.height };
}
function hit(p) {
  const arr = activePage().elements;
  if (selected >= 0 && arr[selected]) {
    const t = arr[selected], h = handles(t);
    if (Math.hypot(p.x - h.rot.x, p.y - h.rot.y) < 30) return { mode: 'rotate', idx: selected };
    if (Math.hypot(p.x - h.size.x, p.y - h.size.y) < 34) return { mode: 'size', idx: selected };
    if (t.type === 'image') {
      if (Math.hypot(p.x - h.width.x, p.y - h.width.y) < 30) return { mode: 'width', idx: selected };
      if (Math.hypot(p.x - h.height.x, p.y - h.height.y) < 30) return { mode: 'height', idx: selected };
    }
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    const t = arr[i]; if (t.hidden) continue;
    const q = localPoint(t, p);
    if (q.x >= t.x - 10 && q.x <= t.x + t.w + 10 && q.y >= t.y - 10 && q.y <= t.y + t.h + 10) return { mode: 'move', idx: i };
  }
  return { mode: 'none', idx: -1 };
}

canvas.addEventListener('pointerdown', e => {
  const p = locate(e), found = hit(p);
  if (found.idx < 0) { selected = -1; redrawSync(); renderProps(); return; }
  selected = found.idx;
  snapshot();
  drag = { mode: found.mode, start: p, orig: clone(activePage().elements[selected]) };
  canvas.setPointerCapture(e.pointerId);
  redrawSync(); renderProps();
});
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = locate(e), el = activePage().elements[selected], o = drag.orig;
  if (!el) return;
  if (drag.mode === 'move') {
    el.x = o.x + (p.x - drag.start.x);
    el.y = o.y + (p.y - drag.start.y);
  } else if (drag.mode === 'rotate') {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    el.rotation = Math.round(Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90);
  } else if (drag.mode === 'size') {
    const q = localPoint(o, p), s = Math.max(.15, Math.max((q.x - o.x) / o.w, (q.y - o.y) / o.h));
    el.w = Math.max(40, o.w * s); el.h = Math.max(40, o.h * s);
    if (el.type === 'text') el.size = Math.max(12, Math.round((o.size || 44) * s));
  } else if (drag.mode === 'width') {
    const q = localPoint(o, p); el.w = Math.max(40, q.x - o.x);
  } else if (drag.mode === 'height') {
    const q = localPoint(o, p); el.h = Math.max(40, q.y - o.y);
  }
  redrawSync();
});
canvas.addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null; persist(); updateCurrentThumb(); renderProps();
});
canvas.addEventListener('dblclick', e => {
  const found = hit(locate(e));
  if (found.idx >= 0 && activePage().elements[found.idx]?.type === 'image') {
    selected = found.idx; showPhotoEditor('reframe');
  }
});

// --- Export Current Page ---
async function exportCurrentPage() {
  const btn = $('exportPageBtn'); btn.disabled = true; btn.textContent = '正在生成…';
  try {
    const fmt = $('exportFormat').value === 'jpeg' ? 'jpeg' : 'png';
    const scale = Number($('exportScale').value) || 1;
    await document.fonts.ready.catch(() => {});
    await ensureImages(activePage());
    const out = document.createElement('canvas');
    out.width = Math.round(W() * scale);
    out.height = Math.round(H() * scale);
    paintPage(activePage(), out, scale);
    const blob = await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(Error('生成图片失败')), `image/${fmt}`, fmt === 'jpeg' ? 0.94 : 1));
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    const title = (getActiveProject()?.title || 'Plog').replace(/[\\/:*?"<>|\s]+/g, '_');
    a.href = url; a.download = `${title}_P${current + 1}_${out.width}x${out.height}.${fmt === 'jpeg' ? 'jpg' : 'png'}`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    status(`✓ 已导出当前页（${out.width} × ${out.height} ${fmt.toUpperCase()}）`);
  } catch (err) {
    alert('导出失败：' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '🖼 导出当前页';
  }
}

// --- Custom Font Loader ---
async function registerFontFile(file) {
  const buf = await file.arrayBuffer();
  const fam = 'PlogFont_' + uid();
  const face = new FontFace(fam, buf);
  await face.load();
  document.fonts.add(face);
  installedFonts.push({ family: `'${fam}'`, label: file.name.replace(/\.[^.]+$/, '') });
}

// --- Bindings & Init ---
function bind() {
  $('openProjectsBtn').onclick = showProjectsManager;
  $('addPhoto').onclick = () => $('photoInput').click();
  $('photoInput').onchange = async e => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    for (const file of files) {
      const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
      const img = await getImg(src);
      if (!img) continue;
      const w = Math.min(Math.round(W() * 0.55), img.width), h = Math.round(w * img.height / img.width);
      addElement({ id: uid(), type: 'image', src, x: Math.round((W() - w) / 2), y: Math.round((H() - h) / 2), w, h: Math.min(Math.round(H() * 0.7), h), fit: 'contain', crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 });
    }
  };
  $('replacePhotoInput').onchange = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    const el = activePage().elements[selected];
    if (!file || el?.type !== 'image') return;
    const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    await getImg(src);
    modify(() => { el.src = src; el.crop = { x: 0, y: 0, w: 1, h: 1 }; el.zoom = 1; el.offsetX = 0; el.offsetY = 0; });
  };
  $('addText').onclick = () => addElement(T('写下一句此刻的心情', Math.round(W() * 0.15), Math.round(H() * 0.4), Math.round(W() * 0.7), 90, 48, '#3f312b', serif, { align: 'center' }));
  $('addShape').onclick = () => addElement(S(Math.round(W() * 0.25), Math.round(H() * 0.35), Math.round(W() * 0.5), 260, '#e8dfd3', { radius: 16 }));
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('duplicateEl').onclick = () => {
    const el = activePage().elements[selected]; if (!el) return;
    const copy = clone(el); copy.id = uid(); copy.x += 28; copy.y += 28; addElement(copy);
  };
  $('deleteEl').onclick = () => { if (selected >= 0) modify(() => { activePage().elements.splice(selected, 1); selected = -1; }); };

  $('paperPreset').onchange = e => {
    if (e.target.value === 'custom') return;
    const [w, h] = e.target.value.split('x').map(Number);
    setPaperSize(w, h);
  };
  $('paperW').onchange = () => setPaperSize($('paperW').value, $('paperH').value);
  $('paperH').onchange = () => setPaperSize($('paperW').value, $('paperH').value);

  $('exportPageBtn').onclick = exportCurrentPage;
  $('addPageBtn').onclick = () => { doc.pages.push(blankPage()); current = doc.pages.length - 1; selected = -1; persist(); renderPagesList(); redraw(); renderProps(); };
  $('dupPageBtn').onclick = () => { const c = clone(activePage()); c.elements.forEach(e => e.id = uid()); doc.pages.splice(current + 1, 0, c); current++; selected = -1; persist(); renderPagesList(); redraw(); renderProps(); };
  $('delPageBtn').onclick = () => { if (doc.pages.length <= 1) return alert('至少保留 1 页'); if (!confirm('删除当前页吗？')) return; doc.pages.splice(current, 1); current = Math.max(0, current - 1); selected = -1; persist(); renderPagesList(); redraw(); renderProps(); };

  $('importFont').onclick = () => $('fontInput').click();
  $('fontInput').onchange = async e => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    const saved = (db ? await readDb(FONTS_KEY) : null) || [];
    for (const f of files) { await registerFontFile(f); saved.push(f); }
    if (db) await writeDb(FONTS_KEY, saved);
    renderProps(); status(`✓ 已导入 ${files.length} 款字体`);
  };

  $('exportJsonBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${getActiveProject()?.title || 'Plog'}_备份.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
  $('importJsonBtn').onclick = () => $('jsonInput').click();
  $('jsonInput').onchange = async e => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.pages) || !data.pages.length) throw Error('无效的 Plog 备份文件');
      doc = { width: data.width || 1080, height: data.height || 1440, pages: data.pages };
      current = 0; selected = -1;
      syncPaperSizeUI(); persist(); renderPagesList(); redraw(); renderProps();
      status('✓ 已恢复 Plog 工程备份');
    } catch (err) { alert('导入失败：' + err.message); }
  };

  $('stickerSearch').oninput = e => { stickerQuery = e.target.value; renderStickersPanel(); };
  $('importStickerBtn').onclick = () => $('stickerInput').click();
  $('stickerInput').onchange = async e => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    for (const f of files) {
      const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
      userStickers.unshift({ id: 'u_' + uid(), name: f.name.replace(/\.[^.]+$/, ''), src });
    }
    if (db) await writeDb(STICKERS_KEY, userStickers);
    activeStickerFolder = 'user';
    renderStickersPanel();
    status(`✓ 已导入 ${files.length} 张贴纸到个人素材`);
  };

  document.querySelectorAll('.right-tab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.right-tab').forEach(x => x.classList.toggle('active', x === b));
    $('propsTab').hidden = b.dataset.tab !== 'props';
    $('stickersTab').hidden = b.dataset.tab !== 'stickers';
    $('plogTab').hidden = b.dataset.tab !== 'plog';
  });

  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); $('duplicateEl').click(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (selected >= 0) { e.preventDefault(); $('deleteEl').click(); } }
  });
}

async function init() {
  bind();
  buildPlogLibrary();
  $('projectTitle').textContent = getActiveProject()?.title || '我的 Plog';
  try {
    db = await openDb();
    const saved = await readDb(activeDocKey());
    if (saved?.pages?.length) doc = { width: saved.width || 1080, height: saved.height || 1440, pages: saved.pages };
    const fonts = await readDb(FONTS_KEY);
    if (Array.isArray(fonts)) for (const f of fonts) if (f) await registerFontFile(f).catch(() => {});
    const savedStickers = await readDb(STICKERS_KEY);
    if (Array.isArray(savedStickers)) userStickers = savedStickers;
  } catch (err) {
    console.warn(err);
    status('本机存储不可用，请使用 JSON 备份');
  }
  await loadOriginalStickers();
  syncPaperSizeUI();
  renderPagesList();
  renderProps();
  await redraw();
  dbReady = true;
}

document.addEventListener('DOMContentLoaded', init);
})();
