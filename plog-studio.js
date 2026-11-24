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
const PANEL_KEY = 'plog-panel-widths';

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

const PLOG_ATMOSPHERES = [
  ['none', '无光影叠加'], ['leak-warm', '暖橙胶片漏光'], ['leak-pink', '粉紫梦幻光晕'], ['paper-fold', '纸张折痕做旧'], ['film-grain', '全页胶片颗粒']
];
const PLOG_BLEND_MODES = [
  ['source-over', '正常'],
  ['screen', '滤色（剪影双曝）'],
  ['lighten', '变亮（光斑叠加）'],
  ['multiply', '正片叠底（暗纹）'],
  ['soft-light', '柔光（胶片残影）'],
  ['overlay', '叠加（高对比）']
];
const PLOG_LAYOUTS = [
  { name: '上下双图', desc: '上下均衡双拼', slots: () => [[0.08, 0.06, 0.84, 0.42], [0.08, 0.52, 0.84, 0.42]] },
  { name: '左右双图', desc: '双栏对称留白', slots: () => [[0.06, 0.14, 0.42, 0.72], [0.52, 0.14, 0.42, 0.72]] },
  { name: '三图杂志格', desc: '左大图+右双小图', slots: () => [[0.06, 0.08, 0.50, 0.84], [0.59, 0.08, 0.35, 0.40], [0.59, 0.52, 0.35, 0.40]] },
  { name: '四图田字格', desc: '2×2 整齐四宫格', slots: () => [[0.07, 0.08, 0.41, 0.40], [0.52, 0.08, 0.41, 0.40], [0.07, 0.52, 0.41, 0.40], [0.52, 0.52, 0.41, 0.40]] },
  { name: '拍立得散落墙', desc: '倾斜拍立得拼贴', polaroid: true, slots: () => [[0.08, 0.08, 0.44, 0.46, -5], [0.46, 0.13, 0.45, 0.46, 4], [0.22, 0.48, 0.50, 0.46, -2]] },
  { name: '九宫格 9 图写真', desc: '3×3 独立九格', grid9: true, slots: () => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => [c / 3, r / 3, 1 / 3, 1 / 3])) },
  { name: '九宫格 2×2 主图', desc: '左上大格+5 小格', grid9: true, slots: () => [[0, 0, 2 / 3, 2 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]] },
  { name: '九宫格中排横幅', desc: '中排跨3格+上下6格', grid9: true, slots: () => [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]] },
  { name: '九宫格杂志跨格', desc: '大中小错落跨格拼贴', grid9: true, slots: () => [[0, 0, 1 / 3, 2 / 3], [1 / 3, 0, 2 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 2 / 3], [0, 2 / 3, 2 / 3, 1 / 3]] }
];

const blankPage = () => ({ bg: '#f6f4f0', bgPattern: 'none', atmosphere: 'none', elements: [] });

let db = null, dbReady = false, pendingSave = 0;
let doc = { width: 1080, height: 1440, grid9: false, grid9Gap: 0, pages: [blankPage()] };
let current = 0, selected = -1, selectedIds = new Set(), drag = null;
let snapGuides = [], canvasZoom = 0, spacePan = false, doodleMode = false, doodlePts = null;
let marquee = null, clipboard = [], clipboardSourcePage = -1, pasteBump = 0, pastedViaEvent = false;
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

function selectOnly(idx) {
  selected = idx;
  const el = idx >= 0 ? activePage().elements[idx] : null;
  selectedIds = el ? new Set([el.id]) : new Set();
}
function toggleSelect(idx) {
  const arr = activePage().elements, el = arr[idx];
  if (!el) return;
  if (selectedIds.has(el.id)) {
    selectedIds.delete(el.id);
    if (selected === idx) selected = arr.findIndex(e => selectedIds.has(e.id));
  } else {
    selectedIds.add(el.id);
    selected = idx;
  }
}
function selectedEntries() {
  const arr = activePage().elements;
  return arr.map((el, i) => ({ el, i })).filter(({ el, i }) => selectedIds.has(el.id) || i === selected);
}
function layerLabel(el) {
  if (!el) return '图层';
  if (el.role === 'doodle') return '✎ 自由涂鸦';
  if (el.type === 'text') return 'T ' + String(el.text || '').slice(0, 18);
  if (el.type === 'image') return '▣ 图片 / 贴纸';
  return '◇ 装饰色块';
}
function syncClipboardUI() {
  const btn = $('pasteEl');
  if (!btn) return;
  btn.disabled = !clipboard.length;
  btn.textContent = clipboard.length ? `📋 粘贴 (${clipboard.length})` : '📋 粘贴';
}
function copySelected() {
  const items = selectedEntries();
  if (!items.length) return false;
  clipboard = items.map(x => clone(x.el));
  clipboardSourcePage = current;
  pasteBump = 0;
  syncClipboardUI();
  status(`✓ 已复制 ${clipboard.length} 个图层（可切换任意画布按 Ctrl+V 或点“粘贴”）`);
  return true;
}
function cutSelected() {
  const items = selectedEntries();
  if (!items.length || !copySelected()) return;
  const drop = new Set(items.map(x => x.el.id));
  modify(() => {
    activePage().elements = activePage().elements.filter(e => !drop.has(e.id));
    selectOnly(-1);
  });
  renderPagesList();
  status(`✂ 已剪切 ${items.length} 个图层（可切换任意画布粘贴）`);
}
async function pasteClipboard() {
  if (!clipboard.length) return;
  const samePage = clipboardSourcePage === current;
  if (samePage) pasteBump++;
  const dx = samePage ? 28 * pasteBump : 0;
  const dy = samePage ? 28 * pasteBump : 0;
  const srcs = clipboard.filter(e => e.type === 'image' && e.src).map(e => getImg(e.src));
  if (srcs.length) await Promise.all(srcs);
  modify(() => {
    const nextIds = new Set();
    for (const item of clipboard) {
      const copy = clone(item);
      copy.id = uid();
      copy.locked = false;
      copy.hidden = false;
      copy.x += dx;
      copy.y += dy;
      if (!samePage) {
        copy.x = clamp(copy.x, 0, Math.max(0, W() - Math.min(copy.w, W())));
        copy.y = clamp(copy.y, 0, Math.max(0, H() - Math.min(copy.h, H())));
      }
      activePage().elements.push(copy);
      nextIds.add(copy.id);
    }
    selectedIds = nextIds;
    selected = activePage().elements.length - 1;
  });
  renderPagesList();
  status(`✓ 已粘贴 ${clipboard.length} 个图层到第 ${current + 1} 页`);
}
function selectAllVisible() {
  const arr = activePage().elements;
  const next = new Set();
  let lastIdx = -1;
  arr.forEach((el, i) => {
    if (!el.hidden && !el.locked) { next.add(el.id); lastIdx = i; }
  });
  selectedIds = next;
  selected = lastIdx;
  redrawSync();
  renderProps();
  if (next.size) status(`✓ 已全选当前画布 ${next.size} 个图层`);
}

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
  applyCanvasZoom();
}

function applyCanvasZoom(keepCenter = false) {
  const wrap = canvas.parentElement;
  const stage = wrap?.parentElement;
  const prevRx = stage && stage.scrollWidth ? (stage.scrollLeft + stage.clientWidth / 2) / stage.scrollWidth : 0.5;
  const prevRy = stage && stage.scrollHeight ? (stage.scrollTop + stage.clientHeight / 2) / stage.scrollHeight : 0.5;
  if (!canvasZoom) {
    canvas.classList.remove('zoomed');
    wrap?.classList.remove('zoomed');
    canvas.style.width = '';
    canvas.style.height = '';
    if ($('zoomLabel')) $('zoomLabel').textContent = '适配';
  } else {
    canvas.classList.add('zoomed');
    wrap?.classList.add('zoomed');
    canvas.style.width = Math.round(W() * canvasZoom) + 'px';
    canvas.style.height = Math.round(H() * canvasZoom) + 'px';
    if ($('zoomLabel')) $('zoomLabel').textContent = Math.round(canvasZoom * 100) + '%';
  }
  if (keepCenter && canvasZoom && stage) {
    requestAnimationFrame(() => {
      stage.scrollLeft = Math.max(0, prevRx * stage.scrollWidth - stage.clientWidth / 2);
      stage.scrollTop = Math.max(0, prevRy * stage.scrollHeight - stage.clientHeight / 2);
    });
  }
}

function getGrid9Rects(w, h, gap = 0) {
  const g = clamp(Number(gap) || 0, 0, Math.floor(Math.min(w, h) * 0.08));
  const cw = (w - g * 2) / 3, ch = (h - g * 2) / 3;
  const rects = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      rects.push({ index: r * 3 + c + 1, row: r, col: c, x: c * (cw + g), y: r * (ch + g), w: cw, h: ch });
    }
  }
  return rects;
}

function syncGrid9UI() {
  const on = !!doc.grid9;
  $('grid9Toggle')?.classList.toggle('active', on);
  if ($('grid9Bar')) $('grid9Bar').hidden = !on;
  if ($('grid9GapSel')) $('grid9GapSel').value = String(doc.grid9Gap || 0);
}

function setGrid9Mode(on, ensureSquare = true) {
  doc.grid9 = !!on;
  if (doc.grid9 && ensureSquare && W() !== H()) {
    doc.width = 2400;
    doc.height = 2400;
    syncPaperSizeUI();
    renderPagesList();
  }
  syncGrid9UI();
  persist();
  redraw();
  status(doc.grid9 ? '⊞ 九宫格辅助线已开启：可用 100%/Ctrl+滚轮完整放大，空格拖动平移' : '✓ 已关闭九宫格辅助线');
}

function setDoodleMode(on) {
  doodleMode = !!on;
  $('doodleToggle')?.classList.toggle('active', doodleMode);
  if ($('doodleBar')) $('doodleBar').hidden = !doodleMode;
  canvas.classList.toggle('doodle-cursor', doodleMode);
  if (!doodleMode && doodlePts) { doodlePts = null; redrawSync(); }
  if (doodleMode) status('✏ 画笔已开启：在画布上拖动绘制（完成后点右上角“完成涂鸦”）');
}

function drawDoodleStroke(c, pts, style, color, size, ox = 0, oy = 0) {
  if (!pts || pts.length < 1) return;
  c.save();
  c.translate(-ox, -oy);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (style === 'highlighter') {
    c.globalAlpha = 0.42;
    c.strokeStyle = color;
    c.lineWidth = size * 1.45;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (pts.length === 1) c.lineTo(pts[0][0] + 0.1, pts[0][1]);
    c.stroke();
  } else if (style === 'crayon') {
    c.fillStyle = color;
    let seed = 48271;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const r = Math.max(2, size * 0.5);
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[Math.min(i + 1, pts.length - 1)];
      const dist = Math.max(1, Math.hypot(bx - ax, by - ay));
      const steps = Math.max(1, Math.ceil(dist / 3));
      for (let s = 0; s < steps; s++) {
        const px = ax + (bx - ax) * (s / steps), py = ay + (by - ay) * (s / steps);
        for (let k = 0; k < 5; k++) {
          const ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * r;
          c.globalAlpha = 0.35 + rnd() * 0.45;
          c.fillRect(px + Math.cos(ang) * rad - 1.5, py + Math.sin(ang) * rad - 1.5, 3, 3);
        }
      }
    }
  } else {
    c.strokeStyle = color;
    c.lineWidth = size;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0] + (pts.length === 1 ? 0.1 : 0), last[1]);
    c.stroke();
  }
  c.restore();
}

function setPaperSize(w, h) {
  w = clamp(Math.round(Number(w) || 1080), 300, 6000);
  h = clamp(Math.round(Number(h) || 1440), 300, 8000);
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
  const frameStyle = ['none', 'polaroid', 'film35', 'stamp'].includes(v.frameStyle) ? v.frameStyle : 'none';
  return { shape, radius: num(v.radius, 36, 0, 200), flipX: v.flipX === true, flipY: v.flipY === true, frameStyle, caption: typeof v.caption === 'string' ? v.caption : '' };
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
  const needsBuffer = (sh.enabled && sh.opacity > 0) || (st.enabled && st.width > 0) || fr.frameStyle !== 'none' || adjust.warmth !== 0 || adjust.fade > 0 || adjust.vignette > 0;
  if (!needsBuffer) { c.save(); c.filter = photoFilter(el); drawPlacedImage(c, el, img, x, y); c.restore(); return; }
  const r = cropOf(el), maxSize = 4096, pad = st.enabled && st.width > 0 ? Math.ceil(st.width) : 0;
  const ds = Math.min(Math.max(.25, scale), maxSize / Math.max(1, el.w + pad * 2), maxSize / Math.max(1, el.h + pad * 2));
  const key = [el.w, el.h, el.fit, r.x, r.y, r.w, r.h, el.zoom, el.offsetX, el.offsetY, adjust.brightness, adjust.contrast, adjust.saturation, adjust.warmth, adjust.sepia, adjust.fade, adjust.grayscale, adjust.vignette, adjust.blur, st.enabled ? 1 : 0, st.width, st.color, fr.shape, fr.radius, fr.flipX ? 1 : 0, fr.flipY ? 1 : 0, fr.frameStyle, fr.caption, ds].join('|');
  let item = effectCache.get(el);
  if (item) { effectCache.delete(el); effectCache.set(el, item); }
  if (!item || item.key !== key || item.img !== img) {
    const pw = Math.max(1, Math.round(el.w * ds)), ph = Math.max(1, Math.round(el.h * ds));
    const photoCanvas = document.createElement('canvas'); photoCanvas.width = pw; photoCanvas.height = ph;
    const pg = photoCanvas.getContext('2d'); pg.setTransform(pw / el.w, 0, 0, ph / el.h, 0, 0);
    if (fr.frameStyle === 'polaroid') {
      const m = Math.max(10, el.w * 0.06), bot = Math.max(36, el.h * 0.19), ih = Math.max(20, el.h - m - bot), iw = Math.max(20, el.w - m * 2);
      pg.fillStyle = '#fffdf8'; pg.beginPath(); pg.roundRect(0, 0, el.w, el.h, 8); pg.fill();
      pg.strokeStyle = '#dfd4c6'; pg.lineWidth = 3; pg.stroke();
      const subEl = { ...el, w: iw, h: ih, frame: { ...fr, frameStyle: 'none', shape: 'none' } };
      pg.save(); pg.translate(m, m); pg.filter = photoFilter(el); drawPlacedImage(pg, subEl, img, 0, 0); pg.restore();
      if (fr.caption) {
        pg.fillStyle = '#4e4038';
        pg.font = `${clamp(Math.round(bot * 0.34), 13, 30)}px ${hand}`;
        pg.textAlign = 'center'; pg.textBaseline = 'middle';
        pg.fillText(fr.caption, el.w / 2, m + ih + bot / 2, iw);
      }
    } else if (fr.frameStyle === 'film35') {
      const py = Math.max(28, el.h * 0.13), px = Math.max(10, el.w * 0.04), iw = Math.max(20, el.w - px * 2), ih = Math.max(20, el.h - py * 2);
      pg.fillStyle = '#1b181e'; pg.beginPath(); pg.roundRect(0, 0, el.w, el.h, 6); pg.fill();
      pg.fillStyle = '#f4efe6';
      for (let sx = 18; sx < el.w - 18; sx += 28) {
        pg.beginPath(); pg.roundRect(sx, py * 0.25, 14, Math.max(8, py * 0.45), 3); pg.fill();
        pg.beginPath(); pg.roundRect(sx, el.h - py * 0.70, 14, Math.max(8, py * 0.45), 3); pg.fill();
      }
      const subEl = { ...el, w: iw, h: ih, frame: { ...fr, frameStyle: 'none', shape: 'none' } };
      pg.save(); pg.translate(px, py); pg.filter = photoFilter(el); drawPlacedImage(pg, subEl, img, 0, 0); pg.restore();
      pg.fillStyle = '#e6b25c'; pg.font = `bold ${clamp(Math.round(py * 0.3), 10, 18)}px ${mono}`;
      pg.textAlign = 'right'; pg.textBaseline = 'middle';
      pg.fillText('35MM · 24A', el.w - px - 6, el.h - py * 0.15);
    } else if (fr.frameStyle === 'stamp') {
      const m = Math.max(14, Math.min(el.w, el.h) * 0.075), iw = Math.max(20, el.w - m * 2), ih = Math.max(20, el.h - m * 2);
      pg.fillStyle = '#fffdf8'; pg.fillRect(0, 0, el.w, el.h);
      const subEl = { ...el, w: iw, h: ih, frame: { ...fr, frameStyle: 'none', shape: 'none' } };
      pg.save(); pg.translate(m, m); pg.filter = photoFilter(el); drawPlacedImage(pg, subEl, img, 0, 0); pg.restore();
      pg.save(); pg.globalCompositeOperation = 'destination-out';
      const step = 22, nr = 7;
      for (let sx = step / 2; sx < el.w; sx += step) {
        pg.beginPath(); pg.arc(sx, 0, nr, 0, Math.PI * 2); pg.fill();
        pg.beginPath(); pg.arc(sx, el.h, nr, 0, Math.PI * 2); pg.fill();
      }
      for (let sy = step / 2; sy < el.h; sy += step) {
        pg.beginPath(); pg.arc(0, sy, nr, 0, Math.PI * 2); pg.fill();
        pg.beginPath(); pg.arc(el.w, sy, nr, 0, Math.PI * 2); pg.fill();
      }
      pg.restore();
    } else {
      pg.filter = photoFilter(el); drawPlacedImage(pg, el, img, 0, 0); pg.filter = 'none';
    }
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
function linesOf(c, text, maxWidth, spacing = 0) {
  const result = [];
  const widthOf = str => {
    if (!spacing) return c.measureText(str).width;
    const chs = Array.from(str);
    return chs.reduce((sum, ch) => sum + c.measureText(ch).width, 0) + Math.max(0, chs.length - 1) * spacing;
  };
  for (const para of String(text || '').split('\n')) {
    if (!para) { result.push(''); continue; }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (widthOf(test) > maxWidth && line) { result.push(line); line = ch; }
      else line = test;
    }
    result.push(line);
  }
  return result;
}

function drawAtmosphere(c, atmo, w, h) {
  if (!atmo || atmo === 'none') return;
  c.save();
  if (atmo === 'leak-warm') {
    c.globalCompositeOperation = 'screen';
    const g1 = c.createRadialGradient(w * 0.08, h * 0.14, 10, w * 0.18, h * 0.25, Math.max(w, h) * 0.72);
    g1.addColorStop(0, 'rgba(255, 166, 92, 0.46)');
    g1.addColorStop(0.45, 'rgba(255, 98, 52, 0.22)');
    g1.addColorStop(1, 'rgba(255, 80, 30, 0)');
    c.fillStyle = g1;
    c.fillRect(0, 0, w, h);
    const g2 = c.createRadialGradient(w * 0.96, h * 0.88, 10, w * 0.85, h * 0.82, Math.max(w, h) * 0.48);
    g2.addColorStop(0, 'rgba(255, 198, 118, 0.32)');
    g2.addColorStop(1, 'rgba(255, 130, 60, 0)');
    c.fillStyle = g2;
    c.fillRect(0, 0, w, h);
  } else if (atmo === 'leak-pink') {
    c.globalCompositeOperation = 'screen';
    const g1 = c.createRadialGradient(w * 0.88, h * 0.16, 12, w * 0.78, h * 0.22, Math.max(w, h) * 0.65);
    g1.addColorStop(0, 'rgba(246, 132, 186, 0.42)');
    g1.addColorStop(0.55, 'rgba(182, 132, 245, 0.18)');
    g1.addColorStop(1, 'rgba(182, 132, 245, 0)');
    c.fillStyle = g1;
    c.fillRect(0, 0, w, h);
    const g2 = c.createRadialGradient(w * 0.1, h * 0.86, 10, w * 0.18, h * 0.78, Math.max(w, h) * 0.55);
    g2.addColorStop(0, 'rgba(148, 178, 255, 0.28)');
    g2.addColorStop(1, 'rgba(148, 178, 255, 0)');
    c.fillStyle = g2;
    c.fillRect(0, 0, w, h);
  } else if (atmo === 'paper-fold') {
    const fold = (x1, y1, x2, y2, nx, ny) => {
      c.strokeStyle = 'rgba(72, 54, 40, 0.10)';
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = 'rgba(255, 255, 255, 0.24)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x1 + nx * 3, y1 + ny * 3); c.lineTo(x2 + nx * 3, y2 + ny * 3); c.stroke();
    };
    fold(0, h * 0.5, w, h * 0.5, 0, 1);
    fold(w * 0.5, 0, w * 0.5, h, 1, 0);
    const edge = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.hypot(w, h) * 0.58);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(84, 62, 42, 0.14)');
    c.fillStyle = edge;
    c.fillRect(0, 0, w, h);
  } else if (atmo === 'film-grain') {
    let seed = 9187;
    for (let i = 0; i < 3600; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; const gx = seed % w;
      seed = (seed * 1664525 + 1013904223) >>> 0; const gy = seed % h;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      c.fillStyle = (seed & 1) ? 'rgba(255,250,240,0.09)' : 'rgba(35,28,24,0.09)';
      c.fillRect(gx, gy, 2, 2);
    }
    const vig = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(20, 14, 12, 0.24)');
    c.fillStyle = vig;
    c.fillRect(0, 0, w, h);
  }
  c.restore();
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
    c.globalCompositeOperation = el.blend || 'source-over';
    const x = -el.w / 2, y = -el.h / 2;
    if (el.type === 'text') {
      const size = el.size || 44;
      const padX = el.bgColor && el.bgColor !== 'transparent' ? 14 : 0;
      const maxW = Math.max(20, el.w - padX * 2);
      const lhMul = clamp(Number(el.lineHeight) || 1.33, 0.9, 2.5);
      const letterSp = clamp(Number(el.letterSpacing) || 0, -4, 30);
      const sw = clamp(Number(el.strokeWidth) || 0, 0, 20);
      const strokeCol = el.strokeColor || '#ffffff';

      if (el.bgColor && el.bgColor !== 'transparent') {
        const br = clamp(Number(el.bgRadius ?? 18), 0, Math.min(el.w, el.h) / 2);
        c.fillStyle = el.bgColor;
        c.beginPath();
        c.roundRect(x, y, el.w, el.h, br);
        c.fill();
      }

      c.font = `${el.weight || 'normal'} ${size}px ${el.family || serif}`;
      c.textBaseline = 'top';
      c.fillStyle = el.color || '#3f312b';

      const applyShadow = on => {
        if (on && el.textShadow) {
          c.shadowColor = 'rgba(28, 20, 18, 0.34)';
          c.shadowBlur = Math.max(4, Math.round(size * 0.22));
          c.shadowOffsetX = 0;
          c.shadowOffsetY = Math.max(2, Math.round(size * 0.08));
        } else {
          c.shadowColor = 'transparent';
          c.shadowBlur = 0;
          c.shadowOffsetX = 0;
          c.shadowOffsetY = 0;
        }
      };

      const renderStr = (str, px, py, strokePass) => {
        if (strokePass) {
          c.lineJoin = 'round';
          c.miterLimit = 2;
          c.lineWidth = sw * 2;
          c.strokeStyle = strokeCol;
          c.strokeText(str, px, py);
        } else {
          c.fillText(str, px, py);
        }
      };

      if (el.vertical) {
        const colStep = size * lhMul;
        const charStep = size * 1.08 + letterSp;
        const cols = [];
        for (const para of String(el.text || '').split('\n')) {
          const chs = Array.from(para);
          if (!chs.length) { cols.push([]); continue; }
          let curCol = [];
          for (const ch of chs) {
            if (curCol.length * charStep + size > el.h - 4 && curCol.length) {
              cols.push(curCol);
              curCol = [ch];
            } else {
              curCol.push(ch);
            }
          }
          cols.push(curCol);
        }
        const totalW = cols.length * colStep;
        const align = el.align || 'right';
        let startColX = align === 'left'
          ? x + padX + (cols.length - 1) * colStep + colStep / 2
          : align === 'center'
            ? (totalW / 2) - colStep / 2
            : x + el.w - padX - colStep / 2;
        c.textAlign = 'center';
        const drawVert = strokePass => {
          applyShadow(strokePass || sw === 0);
          cols.forEach((col, ci) => {
            const cx = startColX - ci * colStep;
            if (cx < x - colStep || cx > x + el.w + colStep) return;
            col.forEach((ch, ri) => {
              const cy = y + 4 + ri * charStep;
              if (cy + size <= y + el.h + charStep * 0.4) renderStr(ch, cx, cy, strokePass);
            });
          });
        };
        if (sw > 0) drawVert(true);
        drawVert(false);
        applyShadow(false);
      } else {
        const align = el.align || 'left';
        const lines = linesOf(c, el.text, maxW, letterSp), lh = size * lhMul;
        const visH = Math.max(size, (lines.length - 1) * lh + size);
        const startY = el.bgColor && el.bgColor !== 'transparent' ? y + Math.max(0, Math.round((el.h - visH) / 2)) : y;
        const drawHoriz = strokePass => {
          applyShadow(strokePass || sw === 0);
          lines.forEach((line, i) => {
            const ly = startY + i * lh;
            if (ly - y + size > el.h + lh / 2) return;
            if (!letterSp) {
              c.textAlign = align;
              const lx = align === 'center' ? 0 : align === 'right' ? el.w / 2 - padX : -el.w / 2 + padX;
              renderStr(line, lx, ly, strokePass);
            } else {
              c.textAlign = 'left';
              const chs = Array.from(line);
              const widths = chs.map(ch => c.measureText(ch).width);
              const totalLineW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chs.length - 1) * letterSp;
              let cx = align === 'center' ? -totalLineW / 2 : align === 'right' ? el.w / 2 - padX - totalLineW : -el.w / 2 + padX;
              chs.forEach((ch, idx) => {
                renderStr(ch, cx, ly, strokePass);
                cx += widths[idx] + letterSp;
              });
            }
          });
        };
        if (sw > 0) drawHoriz(true);
        drawHoriz(false);
        applyShadow(false);
      }
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
  drawAtmosphere(c, page.atmosphere, w, h);
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

function paintGrid9Overlay() {
  if (!doc.grid9) return;
  const w = W(), h = H(), g = Number(doc.grid9Gap) || 0;
  const rects = getGrid9Rects(w, h, g);
  ctx.save();
  if (g > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    const x1 = rects[0].x + rects[0].w, x2 = rects[1].x + rects[1].w;
    const y1 = rects[0].y + rects[0].h, y2 = rects[3].y + rects[3].h;
    ctx.fillRect(x1, 0, rects[1].x - x1, h);
    ctx.fillRect(x2, 0, rects[2].x - x2, h);
    ctx.fillRect(0, y1, w, rects[3].y - y1);
    ctx.fillRect(0, y2, w, rects[6].y - y2);
  }
  ctx.strokeStyle = 'rgba(108, 70, 124, 0.68)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  for (const r of rects) ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const r of rects) {
    const bx = r.x + 14, by = r.y + 14;
    ctx.fillStyle = 'rgba(48, 33, 60, 0.72)';
    ctx.beginPath(); ctx.roundRect(bx, by, 30, 30, 15); ctx.fill();
    ctx.fillStyle = '#ffefc9';
    ctx.fillText(String(r.index), bx + 15, by + 16);
  }
  ctx.restore();
}

function paintSelection() {
  paintGrid9Overlay();
  if (snapGuides.length) {
    ctx.save();
    ctx.strokeStyle = '#e24c7a';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    for (const g of snapGuides) {
      ctx.beginPath();
      if (g.axis === 'x') { ctx.moveTo(g.pos, 0); ctx.lineTo(g.pos, H()); }
      else { ctx.moveTo(0, g.pos); ctx.lineTo(W(), g.pos); }
      ctx.stroke();
    }
    ctx.restore();
  }

  const entries = selectedEntries();
  for (const { el, i } of entries) {
    if (i === selected) continue;
    ctx.save();
    ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
    ctx.rotate((el.rotation || 0) * Math.PI / 180);
    ctx.strokeStyle = '#9b78b3';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
    ctx.restore();
  }

  const el = activePage().elements[selected];
  if (!el) return;
  const h = handles(el);
  ctx.save();
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  ctx.rotate((el.rotation || 0) * Math.PI / 180);
  ctx.strokeStyle = el.locked ? '#9a8e87' : '#6c467c';
  ctx.lineWidth = 3;
  if (el.locked) ctx.setLineDash([8, 6]);
  ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
  if (!el.locked) {
    ctx.beginPath(); ctx.moveTo(0, -el.h / 2); ctx.lineTo(0, -el.h / 2 - 46); ctx.stroke();
  }
  ctx.restore();
  if (el.locked) return;

  const dot = (pt, fill, r = 10) => {
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  };
  dot(h.rot, '#b38b4d', 10);
  dot(h.size, '#d94862', 11);
  if (el.type === 'image') { dot(h.width, '#6c467c', 9); dot(h.height, '#6c467c', 9); }
}

function paintMarquee() {
  if (!marquee) return;
  const x = Math.min(marquee.x0, marquee.x1), y = Math.min(marquee.y0, marquee.y1);
  const w = Math.abs(marquee.x1 - marquee.x0), h = Math.abs(marquee.y1 - marquee.y0);
  if (w < 2 && h < 2) return;
  ctx.save();
  ctx.fillStyle = 'rgba(108, 70, 124, 0.14)';
  ctx.strokeStyle = '#6c467c';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
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
  paintMarquee();
  if (doodlePts && doodlePts.length) {
    const style = $('doodleType')?.value || 'marker';
    const color = $('doodleColor')?.value || '#3f312b';
    const size = Number($('doodleSize')?.value || 10);
    drawDoodleStroke(ctx, doodlePts, style, color, size, 0, 0);
  }
}

function snapshot() {
  undoStack.push(clone(activePage()));
  if (undoStack.length > 35) undoStack.shift();
  redoStack = [];
}
function modify(fn) {
  snapshot();
  fn();
  const arr = activePage().elements;
  if (selected >= arr.length) selectOnly(arr.length - 1);
  persist();
  redraw();
  renderProps();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(clone(activePage()));
  doc.pages[current] = undoStack.pop();
  selectOnly(-1);
  persist(); redraw(); renderProps();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(clone(activePage()));
  doc.pages[current] = redoStack.pop();
  selectOnly(-1);
  persist(); redraw(); renderProps();
}

function addElement(el) {
  modify(() => {
    activePage().elements.push(el);
    selectOnly(activePage().elements.length - 1);
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
       <strong class="pe-title">相框样式、形状与镜像</strong>
       <label>相框风格<select data-frame="style"><option value="none">无额外相框</option><option value="polaroid">拍立得经典白边</option><option value="film35">35mm 复古胶片</option><option value="stamp">邮票锯齿白框</option></select></label>
       <label class="pe-caption-row">拍立得手写附言<input type="text" data-frame="caption" placeholder="例如：2026.11 晴 · 今日光影"></label>
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
       <div class="photo-edit-buttons"><button data-action="four-corners">✨ 清除四角</button><button data-action="mat-undo">↶ 撤销</button><button data-action="mat-reset">还原</button><button type="button" data-action="mat-save-sticker">★ 存为我的贴纸</button></div>
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
      qa('[data-frame="style"]').value = draft.frame.frameStyle || 'none';
      qa('[data-frame="caption"]').value = draft.frame.caption || '';
      qa('.pe-caption-row').hidden = (draft.frame.frameStyle || 'none') !== 'polaroid';
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
    qa('[data-frame="style"]').addEventListener('change', e => { draft.frame.frameStyle = e.target.value; syncFrameInputs(); draw(); });
    qa('[data-frame="caption"]').addEventListener('input', e => { draft.frame.caption = e.target.value; draw(); });
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
    byAction('reset-all').onclick = () => { draft.crop = { x: 0, y: 0, w: 1, h: 1 }; draft.fit = 'contain'; draft.zoom = 1; draft.offsetX = 0; draft.offsetY = 0; applyPreset({}); draft.stroke = { enabled: false, width: 14, color: '#ffffff' }; draft.frame = { shape: 'none', radius: 36, flipX: false, flipY: false, frameStyle: 'none', caption: '' }; draft.shadow = { enabled: false, blur: 15, x: 5, y: 9, opacity: .28, color: '#32263c' }; syncFrameInputs(); draw(); };
    byAction('four-corners').onclick = () => { setupMatte(); stashMask(); const t = +qa('[data-field="tolerance"]').value; for (const [x, y] of [[1, 1], [matte.w - 2, 1], [1, matte.h - 2], [matte.w - 2, matte.h - 2]]) colorFlood(x, y, t); paintMatte(); draw(); };
    byAction('mat-undo').onclick = () => { if (!matte || !matHistory.length) return; matte.removed = matHistory.pop(); paintMatte(); draw(); };
    byAction('mat-reset').onclick = () => { if (!matte) return; stashMask(); matte.removed.fill(0); paintMatte(); draw(); };
    byAction('mat-save-sticker').onclick = async () => {
      setupMatte();
      const src = matWork.toDataURL('image/png');
      const stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
      userStickers.unshift({ id: 'u_' + uid(), name: '抠图贴纸 ' + stamp, src });
      if (db) await writeDb(STICKERS_KEY, userStickers);
      activeStickerFolder = 'user';
      renderStickersPanel();
      status('★ 已保存到「我的导入」贴纸库，可随时复用');
    };
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
      <label>画纸尺寸<select data-new-size><option value="1080x1440" selected>小红书 3:4 (1080×1440)</option><option value="1080x1920">手机长图 9:16 (1080×1920)</option><option value="1800x1800">九宫格拼图 1:1 (1800×1800)</option><option value="2400x2400">九宫格超清 1:1 (2400×2400)</option><option value="3600x3600">九宫格巨幅 1:1 (3600×3600)</option><option value="2400x3200">超大画布 3:4 (2400×3200)</option><option value="1200x1200">正方形 1:1 (1200×1200)</option><option value="1440x1080">横版 4:3 (1440×1080)</option></select></label>
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
    const newDoc = { width: w || 1080, height: h || 1440, grid9: w === 1800 && h === 1800, grid9Gap: 0, pages: [blankPage()] };
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
  if ($('pageLabel')) $('pageLabel').textContent = `第 ${current + 1} 页`;
  doc.pages.forEach((pg, i) => {
    const btn = document.createElement('button');
    btn.className = 'page-item' + (i === current ? ' active' : '');
    const thumb = document.createElement('canvas');
    thumb.width = 92; thumb.height = Math.round(92 * H() / W());
    thumb.dataset.page = i;
    const info = document.createElement('div');
    info.innerHTML = `<span>第 ${i + 1} 页</span><small>${pg.elements.length} 个元素</small>`;
    btn.append(thumb, info);
    btn.onclick = () => { current = i; selectOnly(-1); undoStack = []; redoStack = []; $('pageLabel').textContent = `第 ${i + 1} 页`; renderPagesList(); redraw(); renderProps(); };
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
  bgAll.onclick = () => { modify(() => { const bg = activePage().bg, pat = activePage().bgPattern, atmo = activePage().atmosphere || 'none'; doc.pages.forEach(p => { p.bg = bg; p.bgPattern = pat; p.atmosphere = atmo; }); }); status('✓ 已应用到全部页'); };
  bgHead.append(bgAll);

  const bgRow = document.createElement('div'); bgRow.className = 'plog-bg-row';
  const bgPick = document.createElement('input'); bgPick.type = 'color'; bgPick.value = activePage().bg || '#f6f4f0';
  bgPick.oninput = e => { activePage().bg = e.target.value; redrawSync(); };
  bgPick.onchange = e => { const v = e.target.value; modify(() => { activePage().bg = v; }); };
  const patSel = document.createElement('select');
  PLOG_BG_PATTERNS.forEach(([v, lbl]) => { const o = document.createElement('option'); o.value = v; o.textContent = lbl; patSel.append(o); });
  patSel.value = activePage().bgPattern || 'none';
  patSel.onchange = () => modify(() => { activePage().bgPattern = patSel.value; });
  const atmoSel = document.createElement('select');
  PLOG_ATMOSPHERES.forEach(([v, lbl]) => { const o = document.createElement('option'); o.value = v; o.textContent = lbl; atmoSel.append(o); });
  atmoSel.value = activePage().atmosphere || 'none';
  atmoSel.onchange = () => modify(() => { activePage().atmosphere = atmoSel.value; });
  bgRow.append(bgPick, patSel, atmoSel);

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

  // 2. Multi-Select Batch Card & Selected Element Properties
  const multiItems = selectedEntries();
  if (multiItems.length > 1) {
    const mCard = document.createElement('div'); mCard.className = 'plog-card multi-card';
    mCard.innerHTML = `<div class="plog-card-head"><strong>✦ 已选中 ${multiItems.length} 个图层 · 批量操作</strong></div>`;
    const alignRow = document.createElement('div'); alignRow.className = 'prop-btns';
    const alignGroup = mode => {
      const unlocked = multiItems.map(x => x.el).filter(e => !e.locked);
      if (!unlocked.length) return;
      const minX = Math.min(...unlocked.map(e => e.x)), maxX = Math.max(...unlocked.map(e => e.x + e.w));
      const minY = Math.min(...unlocked.map(e => e.y)), maxY = Math.max(...unlocked.map(e => e.y + e.h));
      const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
      modify(() => {
        for (const it of unlocked) {
          if (mode === 'left') it.x = minX;
          else if (mode === 'cx') it.x = midX - it.w / 2;
          else if (mode === 'right') it.x = maxX - it.w;
          else if (mode === 'top') it.y = minY;
          else if (mode === 'cy') it.y = midY - it.h / 2;
          else if (mode === 'bottom') it.y = maxY - it.h;
        }
      });
    };
    [['左对齐', 'left'], ['水平居中', 'cx'], ['右对齐', 'right'], ['顶对齐', 'top'], ['垂直居中', 'cy'], ['底对齐', 'bottom']].forEach(([lbl, m]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = lbl; b.onclick = () => alignGroup(m); alignRow.append(b);
    });

    const tRow = document.createElement('div'); tRow.className = 'multi-transfer-row';
    const tSel = document.createElement('select');
    doc.pages.forEach((_, idx) => {
      if (idx === current) return;
      const o = document.createElement('option'); o.value = String(idx); o.textContent = `第 ${idx + 1} 页`; tSel.append(o);
    });
    const newOpt = document.createElement('option'); newOpt.value = '__new__'; newOpt.textContent = '＋ 新建画布'; tSel.append(newOpt);
    const transfer = move => {
      const val = tSel.value;
      const ids = new Set(multiItems.map(x => x.el.id));
      let dstIdx = val === '__new__' ? doc.pages.length : Number(val);
      if (val === '__new__') doc.pages.push(blankPage());
      const dst = doc.pages[dstIdx];
      if (!dst) return;
      const copies = multiItems.map(x => {
        const c = clone(x.el);
        c.id = uid(); c.locked = false;
        c.x = clamp(c.x, 0, Math.max(0, W() - Math.min(c.w, W())));
        c.y = clamp(c.y, 0, Math.max(0, H() - Math.min(c.h, H())));
        return c;
      });
      dst.elements.push(...copies);
      if (move) {
        snapshot();
        activePage().elements = activePage().elements.filter(e => !ids.has(e.id));
        selectOnly(-1);
        persist();
      } else {
        if (db) persist();
      }
      current = dstIdx;
      selectedIds = new Set(copies.map(c => c.id));
      selected = dst.elements.length - 1;
      $('pageLabel').textContent = `第 ${current + 1} 页`;
      renderPagesList(); redraw(); renderProps();
      status(`${move ? '✂ 已移动' : '⧉ 已复制'} ${copies.length} 个图层到第 ${current + 1} 页`);
    };
    const bCopyTo = document.createElement('button'); bCopyTo.type = 'button'; bCopyTo.textContent = '复制到该画布'; bCopyTo.onclick = () => transfer(false);
    const bMoveTo = document.createElement('button'); bMoveTo.type = 'button'; bMoveTo.textContent = '移动到该画布'; bMoveTo.onclick = () => transfer(true);
    tRow.append(tSel, bCopyTo, bMoveTo);

    const bActRow = document.createElement('div'); bActRow.className = 'prop-btns';
    const bCp = document.createElement('button'); bCp.type = 'button'; bCp.textContent = '⧉ 复制 (Ctrl+C)'; bCp.onclick = copySelected;
    const bCt = document.createElement('button'); bCt.type = 'button'; bCt.textContent = '✂ 剪切 (Ctrl+X)'; bCt.onclick = cutSelected;
    const bDl = document.createElement('button'); bDl.type = 'button'; bDl.textContent = '⌫ 批量删除'; bDl.onclick = () => $('deleteEl').click();
    bActRow.append(bCp, bCt, bDl);
    mCard.append(alignRow, tRow, bActRow);
    panel.append(mCard);
  }

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

    const bWrap = document.createElement('label'); bWrap.className = 'prop-line'; bWrap.textContent = '图层混合模式（双重曝光可用「滤色 / 柔光」）';
    const bSel = document.createElement('select');
    PLOG_BLEND_MODES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; bSel.append(o); });
    bSel.value = el.blend || 'source-over';
    bSel.onchange = () => modify(() => { el.blend = bSel.value; });
    bWrap.append(bSel); panel.append(bWrap);

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

      const styleRow = document.createElement('div'); styleRow.className = 'prop-btns';
      [
        ['白边手账字', () => modify(() => { el.strokeWidth = 6; el.strokeColor = '#ffffff'; el.bgColor = ''; el.textShadow = true; })],
        ['胶囊标签字', () => modify(() => { el.bgColor = '#ffeaa0'; el.bgRadius = Math.round((el.h || 60) / 2); el.strokeWidth = 0; el.color = '#3f312b'; el.align = 'center'; })],
        ['复古竖排字', () => modify(() => { el.vertical = !el.vertical; if (el.vertical && el.w > el.h) { const nw = Math.max(90, Math.round(el.w * 0.42)); el.h = Math.max(260, el.w); el.w = nw; } })],
        ['杂志宽字距', () => modify(() => { el.letterSpacing = 8; el.lineHeight = 1.6; el.strokeWidth = 0; el.bgColor = ''; })]
      ].forEach(([lbl, fn]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = lbl; b.onclick = fn; styleRow.append(b);
      });
      panel.append(styleRow);

      const richGrid = document.createElement('div'); richGrid.className = 'prop-grid';
      const swWrap = field('文字描边 px', 'strokeWidth', el.strokeWidth || 0, 'number', v => modify(() => { el.strokeWidth = clamp(+v, 0, 20); }));
      const scWrap = field('描边颜色', 'strokeColor', el.strokeColor || '#ffffff', 'color');
      const lsWrap = field('字距 px', 'letterSpacing', el.letterSpacing || 0, 'number', v => modify(() => { el.letterSpacing = clamp(+v, -4, 30); }));
      const lhWrap = field('行距倍', 'lineHeight', el.lineHeight || 1.33, 'number', v => modify(() => { el.lineHeight = clamp(+v, 0.9, 2.5); }));
      lhWrap.querySelector('input').step = '0.05';
      richGrid.append(swWrap, scWrap, lsWrap, lhWrap);
      panel.append(richGrid);

      const mkCheck = (text, checked, onChange) => {
        const lb = document.createElement('label'); lb.className = 'prop-check';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!checked;
        cb.onchange = () => onChange(cb.checked);
        lb.append(cb, document.createTextNode(text));
        return lb;
      };
      const chkGrid = document.createElement('div'); chkGrid.className = 'prop-grid';
      chkGrid.append(
        mkCheck('开启文字投影', el.textShadow, v => modify(() => { el.textShadow = v; })),
        mkCheck('竖排书写', el.vertical, v => modify(() => { el.vertical = v; }))
      );
      panel.append(chkGrid);

      const bgWrap = document.createElement('div'); bgWrap.className = 'prop-grid';
      const hasBg = !!(el.bgColor && el.bgColor !== 'transparent');
      bgWrap.append(mkCheck('文字背景胶囊', hasBg, v => modify(() => { el.bgColor = v ? (el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : '#ffeaa0') : ''; el.bgRadius = el.bgRadius ?? 22; })));
      if (hasBg) bgWrap.append(field('底色选择', 'bgColor', el.bgColor || '#ffeaa0', 'color'));
      panel.append(bgWrap);
    } else if (el.type === 'shape') {
      panel.append(field('填充颜色', 'fill', el.fill || '#e7dfd4', 'color'));
      panel.append(field('圆角 px', 'radius', el.radius || 0, 'number'));
    } else if (el.type === 'image') {
      const b1 = document.createElement('button'); b1.className = 'image-crop-primary'; b1.textContent = '✂ 裁剪 / 移动 / 抠图'; b1.onclick = () => showPhotoEditor('reframe');
      const b2 = document.createElement('button'); b2.className = 'image-frame-primary'; b2.textContent = '✎ 描边 / 形状 / 镜像'; b2.onclick = () => showPhotoEditor('frame');
      const b3 = document.createElement('button'); b3.className = 'image-effect-primary'; b3.textContent = '☀ 调色滤镜 / 纸张阴影'; b3.onclick = () => showPhotoEditor('adjust');
      const bRep = document.createElement('button'); bRep.textContent = '↻ 替换照片'; bRep.onclick = () => $('replacePhotoInput').click();
      panel.append(b1, b2, b3, bRep);

      const curFr = imageFrame(el);
      const frRow = document.createElement('div'); frRow.className = 'frame-quick-row';
      [['none', '无框'], ['polaroid', '拍立得'], ['film35', '35mm'], ['stamp', '邮票框']].forEach(([styleKey, lbl]) => {
        const fb = document.createElement('button'); fb.type = 'button'; fb.textContent = lbl;
        if (curFr.frameStyle === styleKey) fb.classList.add('active');
        fb.onclick = () => modify(() => { el.frame = { ...imageFrame(el), frameStyle: styleKey }; });
        frRow.append(fb);
      });
      panel.append(frRow);
      if (curFr.frameStyle === 'polaroid') {
        panel.append(field('拍立得手写附言', 'caption', curFr.caption || '', 'text', val => modify(() => { el.frame = { ...imageFrame(el), caption: val }; })));
      }
    }

    const acts = document.createElement('div'); acts.className = 'prop-btns';
    [['上移一层', () => { if (selected < activePage().elements.length - 1) modify(() => { const a = activePage().elements; [a[selected], a[selected + 1]] = [a[selected + 1], a[selected]]; selected++; }); }],
     ['下移一层', () => { if (selected > 0) modify(() => { const a = activePage().elements; [a[selected], a[selected - 1]] = [a[selected - 1], a[selected]]; selected--; }); }],
     ['删除', () => { modify(() => { activePage().elements.splice(selected, 1); selectOnly(-1); }); }]].forEach(([s, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.onclick = fn; acts.append(b);
    });
    panel.append(acts);
  }

  // 3. Layer List
  activePage().elements.slice().reverse().forEach((layer, j) => {
    const idx = activePage().elements.length - 1 - j;
    const item = document.createElement('div'); item.className = 'layer-item';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layer-row' + (selectedIds.has(layer.id) || idx === selected ? ' active' : '');
    const title = layer.role === 'doodle' ? '✎ 自由涂鸦' : layer.type === 'text' ? 'T ' + String(layer.text).slice(0, 18) : layer.type === 'image' ? '▣ 图片 / 贴纸' : '◇ 装饰色块';
    b.textContent = (layer.hidden ? '[隐藏] ' : '') + title;
    b.onclick = e => {
      if (e.shiftKey) toggleSelect(idx);
      else selectOnly(idx);
      redraw(); renderProps();
    };
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'layer-icon-btn' + (layer.hidden ? '' : ' on');
    eye.title = layer.hidden ? '显示图层' : '隐藏图层';
    eye.textContent = layer.hidden ? '◌' : '👁';
    eye.onclick = () => modify(() => { layer.hidden = !layer.hidden; });
    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'layer-icon-btn' + (layer.locked ? ' on' : '');
    lock.title = layer.locked ? '解锁图层' : '锁定图层';
    lock.textContent = layer.locked ? '🔒' : '🔓';
    lock.onclick = () => modify(() => { layer.locked = !layer.locked; });
    item.append(b, eye, lock);
    layers.append(item);
  });
}

function buildPlogLibrary() {
  const host = $('plogLibrary'); host.replaceChildren();
  const sec0 = document.createElement('div'); sec0.className = 'plog-section';
  sec0.innerHTML = '<h4>⊞ 一键拼图布局（照片网格）</h4><p>点击套用常见杂志/拍立得照片网格，已有照片会自动排入格子</p>';
  const g0 = document.createElement('div'); g0.className = 'plog-chip-grid';
  PLOG_LAYOUTS.forEach(lay => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'plog-chip-btn';
    b.innerHTML = `<b>${lay.name}</b><small>${lay.desc}</small>`;
    b.onclick = () => {
      if (lay.grid9) setGrid9Mode(true, true);
      const pw = W(), ph = H();
      const slots = lay.slots(pw, ph);
      modify(() => {
        const pg = activePage();
        const existingPhotos = pg.elements.filter(e => e.type === 'image' && e.role !== 'doodle' && e.role !== 'slot' && !String(e.src || '').startsWith('stickers/'));
        const keptOthers = pg.elements.filter(e => !(e.type === 'image' && (e.role === 'slot' || existingPhotos.includes(e))));
        const nextPhotos = slots.map(([rx, ry, rw, rh, rot = 0], idx) => {
          const x = Math.round(pw * rx), y = Math.round(ph * ry), w = Math.round(pw * rw), h = Math.round(ph * rh);
          const reused = existingPhotos[idx];
          if (reused) {
            reused.x = x; reused.y = y; reused.w = w; reused.h = h;
            reused.rotation = rot; reused.fit = 'cover';
            reused.frame = { ...imageFrame(reused), frameStyle: lay.polaroid ? 'polaroid' : imageFrame(reused).frameStyle };
            return reused;
          }
          const phSrc = plogSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#ebe5dd"/><rect x="16" y="16" width="${Math.max(10, w - 32)}" height="${Math.max(10, h - 32)}" rx="10" fill="none" stroke="#c3b4a2" stroke-width="3" stroke-dasharray="10 8"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#8b7968" font-family="sans-serif" font-size="26">PHOTO ${idx + 1}</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#a29080" font-family="sans-serif" font-size="18">点击右侧「替换照片」</text></svg>`);
          return {
            id: uid(), type: 'image', role: 'slot', src: phSrc, x, y, w, h,
            fit: 'cover', crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0,
            rotation: rot, opacity: 1,
            frame: { shape: 'none', radius: 36, flipX: false, flipY: false, frameStyle: lay.polaroid ? 'polaroid' : 'none', caption: '' }
          };
        });
        const leftovers = existingPhotos.slice(slots.length);
        pg.elements = [...nextPhotos, ...leftovers, ...keptOthers];
        selectOnly(nextPhotos.length ? 0 : -1);
      });
      status(`✓ 已套用「${lay.name}」布局`);
    };
    g0.append(b);
  });
  sec0.append(g0);
  host.append(sec0);

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
        selectOnly(activePage().elements.length - 1);
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
  if (selected >= 0 && arr[selected] && !arr[selected].locked && !arr[selected].hidden) {
    const t = arr[selected], h = handles(t);
    if (Math.hypot(p.x - h.rot.x, p.y - h.rot.y) < 30) return { mode: 'rotate', idx: selected };
    if (Math.hypot(p.x - h.size.x, p.y - h.size.y) < 34) return { mode: 'size', idx: selected };
    if (t.type === 'image') {
      if (Math.hypot(p.x - h.width.x, p.y - h.width.y) < 30) return { mode: 'width', idx: selected };
      if (Math.hypot(p.x - h.height.x, p.y - h.height.y) < 30) return { mode: 'height', idx: selected };
    }
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    const t = arr[i]; if (t.hidden || t.locked) continue;
    const q = localPoint(t, p);
    if (q.x >= t.x - 10 && q.x <= t.x + t.w + 10 && q.y >= t.y - 10 && q.y <= t.y + t.h + 10) return { mode: 'move', idx: i };
  }
  return { mode: 'none', idx: -1 };
}

function snapElementPosition(el, rawX, rawY, others) {
  const th = 10, guides = [];
  const xs = [W() / 2, 48, W() - 48];
  const ys = [H() / 2, 48, H() - 48];
  if (doc.grid9) {
    for (const r of getGrid9Rects(W(), H(), doc.grid9Gap)) {
      xs.push(r.x, r.x + r.w / 2, r.x + r.w);
      ys.push(r.y, r.y + r.h / 2, r.y + r.h);
    }
  }
  for (const o of others) {
    if (o.hidden) continue;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  let bestDx = th + 1, bestX = rawX, gx = null;
  for (const offset of [0, el.w / 2, el.w]) {
    for (const tx of xs) {
      const d = Math.abs(rawX + offset - tx);
      if (d < bestDx) { bestDx = d; bestX = tx - offset; gx = tx; }
    }
  }
  if (gx !== null) guides.push({ axis: 'x', pos: gx });

  let bestDy = th + 1, bestY = rawY, gy = null;
  for (const offset of [0, el.h / 2, el.h]) {
    for (const ty of ys) {
      const d = Math.abs(rawY + offset - ty);
      if (d < bestDy) { bestDy = d; bestY = ty - offset; gy = ty; }
    }
  }
  if (gy !== null) guides.push({ axis: 'y', pos: gy });

  snapGuides = guides;
  el.x = bestX;
  el.y = bestY;
}

async function commitDoodleStroke(pts) {
  if (!pts || !pts.length) return;
  const style = $('doodleType')?.value || 'marker';
  const color = $('doodleColor')?.value || '#e26d5a';
  const size = Number($('doodleSize')?.value || 14);
  const pad = Math.ceil(size * 1.4 + 14);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of pts) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  const bx = Math.max(0, Math.floor(minX - pad));
  const by = Math.max(0, Math.floor(minY - pad));
  const bw = Math.max(32, Math.min(W() - bx, Math.ceil(maxX + pad) - bx));
  const bh = Math.max(32, Math.min(H() - by, Math.ceil(maxY + pad) - by));
  const off = document.createElement('canvas');
  off.width = bw; off.height = bh;
  drawDoodleStroke(off.getContext('2d'), pts, style, color, size, bx, by);
  const src = off.toDataURL('image/png');
  await getImg(src);
  addElement({
    id: uid(), type: 'image', role: 'doodle', src,
    x: bx, y: by, w: bw, h: bh, fit: 'contain',
    crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1
  });
  status('✓ 已添加手绘涂鸦图层（可选中移动、缩放或删除）');
}

canvas.addEventListener('pointerdown', e => {
  if (spacePan || e.button === 1) return;
  const p = locate(e);
  if (doodleMode) {
    doodlePts = [[p.x, p.y]];
    canvas.setPointerCapture(e.pointerId);
    redrawSync();
    return;
  }
  const found = hit(p);
  if (found.idx < 0) {
    if (!e.shiftKey) selectOnly(-1);
    snapGuides = [];
    marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, additive: e.shiftKey };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    redrawSync(); renderProps(); return;
  }
  const arr = activePage().elements;
  if (found.mode === 'move' && e.shiftKey) {
    toggleSelect(found.idx);
    if (!selectedIds.size) { redrawSync(); renderProps(); return; }
  } else if (found.mode === 'move' && selectedIds.size > 1 && selectedIds.has(arr[found.idx].id)) {
    selected = found.idx;
  } else {
    selectOnly(found.idx);
  }
  const group = selectedEntries().filter(x => !x.el.locked).map(x => ({ idx: x.i, origX: x.el.x, origY: x.el.y }));
  snapshot();
  drag = { mode: found.mode, start: p, orig: clone(arr[selected]), group };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  redrawSync(); renderProps();
});
canvas.addEventListener('pointermove', e => {
  const p = locate(e);
  if (doodleMode && doodlePts) {
    const last = doodlePts[doodlePts.length - 1];
    if (!last || Math.hypot(p.x - last[0], p.y - last[1]) >= 2) {
      doodlePts.push([p.x, p.y]);
      redrawSync();
    }
    return;
  }
  if (marquee) {
    marquee.x1 = p.x;
    marquee.y1 = p.y;
    redrawSync();
    return;
  }
  if (!drag) return;
  const arr = activePage().elements, el = arr[selected], o = drag.orig;
  if (!el) return;
  if (drag.mode === 'move') {
    const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    if (drag.group && drag.group.length > 1) {
      snapGuides = [];
      for (const g of drag.group) {
        if (arr[g.idx]) { arr[g.idx].x = g.origX + dx; arr[g.idx].y = g.origY + dy; }
      }
    } else if (e.altKey) {
      snapGuides = [];
      el.x = o.x + dx;
      el.y = o.y + dy;
    } else {
      snapElementPosition(el, o.x + dx, o.y + dy, arr.filter((_, i) => i !== selected));
    }
  } else {
    snapGuides = [];
    if (drag.mode === 'rotate') {
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
  }
  redrawSync();
});
canvas.addEventListener('pointerup', () => {
  if (doodleMode && doodlePts) {
    const pts = doodlePts; doodlePts = null;
    commitDoodleStroke(pts);
    return;
  }
  if (marquee) {
    const x0 = Math.min(marquee.x0, marquee.x1), y0 = Math.min(marquee.y0, marquee.y1);
    const x1 = Math.max(marquee.x0, marquee.x1), y1 = Math.max(marquee.y0, marquee.y1);
    const additive = marquee.additive;
    marquee = null;
    if (x1 - x0 > 6 || y1 - y0 > 6) {
      const next = additive ? new Set(selectedIds) : new Set();
      let lastIdx = additive ? selected : -1;
      activePage().elements.forEach((el, i) => {
        if (el.hidden || el.locked) return;
        const pts = [
          rotatePoint(el, el.x, el.y), rotatePoint(el, el.x + el.w, el.y),
          rotatePoint(el, el.x, el.y + el.h), rotatePoint(el, el.x + el.w, el.y + el.h)
        ];
        const bx0 = Math.min(...pts.map(q => q.x)), bx1 = Math.max(...pts.map(q => q.x));
        const by0 = Math.min(...pts.map(q => q.y)), by1 = Math.max(...pts.map(q => q.y));
        if (bx1 >= x0 && bx0 <= x1 && by1 >= y0 && by0 <= y1) { next.add(el.id); lastIdx = i; }
      });
      selectedIds = next;
      selected = lastIdx;
      if (next.size) status(`✓ 已框选 ${next.size} 个图层（可一起拖动、对齐或复制粘贴到其他画布）`);
    }
    redrawSync(); renderProps();
    return;
  }
  if (!drag) return;
  drag = null; snapGuides = []; persist(); redrawSync(); updateCurrentThumb(); renderProps();
});
canvas.addEventListener('dblclick', e => {
  if (doodleMode) return;
  const found = hit(locate(e));
  if (found.idx >= 0 && activePage().elements[found.idx]?.type === 'image') {
    selectOnly(found.idx); showPhotoEditor('reframe');
  }
});

// --- Export Current Page ---
async function exportCurrentPage() {
  const btn = $('exportPageBtn'); btn.disabled = true; btn.textContent = '正在生成…';
  try {
    const fmt = $('exportFormat').value === 'jpeg' ? 'jpeg' : 'png';
    const rawScale = Number($('exportScale').value) || 1;
    const scale = Math.min(rawScale, 8192 / Math.max(W(), H()));
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

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ u8[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBlob(entries) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() >> 1) & 31);
  const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);
  const localParts = [], cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name), data = entry.data, crc = crc32(data);
    const lh = new Uint8Array(30 + nameBytes.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    localParts.push(lh, data);

    const ch = new Uint8Array(46 + nameBytes.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    cdParts.push(ch);

    offset += lh.length + data.length;
  }

  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...cdParts, eocd], { type: 'application/zip' });
}

async function openGrid9ExportModal() {
  const b1 = $('exportGrid9Btn'), b2 = $('grid9ExportBarBtn');
  if (b1) { b1.disabled = true; b1.textContent = '正在切图…'; }
  if (b2) b2.disabled = true;
  try {
    const fmt = $('exportFormat').value === 'jpeg' ? 'jpeg' : 'png';
    const ext = fmt === 'jpeg' ? 'jpg' : 'png';
    const mime = `image/${fmt}`;
    const quality = fmt === 'jpeg' ? 0.94 : 1;
    const rawScale = Number($('exportScale').value) || 1;
    const scale = Math.min(rawScale, 8192 / Math.max(W(), H()));
    await document.fonts.ready.catch(() => {});
    await ensureImages(activePage());

    const full = document.createElement('canvas');
    full.width = Math.round(W() * scale);
    full.height = Math.round(H() * scale);
    paintPage(activePage(), full, scale);

    const gapPx = (Number(doc.grid9Gap) || 0) * scale;
    const rects = getGrid9Rects(full.width, full.height, gapPx);
    const title = (getActiveProject()?.title || 'Plog').replace(/[\\/:*?"<>|\s]+/g, '_');
    const tiles = [];

    for (const r of rects) {
      const x0 = Math.round(r.x), y0 = Math.round(r.y);
      const tw = Math.max(1, Math.round(r.x + r.w) - x0);
      const th = Math.max(1, Math.round(r.y + r.h) - y0);
      const tc = document.createElement('canvas');
      tc.width = tw; tc.height = th;
      tc.getContext('2d').drawImage(full, x0, y0, tw, th, 0, 0, tw, th);
      const blob = await new Promise((res, rej) => tc.toBlob(b => b ? res(b) : rej(Error('切图失败')), mime, quality));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const url = URL.createObjectURL(blob);
      tiles.push({ index: r.index, width: tw, height: th, url, bytes, filename: `${title}_P${current + 1}_0${r.index}.${ext}` });
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'photo-edit-backdrop';
    const nonSquare = W() !== H();
    backdrop.innerHTML = `<section class="grid9-modal-dialog" role="dialog" aria-modal="true">
     <header class="photo-edit-header"><div><b>九宫格拼接切图预览（1→9 按序发图）</b><small>点击任意单格可单独下载，或一键打包 9 张 PNG/JPG 为 ZIP</small></div><button type="button" data-action="close">✕</button></header>
     <div class="grid9-modal-body">
      ${nonSquare ? `<div class="grid9-warn">提示：当前画纸为 ${W()}×${H()}（非 1:1 正方形），建议先点击顶部“设为 2400×2400 正方形”避免单格被压成矩形。</div>` : ''}
      <div class="grid9-preview-grid"></div>
     </div>
     <footer class="photo-edit-footer"><span>单格 ${tiles[0].width}×${tiles[0].height} · ${fmt.toUpperCase()} · 缝隙 ${doc.grid9Gap || 0}px</span><div><button type="button" data-action="save-each">↓ 逐张下载 9 张</button><button type="button" data-action="save-zip" class="photo-edit-primary">📦 一键打包下载 ZIP（9张有序）</button></div></footer>
    </section>`;
    document.body.append(backdrop);

    const grid = backdrop.querySelector('.grid9-preview-grid');
    const triggerDownload = (href, download) => {
      const a = document.createElement('a');
      a.href = href; a.download = download;
      document.body.append(a); a.click(); a.remove();
    };

    tiles.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grid9-tile';
      btn.title = `下载第 ${t.index} 张 (${t.filename})`;
      btn.innerHTML = `<img src="${t.url}" alt="第${t.index}格"><span class="grid9-tile-num">${t.index}</span>`;
      btn.onclick = () => {
        triggerDownload(t.url, t.filename);
        status(`✓ 已下载第 ${t.index} 格（${t.filename}）`);
      };
      grid.append(btn);
    });

    const close = () => {
      backdrop.remove();
      tiles.forEach(t => URL.revokeObjectURL(t.url));
    };
    backdrop.querySelector('[data-action="close"]').onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };
    backdrop.querySelector('[data-action="save-each"]').onclick = async () => {
      for (const t of tiles) {
        triggerDownload(t.url, t.filename);
        await new Promise(r => setTimeout(r, 120));
      }
      status(`✓ 已逐张下载 9 张九宫格切图（01~09）`);
    };
    backdrop.querySelector('[data-action="save-zip"]').onclick = () => {
      const zipBlob = buildZipBlob(tiles.map(t => ({ name: t.filename, data: t.bytes })));
      const zipUrl = URL.createObjectURL(zipBlob);
      triggerDownload(zipUrl, `${title}_P${current + 1}_九宫格_9张.zip`);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 4000);
      status(`✓ 已打包导出九宫格 ZIP（9张 ${tiles[0].width}×${tiles[0].height} ${fmt.toUpperCase()}）`);
    };
  } catch (err) {
    alert('九宫格切图失败：' + err.message);
  } finally {
    if (b1) { b1.disabled = false; b1.textContent = '⊞ 导出九宫格'; }
    if (b2) b2.disabled = false;
  }
}

function initPanelResizers() {
  const body = document.querySelector('.plog-body');
  if (!body) return;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(PANEL_KEY) || '{}'); } catch (_) {}
  let leftW = Number.isFinite(saved.left) ? saved.left : 196;
  let rightW = Number.isFinite(saved.right) ? saved.right : 316;
  let lastLeft = leftW > 0 ? leftW : 196;
  let lastRight = rightW > 0 ? rightW : 316;

  const apply = (save = true) => {
    body.style.setProperty('--left-w', leftW + 'px');
    body.style.setProperty('--right-w', rightW + 'px');
    $('focusCanvasBtn')?.classList.toggle('active', leftW === 0 && rightW === 0);
    if (save) try { localStorage.setItem(PANEL_KEY, JSON.stringify({ left: leftW, right: rightW })); } catch (_) {}
  };
  apply(false);

  const wireHandle = (handleId, isLeft) => {
    const el = $(handleId);
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = isLeft ? leftW : rightW;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      const onMove = ev => {
        const delta = isLeft ? (ev.clientX - startX) : (startX - ev.clientX);
        const raw = startW + delta;
        if (isLeft) {
          leftW = raw < 70 ? 0 : clamp(Math.round(raw), 140, 380);
          if (leftW > 0) lastLeft = leftW;
        } else {
          rightW = raw < 110 ? 0 : clamp(Math.round(raw), 240, 560);
          if (rightW > 0) lastRight = rightW;
        }
        apply(false);
      };
      const onUp = () => {
        el.classList.remove('dragging');
        apply(true);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
    el.addEventListener('dblclick', () => {
      if (isLeft) leftW = leftW === 0 ? (lastLeft || 196) : 0;
      else rightW = rightW === 0 ? (lastRight || 316) : 0;
      apply(true);
    });
  };

  wireHandle('resizerLeft', true);
  wireHandle('resizerRight', false);

  if ($('focusCanvasBtn')) {
    $('focusCanvasBtn').onclick = () => {
      if (leftW === 0 && rightW === 0) {
        leftW = lastLeft || 196;
        rightW = lastRight || 316;
      } else {
        if (leftW > 0) lastLeft = leftW;
        if (rightW > 0) lastRight = rightW;
        leftW = 0;
        rightW = 0;
      }
      apply(true);
      status(leftW === 0 && rightW === 0 ? '⤢ 已进入专注画布模式（再次点击恢复侧栏）' : '✓ 已恢复工作区侧栏');
    };
  }
}

async function showDoubleExposureModal() {
  const curEl = activePage().elements[selected];
  const origImgEl = curEl?.type === 'image' ? curEl : null;
  let baseImg = origImgEl ? await getImg(origImgEl.src) : null;
  let overlayImg = null;

  const state = {
    blend: 'screen', opacity: 0.88, scale: 1, ox: 0, oy: 0,
    bw: false, contrast: 108, warmth: 0,
    tool: 'move', brushSize: 64, feather: 0.72
  };

  let maskCvs = document.createElement('canvas');
  let maskCtx = maskCvs.getContext('2d', { willReadFrequently: true });
  let maskHist = [];
  const initMask = () => {
    const bw = baseImg ? clamp(baseImg.width, 600, 1400) : 900;
    const bh = baseImg ? Math.max(400, Math.round(bw * baseImg.height / baseImg.width)) : 900;
    maskCvs.width = bw; maskCvs.height = bh;
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, bw, bh);
    maskHist = [];
  };
  initMask();

  const backdrop = document.createElement('div');
  backdrop.className = 'photo-edit-backdrop';
  backdrop.innerHTML = `<section class="de-modal-dialog" role="dialog" aria-modal="true">
   <header class="photo-edit-header"><div><b>✦ 双重曝光摄影工坊</b><small>两张照片虚实交叠 · 支持剪影滤色、柔光残影与柔边擦除五官</small></div><button type="button" data-action="close">✕</button></header>
   <div class="photo-edit-content">
    <div class="photo-edit-viewport"><canvas width="640" height="500"></canvas></div>
    <aside class="photo-edit-settings">
     <strong class="pe-title">1. 选择底图与叠加图</strong>
     <div class="de-upload-row">
      <button type="button" data-pick="base">🖼 ${baseImg ? '更换底图' : '上传底图（人像/剪影）'}</button>
      <button type="button" data-pick="overlay">✨ 上传叠加图（风景/光斑）</button>
     </div>
     <input hidden type="file" data-file="base" accept="image/*">
     <input hidden type="file" data-file="overlay" accept="image/*">
     <strong class="pe-title">2. 一键摄影预设</strong>
     <div class="de-presets">
      <button type="button" data-preset="silhouette">侧脸剪影滤色</button>
      <button type="button" data-preset="ghost">胶片残影柔光</button>
      <button type="button" data-preset="bw">黑白电影双曝</button>
      <button type="button" data-preset="warm">暖色光斑叠加</button>
     </div>
     <strong class="pe-title">3. 融合与调色</strong>
     <label>混合模式<select data-de="blend"><option value="screen">滤色 Screen（亮背景剪影推荐）</option><option value="soft-light">柔光 Soft Light（通透残影）</option><option value="lighten">变亮 Lighten（光斑/夜景）</option><option value="multiply">正片叠底 Multiply（深色纹样）</option><option value="overlay">叠加 Overlay（高反差）</option></select></label>
     <label>叠加不透明度 <strong data-val="opacity">88%</strong><input type="range" data-de="opacity" min="0.1" max="1" step="0.01" value="0.88"></label>
     <label>叠加缩放 <strong data-val="scale">100%</strong><input type="range" data-de="scale" min="0.4" max="2.6" step="0.02" value="1"></label>
     <label>反差对比度 <strong data-val="contrast">108%</strong><input type="range" data-de="contrast" min="70" max="160" step="1" value="108"></label>
     <label>暖调氛围 <strong data-val="warmth">0</strong><input type="range" data-de="warmth" min="0" max="60" step="1" value="0"></label>
     <label class="pe-shadow-toggle"><input type="checkbox" data-de="bw"> 黑白高级质感（统一色温）</label>
     <strong class="pe-title">4. 画布交互与柔边擦除五官</strong>
     <div class="de-tool-row">
      <button type="button" data-tool="move" class="active">✋ 拖动叠加图</button>
      <button type="button" data-tool="erase">🖌 柔边擦除</button>
      <button type="button" data-tool="restore">↩ 恢复显示</button>
     </div>
     <label>画笔大小 <strong data-val="brushSize">64px</strong><input type="range" data-de="brushSize" min="14" max="180" step="2" value="64"></label>
     <div class="photo-edit-buttons"><button type="button" data-action="undo-mask">↶ 撤销擦除</button><button type="button" data-action="reset-mask">重置擦除区</button></div>
    </aside>
   </div>
   <footer class="photo-edit-footer"><span data-note>拖动可错位构图；用“柔边擦除”把眼睛五官轻擦露出来</span><div><button type="button" data-action="cancel">取消</button>${origImgEl ? '<button type="button" data-action="replace">↻ 替换当前图片</button>' : ''}<button type="button" data-action="insert" class="photo-edit-primary">＋ 插入到画布</button></div></footer>
  </section>`;
  document.body.append(backdrop);

  const qa = q => backdrop.querySelector(q);
  const cvs = qa('canvas'), ctx2 = cvs.getContext('2d');
  let dragOp = null;

  const drawCover = (gc, img, x, y, w, h, exScale = 1, dx = 0, dy = 0) => {
    const s = Math.max(w / img.width, h / img.height) * exScale;
    const dw = img.width * s, dh = img.height * s;
    gc.save();
    gc.beginPath(); gc.rect(x, y, w, h); gc.clip();
    gc.drawImage(img, x + (w - dw) / 2 + dx, y + (h - dh) / 2 + dy, dw, dh);
    gc.restore();
  };

  const renderComposite = (target, tw, th, vx = 0, vy = 0, vw = tw, vh = th) => {
    const gc = target.getContext('2d');
    gc.clearRect(0, 0, tw, th);
    if (!vx && !vy) {
      gc.fillStyle = '#ffffff';
      gc.fillRect(0, 0, tw, th);
    } else {
      gc.fillStyle = '#ece6ef';
      gc.fillRect(0, 0, tw, th);
      gc.fillStyle = '#ffffff';
      gc.fillRect(vx, vy, vw, vh);
    }
    const fBase = [state.bw ? 'grayscale(100%)' : '', `contrast(${state.contrast}%)`, state.warmth ? `sepia(${Math.round(state.warmth * 0.45)}%)` : ''].filter(Boolean).join(' ') || 'none';
    if (baseImg) {
      gc.save(); gc.filter = fBase;
      drawCover(gc, baseImg, vx, vy, vw, vh, 1, 0, 0);
      gc.restore();
    } else {
      gc.save();
      gc.fillStyle = '#8b7b92';
      gc.font = '600 18px sans-serif';
      gc.textAlign = 'center'; gc.textBaseline = 'middle';
      gc.fillText('请先在右侧上传「底图」与「叠加图」', tw / 2, th / 2);
      gc.restore();
    }
    if (overlayImg) {
      const tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.round(vw)); tmp.height = Math.max(1, Math.round(vh));
      const tc = tmp.getContext('2d');
      tc.filter = fBase;
      const ratio = tmp.width / 460;
      drawCover(tc, overlayImg, 0, 0, tmp.width, tmp.height, state.scale, state.ox * ratio, state.oy * ratio);
      tc.filter = 'none';
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(maskCvs, 0, 0, tmp.width, tmp.height);

      gc.save();
      gc.beginPath(); gc.rect(vx, vy, vw, vh); gc.clip();
      gc.globalCompositeOperation = state.blend;
      gc.globalAlpha = state.opacity;
      gc.drawImage(tmp, vx, vy, vw, vh);
      gc.restore();
    }
    if (state.warmth > 0 && baseImg) {
      gc.save();
      gc.globalCompositeOperation = 'soft-light';
      gc.fillStyle = `rgba(255, 168, 92, ${clamp(state.warmth / 180, 0, 0.35)})`;
      gc.fillRect(vx, vy, vw, vh);
      gc.restore();
    }
  };

  const getView = () => {
    const bw = baseImg ? baseImg.width : (overlayImg ? overlayImg.width : 900);
    const bh = baseImg ? baseImg.height : (overlayImg ? overlayImg.height : 900);
    const sc = Math.min(600 / bw, 460 / bh);
    const vw = bw * sc, vh = bh * sc;
    return { x: (640 - vw) / 2, y: (500 - vh) / 2, w: vw, h: vh };
  };

  const drawPreview = () => {
    const v = getView();
    renderComposite(cvs, 640, 500, v.x, v.y, v.w, v.h);
  };

  const syncUI = () => {
    qa('[data-de="blend"]').value = state.blend;
    qa('[data-de="opacity"]').value = state.opacity;
    qa('[data-val="opacity"]').textContent = Math.round(state.opacity * 100) + '%';
    qa('[data-de="scale"]').value = state.scale;
    qa('[data-val="scale"]').textContent = Math.round(state.scale * 100) + '%';
    qa('[data-de="contrast"]').value = state.contrast;
    qa('[data-val="contrast"]').textContent = state.contrast + '%';
    qa('[data-de="warmth"]').value = state.warmth;
    qa('[data-val="warmth"]').textContent = state.warmth;
    qa('[data-de="bw"]').checked = state.bw;
    qa('[data-de="brushSize"]').value = state.brushSize;
    qa('[data-val="brushSize"]').textContent = state.brushSize + 'px';
    backdrop.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === state.tool));
  };

  const loadUpload = (file, targetKind) => new Promise(res => {
    const fr = new FileReader();
    fr.onload = async () => {
      const im = await getImg(fr.result);
      if (targetKind === 'base') { baseImg = im; initMask(); qa('[data-pick="base"]').textContent = '🖼 更换底图'; }
      else { overlayImg = im; qa('[data-pick="overlay"]').textContent = '✨ 更换叠加图'; }
      drawPreview(); res();
    };
    fr.readAsDataURL(file);
  });

  qa('[data-pick="base"]').onclick = () => qa('[data-file="base"]').click();
  qa('[data-pick="overlay"]').onclick = () => qa('[data-file="overlay"]').click();
  qa('[data-file="base"]').onchange = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) loadUpload(f, 'base'); };
  qa('[data-file="overlay"]').onchange = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) loadUpload(f, 'overlay'); };

  const presets = {
    silhouette: { blend: 'screen', opacity: 0.92, bw: false, contrast: 112, warmth: 0 },
    ghost: { blend: 'soft-light', opacity: 0.78, bw: false, contrast: 104, warmth: 18 },
    bw: { blend: 'screen', opacity: 0.88, bw: true, contrast: 122, warmth: 0 },
    warm: { blend: 'lighten', opacity: 0.84, bw: false, contrast: 106, warmth: 35 }
  };
  backdrop.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
    Object.assign(state, presets[b.dataset.preset]);
    syncUI(); drawPreview();
  });

  backdrop.querySelectorAll('[data-de]').forEach(inp => inp.addEventListener('input', () => {
    const k = inp.dataset.de;
    state[k] = inp.type === 'checkbox' ? inp.checked : (k === 'blend' ? inp.value : Number(inp.value));
    syncUI(); drawPreview();
  }));
  backdrop.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
    state.tool = b.dataset.tool;
    syncUI();
  });
  qa('[data-action="undo-mask"]').onclick = () => {
    if (!maskHist.length) return;
    maskCtx.putImageData(maskHist.pop(), 0, 0);
    drawPreview();
  };
  qa('[data-action="reset-mask"]').onclick = () => {
    maskHist.push(maskCtx.getImageData(0, 0, maskCvs.width, maskCvs.height));
    if (maskHist.length > 8) maskHist.shift();
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, maskCvs.width, maskCvs.height);
    drawPreview();
  };

  const paintSoftMask = (vx, vy, vw, vh, px, py) => {
    const mx = (px - vx) * maskCvs.width / vw;
    const my = (py - vy) * maskCvs.height / vh;
    const rad = Math.max(8, state.brushSize * maskCvs.width / vw * 0.5);
    maskCtx.save();
    maskCtx.globalCompositeOperation = state.tool === 'erase' ? 'destination-out' : 'source-over';
    const g = maskCtx.createRadialGradient(mx, my, rad * (1 - state.feather) * 0.4, mx, my, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    maskCtx.fillStyle = g;
    maskCtx.beginPath(); maskCtx.arc(mx, my, rad, 0, Math.PI * 2); maskCtx.fill();
    maskCtx.restore();
  };

  const ptFrom = e => {
    const r = cvs.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 640 / r.width, y: (e.clientY - r.top) * 500 / r.height };
  };
  cvs.addEventListener('pointerdown', e => {
    const p = ptFrom(e), v = getView();
    if (state.tool === 'move') {
      dragOp = { kind: 'move', sx: p.x, sy: p.y, ox: state.ox, oy: state.oy };
    } else {
      maskHist.push(maskCtx.getImageData(0, 0, maskCvs.width, maskCvs.height));
      if (maskHist.length > 8) maskHist.shift();
      paintSoftMask(v.x, v.y, v.w, v.h, p.x, p.y);
      dragOp = { kind: 'brush', v };
      drawPreview();
    }
    try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cvs.addEventListener('pointermove', e => {
    if (!dragOp) return;
    const p = ptFrom(e);
    if (dragOp.kind === 'move') {
      state.ox = dragOp.ox + (p.x - dragOp.sx);
      state.oy = dragOp.oy + (p.y - dragOp.sy);
    } else {
      paintSoftMask(dragOp.v.x, dragOp.v.y, dragOp.v.w, dragOp.v.h, p.x, p.y);
    }
    drawPreview();
  });
  cvs.addEventListener('pointerup', () => { dragOp = null; });

  const buildOutputSrc = () => {
    const ref = baseImg || overlayImg;
    if (!ref) return null;
    const scale = Math.min(1, 2000 / Math.max(ref.width, ref.height));
    const ow = Math.max(100, Math.round(ref.width * scale));
    const oh = Math.max(100, Math.round(ref.height * scale));
    const out = document.createElement('canvas');
    out.width = ow; out.height = oh;
    renderComposite(out, ow, oh, 0, 0, ow, oh);
    return { src: out.toDataURL('image/png'), w: ow, h: oh };
  };

  const close = () => backdrop.remove();
  qa('[data-action="close"]').onclick = close;
  qa('[data-action="cancel"]').onclick = close;
  backdrop.onclick = e => { if (e.target === backdrop) close(); };

  const repBtn = qa('[data-action="replace"]');
  if (repBtn) {
    repBtn.onclick = async () => {
      const res = buildOutputSrc();
      if (!res || !origImgEl) return alert('请先上传图片再生成');
      await getImg(res.src);
      modify(() => { origImgEl.src = res.src; delete origImgEl.role; origImgEl.crop = { x: 0, y: 0, w: 1, h: 1 }; origImgEl.zoom = 1; origImgEl.offsetX = 0; origImgEl.offsetY = 0; });
      close();
      status('✓ 已应用双重曝光效果并替换选中图片');
    };
  }

  qa('[data-action="insert"]').onclick = async () => {
    const res = buildOutputSrc();
    if (!res) return alert('请先上传底图或叠加图');
    await getImg(res.src);
    const targetW = Math.min(Math.round(W() * 0.65), res.w);
    const targetH = Math.max(80, Math.round(targetW * res.h / res.w));
    addElement({
      id: uid(), type: 'image', src: res.src,
      x: Math.round((W() - targetW) / 2), y: Math.round((H() - targetH) / 2),
      w: targetW, h: targetH, fit: 'contain',
      crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1
    });
    close();
    status('✦ 已生成双重曝光合成图并插入画布');
  };

  syncUI();
  drawPreview();
}

function showCrossCanvasModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'photo-edit-backdrop';
  backdrop.innerHTML = `<section class="cross-modal-dialog" role="dialog" aria-modal="true">
   <header class="photo-edit-header"><div><b>⇄ 跨画布多选 · 跨页汇总与管理</b><small>同时勾选任意多个画布中的照片、文字或贴纸，一键复制、移动或汇总到新画布</small></div><button type="button" data-action="close">✕</button></header>
   <div class="cross-modal-body" data-body></div>
   <footer class="photo-edit-footer"><span data-count>已跨画布选中 0 个图层</span><div style="flex-wrap:wrap"><button type="button" data-action="clip">📋 放入剪贴板</button><button type="button" data-action="copy-cur">⧉ 复制到当前页</button><button type="button" data-action="move-cur">✂ 移动到当前页</button><button type="button" data-action="to-new" class="photo-edit-primary">＋ 汇总到新画布</button><button type="button" data-action="del">⌫ 批量删除</button></div></footer>
  </section>`;
  document.body.append(backdrop);

  const bodyEl = backdrop.querySelector('[data-body]');
  const countEl = backdrop.querySelector('[data-count]');
  const checked = new Map();

  doc.pages.forEach((pg, pgIdx) => {
    pg.elements.forEach(el => {
      if (pgIdx === current && selectedIds.has(el.id)) checked.set(el.id, { pgIdx, el });
    });
  });

  const refreshCount = () => {
    countEl.textContent = `已跨画布选中 ${checked.size} 个图层`;
  };

  doc.pages.forEach((pg, pgIdx) => {
    const card = document.createElement('div');
    card.className = 'cross-page-group';
    const head = document.createElement('div');
    head.className = 'cross-page-head';
    head.innerHTML = `<span>第 ${pgIdx + 1} 页${pgIdx === current ? '（当前画布）' : ''} · ${pg.elements.length} 个图层</span>`;
    const allLb = document.createElement('label');
    const allCb = document.createElement('input');
    allCb.type = 'checkbox';
    allCb.checked = pg.elements.length > 0 && pg.elements.every(e => checked.has(e.id));
    allLb.append(allCb, document.createTextNode('全选本页'));
    head.append(allLb);
    card.append(head);

    const grid = document.createElement('div');
    grid.className = 'cross-layer-grid';
    if (!pg.elements.length) {
      grid.innerHTML = '<small style="color:var(--ink-2)">（本画布暂无图层）</small>';
    } else {
      const itemCbs = [];
      pg.elements.forEach(el => {
        const lb = document.createElement('label');
        lb.className = 'cross-layer-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = checked.has(el.id);
        cb.onchange = () => {
          if (cb.checked) checked.set(el.id, { pgIdx, el });
          else checked.delete(el.id);
          allCb.checked = pg.elements.every(e => checked.has(e.id));
          refreshCount();
        };
        itemCbs.push(cb);
        lb.append(cb, document.createTextNode(layerLabel(el)));
        grid.append(lb);
      });
      allCb.onchange = () => {
        pg.elements.forEach((el, k) => {
          itemCbs[k].checked = allCb.checked;
          if (allCb.checked) checked.set(el.id, { pgIdx, el });
          else checked.delete(el.id);
        });
        refreshCount();
      };
    }
    card.append(grid);
    bodyEl.append(card);
  });
  refreshCount();

  const close = () => backdrop.remove();
  backdrop.querySelector('[data-action="close"]').onclick = close;
  backdrop.onclick = e => { if (e.target === backdrop) close(); };

  const pickedList = () => Array.from(checked.values());

  backdrop.querySelector('[data-action="clip"]').onclick = () => {
    const items = pickedList();
    if (!items.length) return alert('请先勾选至少一个图层');
    clipboard = items.map(x => clone(x.el));
    clipboardSourcePage = -1;
    pasteBump = 0;
    syncClipboardUI();
    close();
    status(`📋 已跨画布复制 ${clipboard.length} 个图层到剪贴板，切到目标画布按 Ctrl+V 或点“粘贴”即可`);
  };

  backdrop.querySelector('[data-action="copy-cur"]').onclick = async () => {
    const items = pickedList();
    if (!items.length) return alert('请先勾选至少一个图层');
    const srcs = items.filter(x => x.el.type === 'image' && x.el.src).map(x => getImg(x.el.src));
    if (srcs.length) await Promise.all(srcs);
    modify(() => {
      const nextIds = new Set();
      for (const { el } of items) {
        const copy = clone(el);
        copy.id = uid(); copy.locked = false; copy.hidden = false;
        copy.x = clamp(copy.x, 0, Math.max(0, W() - Math.min(copy.w, W())));
        copy.y = clamp(copy.y, 0, Math.max(0, H() - Math.min(copy.h, H())));
        activePage().elements.push(copy);
        nextIds.add(copy.id);
      }
      selectedIds = nextIds;
      selected = activePage().elements.length - 1;
    });
    renderPagesList();
    close();
    status(`✓ 已跨画布复制 ${items.length} 个图层到当前画布`);
  };

  backdrop.querySelector('[data-action="move-cur"]').onclick = async () => {
    const items = pickedList();
    if (!items.length) return alert('请先勾选至少一个图层');
    const srcs = items.filter(x => x.el.type === 'image' && x.el.src).map(x => getImg(x.el.src));
    if (srcs.length) await Promise.all(srcs);
    const moveIds = new Set();
    const moved = [];
    for (const { pgIdx, el } of items) {
      if (pgIdx === current) continue;
      moveIds.add(el.id);
      const copy = clone(el);
      copy.locked = false; copy.hidden = false;
      copy.x = clamp(copy.x, 0, Math.max(0, W() - Math.min(copy.w, W())));
      copy.y = clamp(copy.y, 0, Math.max(0, H() - Math.min(copy.h, H())));
      moved.push(copy);
    }
    if (!moved.length) { close(); status('所选图层已全部在当前画布中'); return; }
    snapshot();
    doc.pages.forEach((pg, idx) => {
      if (idx !== current) pg.elements = pg.elements.filter(e => !moveIds.has(e.id));
    });
    activePage().elements.push(...moved);
    selectedIds = new Set(moved.map(e => e.id));
    selected = activePage().elements.length - 1;
    persist(); renderPagesList(); redraw(); renderProps();
    close();
    status(`✂ 已跨画布移动 ${moved.length} 个图层到当前画布`);
  };

  backdrop.querySelector('[data-action="to-new"]').onclick = async () => {
    const items = pickedList();
    if (!items.length) return alert('请先勾选至少一个图层');
    const np = blankPage();
    const clones = items.map(({ el }) => {
      const copy = clone(el);
      copy.id = uid(); copy.locked = false; copy.hidden = false;
      copy.x = clamp(copy.x, 0, Math.max(0, W() - Math.min(copy.w, W())));
      copy.y = clamp(copy.y, 0, Math.max(0, H() - Math.min(copy.h, H())));
      return copy;
    });
    np.elements.push(...clones);
    doc.pages.push(np);
    current = doc.pages.length - 1;
    selectedIds = new Set(clones.map(c => c.id));
    selected = np.elements.length - 1;
    undoStack = []; redoStack = [];
    $('pageLabel').textContent = `第 ${current + 1} 页`;
    persist(); renderPagesList(); await redraw(); renderProps();
    close();
    status(`✦ 已将跨画布选中的 ${clones.length} 个图层汇总到新画布（第 ${current + 1} 页）`);
  };

  backdrop.querySelector('[data-action="del"]').onclick = () => {
    const items = pickedList();
    if (!items.length) return alert('请先勾选至少一个图层');
    const dropIds = new Set(items.map(x => x.el.id));
    snapshot();
    doc.pages.forEach(pg => { pg.elements = pg.elements.filter(e => !dropIds.has(e.id)); });
    selectOnly(-1);
    persist(); renderPagesList(); redraw(); renderProps();
    close();
    status(`⌫ 已跨画布批量删除 ${items.length} 个图层`);
  };
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
    modify(() => { el.src = src; delete el.role; el.crop = { x: 0, y: 0, w: 1, h: 1 }; el.zoom = 1; el.offsetX = 0; el.offsetY = 0; });
  };
  $('addText').onclick = () => addElement(T('写下一句此刻的心情', Math.round(W() * 0.15), Math.round(H() * 0.4), Math.round(W() * 0.7), 90, 48, '#3f312b', serif, { align: 'center' }));
  $('addShape').onclick = () => addElement(S(Math.round(W() * 0.25), Math.round(H() * 0.35), Math.round(W() * 0.5), 260, '#e8dfd3', { radius: 16 }));
  $('doodleToggle').onclick = () => setDoodleMode(!doodleMode);
  $('doodleDone').onclick = () => setDoodleMode(false);
  $('grid9Toggle').onclick = () => setGrid9Mode(!doc.grid9, true);
  $('doubleExpBtn').onclick = () => showDoubleExposureModal();
  $('grid9CloseBtn').onclick = () => setGrid9Mode(false, false);
  $('grid9GapSel').onchange = e => {
    doc.grid9Gap = Number(e.target.value) || 0;
    persist(); redrawSync();
    status(doc.grid9Gap ? `⊞ 已设置朋友圈白缝补偿：${doc.grid9Gap}px` : '⊞ 已切换为无缝直切（0px）');
  };
  $('grid9SquareBtn').onclick = () => {
    setPaperSize(2400, 2400);
    status('✓ 已设为 2400×2400 九宫格超清正方形画纸');
  };
  $('grid9ExportBarBtn').onclick = openGrid9ExportModal;
  $('doodleSize').oninput = e => { $('doodleSizeVal').textContent = e.target.value; };
  document.querySelectorAll('.doodle-swatches [data-dcolor]').forEach(b => {
    b.onclick = () => { $('doodleColor').value = b.dataset.dcolor; };
  });

  const curZoom = () => canvasZoom || clamp(canvas.getBoundingClientRect().width / W(), 0.2, 1.5);
  $('zoomOut').onclick = () => { canvasZoom = clamp(Math.round((curZoom() - 0.15) * 100) / 100, 0.2, 3.0); applyCanvasZoom(true); };
  $('zoomIn').onclick = () => { canvasZoom = clamp(Math.round((curZoom() + 0.15) * 100) / 100, 0.2, 3.0); applyCanvasZoom(true); };
  $('zoom100').onclick = () => { canvasZoom = 1; applyCanvasZoom(true); };
  $('zoomFit').onclick = () => { canvasZoom = 0; applyCanvasZoom(false); };

  const stage = document.querySelector('.canvas-stage');
  if (stage) {
    let panDrag = null;
    stage.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      canvasZoom = clamp(Math.round(curZoom() * factor * 100) / 100, 0.2, 3.0);
      applyCanvasZoom(true);
    }, { passive: false });
    stage.addEventListener('pointerdown', e => {
      if (!(spacePan || e.button === 1)) return;
      e.preventDefault();
      panDrag = { sx: e.clientX, sy: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      stage.classList.add('panning-active');
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    });
    stage.addEventListener('pointermove', e => {
      if (!panDrag) return;
      stage.scrollLeft = panDrag.sl - (e.clientX - panDrag.sx);
      stage.scrollTop = panDrag.st - (e.clientY - panDrag.sy);
    });
    const endPan = () => {
      if (!panDrag) return;
      panDrag = null;
      stage.classList.remove('panning-active');
    };
    stage.addEventListener('pointerup', endPan);
    stage.addEventListener('pointercancel', endPan);
  }
  initPanelResizers();

  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('copyEl').onclick = copySelected;
  $('pasteEl').onclick = pasteClipboard;
  $('crossSelectBtn').onclick = showCrossCanvasModal;
  if ($('crossSelectLeftBtn')) $('crossSelectLeftBtn').onclick = showCrossCanvasModal;
  syncClipboardUI();
  $('duplicateEl').onclick = () => {
    const items = selectedEntries();
    if (!items.length) return;
    modify(() => {
      const nextIds = new Set();
      for (const { el } of items) {
        const copy = clone(el);
        copy.id = uid(); copy.locked = false; copy.x += 28; copy.y += 28;
        activePage().elements.push(copy);
        nextIds.add(copy.id);
      }
      selectedIds = nextIds;
      selected = activePage().elements.length - 1;
    });
  };
  $('deleteEl').onclick = () => {
    const items = selectedEntries();
    if (!items.length) return;
    const drop = new Set(items.map(x => x.el.id));
    modify(() => {
      activePage().elements = activePage().elements.filter(e => !drop.has(e.id));
      selectOnly(-1);
    });
  };

  $('paperPreset').onchange = e => {
    if (e.target.value === 'custom') return;
    const [w, h] = e.target.value.split('x').map(Number);
    setPaperSize(w, h);
  };
  $('paperW').onchange = () => setPaperSize($('paperW').value, $('paperH').value);
  $('paperH').onchange = () => setPaperSize($('paperW').value, $('paperH').value);

  $('exportGrid9Btn').onclick = openGrid9ExportModal;
  $('exportPageBtn').onclick = exportCurrentPage;
  $('addPageBtn').onclick = () => { doc.pages.push(blankPage()); current = doc.pages.length - 1; selectOnly(-1); persist(); renderPagesList(); redraw(); renderProps(); };
  $('dupPageBtn').onclick = () => { const c = clone(activePage()); c.elements.forEach(e => e.id = uid()); doc.pages.splice(current + 1, 0, c); current++; selectOnly(-1); persist(); renderPagesList(); redraw(); renderProps(); };
  $('delPageBtn').onclick = () => { if (doc.pages.length <= 1) return alert('至少保留 1 页'); if (!confirm('删除当前页吗？')) return; doc.pages.splice(current, 1); current = Math.max(0, current - 1); selectOnly(-1); persist(); renderPagesList(); redraw(); renderProps(); };

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
      doc = { width: data.width || 1080, height: data.height || 1440, grid9: !!data.grid9, grid9Gap: Number(data.grid9Gap) || 0, pages: data.pages };
      current = 0; selectOnly(-1);
      syncPaperSizeUI(); syncGrid9UI(); persist(); renderPagesList(); redraw(); renderProps();
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
    if (e.key === 'Escape' && doodleMode) { setDoodleMode(false); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space' && !document.querySelector('.photo-edit-backdrop')) {
      e.preventDefault();
      spacePan = true;
      document.querySelector('.canvas-stage')?.classList.add('panning');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAllVisible(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelected(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      pastedViaEvent = false;
      setTimeout(() => { if (!pastedViaEvent && clipboard.length) pasteClipboard(); pastedViaEvent = false; }, 10);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); $('duplicateEl').click(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedEntries().length) { e.preventDefault(); $('deleteEl').click(); } }
  });
  window.addEventListener('paste', async e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.querySelector('.photo-edit-backdrop')) return;
    pastedViaEvent = true;
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
    if (imgItem) {
      const f = imgItem.getAsFile();
      if (f) {
        e.preventDefault();
        const src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
        const img = await getImg(src);
        if (img) {
          const w = Math.min(Math.round(W() * 0.55), img.width), h = Math.round(w * img.height / img.width);
          addElement({ id: uid(), type: 'image', src, x: Math.round((W() - w) / 2), y: Math.round((H() - h) / 2), w, h: Math.min(Math.round(H() * 0.7), h), fit: 'contain', crop: { x: 0, y: 0, w: 1, h: 1 }, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 });
          status('✓ 已粘贴系统剪贴板图片到当前画布');
        }
        return;
      }
    }
    if (clipboard.length) {
      e.preventDefault();
      pasteClipboard();
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      spacePan = false;
      document.querySelector('.canvas-stage')?.classList.remove('panning', 'panning-active');
    }
  });
}

async function init() {
  bind();
  buildPlogLibrary();
  $('projectTitle').textContent = getActiveProject()?.title || '我的 Plog';
  try {
    db = await openDb();
    const saved = await readDb(activeDocKey());
    if (saved?.pages?.length) doc = { width: saved.width || 1080, height: saved.height || 1440, grid9: !!saved.grid9, grid9Gap: Number(saved.grid9Gap) || 0, pages: saved.pages };
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
  syncGrid9UI();
  renderPagesList();
  renderProps();
  await redraw();
  dbReady = true;
}

document.addEventListener('DOMContentLoaded', init);
})();
