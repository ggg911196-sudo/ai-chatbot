/* چت‌بات چند API — نسخه ۳ (بازطراحی کامل) */
'use strict';

const LS_SETTINGS = 'aichat.settings.v1';
const LS_CONVOS = 'aichat.convos.v1';
const LS_ADMIN = 'aichat.admin.v1';
const LS_STATS = 'aichat.stats.v1';

/* ارائه‌دهنده‌ها (OpenAI-Compatible) */
const PROVIDER_PRESETS = {
  openai:     { label: 'OpenAI',        baseUrl: 'https://api.openai.com/v1',                          models: ['gpt-4o-mini', 'gpt-4o'] },
  gemini:     { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] },
  groq:       { label: 'Groq',          baseUrl: 'https://api.groq.com/openai/v1',                     models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  cerebras:   { label: 'Cerebras',      baseUrl: 'https://api.cerebras.ai/v1',                         models: ['llama-3.3-70b'] },
  mistral:    { label: 'Mistral',       baseUrl: 'https://api.mistral.ai/v1',                          models: ['mistral-small-latest', 'mistral-medium-latest'] },
  together:   { label: 'Together AI',   baseUrl: 'https://api.together.xyz/v1',                        models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'] },
  openrouter: { label: 'OpenRouter',    baseUrl: 'https://openrouter.ai/api/v1',                       models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-001'] },
  deepseek:   { label: 'DeepSeek',      baseUrl: 'https://api.deepseek.com/v1',                        models: ['deepseek-chat', 'deepseek-reasoner'] },
  xai:        { label: 'xAI (Grok)',    baseUrl: 'https://api.x.ai/v1',                                models: ['grok-3-mini', 'grok-3'] },
  custom:     { label: 'سفارشی',        baseUrl: '',                                                   models: [] },
};
const PROVIDER_IDS = Object.keys(PROVIDER_PRESETS);

const KEY_HINTS = [
  [/^sk-or-v1-/i, 'openrouter'],
  [/^gsk_/i, 'groq'],
  [/^xai-/i, 'xai'],
  [/^AIza/i, 'gemini'],
  [/^csk-/i, 'cerebras'],
  [/^sk-proj-/i, 'openai'],
];

/* آیکون یکدست: همه آیکون‌های خطی در index.html به‌صورت symbol تعریف شده‌اند */
const icon = (name) => '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>';

const SUGGESTIONS = [
  ['bulb', 'یه ایده خلاقانه برای کانال تلگرامم بده'],
  ['code', 'یه تابع پایتون برای مرتب‌سازی لیست بنویس'],
  ['translate', 'این جمله رو به انگلیسی ترجمه کن: «هوش مصنوعی آینده است»'],
  ['book', 'یه برنامه مطالعه ۷ روزه برای امتحان ریاضی بساز'],
];
const FOLLOWUPS = ['بیشتر توضیح بده', 'یه مثال عملی بزن', 'خلاصه‌اش کن'];

/* تمیزکاری کلید: حذف کاراکترهای نامرئی (نیم‌فاصله، علامت جهت و…) که موقع کپی از متن فارسی ممکنه به اول/آخر کلید بچسبن و تشخیص رو خراب کنن */
function cleanKey(k) { return (k || '').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim(); }

/* ظاهر هر ارائه‌دهنده: لوگوی دقیق برند + رنگ سازمانی */
const PROVIDER_LOOK = {
  openai:     { icon: 'openai',       brand: '#000000', letter: 'AI' },
  gemini:     { icon: 'googlegemini', brand: '#1a73e8', letter: 'G'  },
  groq:       { icon: 'groq',         brand: '#f55036', letter: 'G'  },
  cerebras:   { icon: null,           brand: '#e11d48', letter: 'C'  },
  mistral:    { icon: 'mistralai',    brand: '#ff7000', letter: 'M'  },
  together:   { icon: null,           brand: '#0f62fe', letter: 'T'  },
  openrouter: { icon: 'openrouter',   brand: '#4f46e5', letter: 'OR' },
  deepseek:   { icon: 'deepseek',     brand: '#4d6bfe', letter: 'DS' },
  xai:        { icon: 'x',            brand: '#000000', letter: '𝕏'  },
  custom:     { icon: null,           brand: '#6b7280', letter: '✎'  },
};
function providerLogo(id) {
  const L = PROVIDER_LOOK[id] || PROVIDER_LOOK.custom;
  const s = document.createElement('span');
  s.className = 'p-logo';
  s.title = (PROVIDER_PRESETS[id] || {}).label || id;
  const putLetter = () => { const i = document.createElement('i'); i.textContent = L.letter; i.style.color = L.brand; s.appendChild(i); };
  if (L.icon) {
    const img = document.createElement('img');
    img.src = 'https://cdn.jsdelivr.net/npm/simple-icons/icons/' + L.icon + '.svg';
    img.alt = ''; img.loading = 'lazy';
    img.onerror = putLetter;
    s.appendChild(img);
  } else putLetter();
  return s;
}

/* تم‌های رنگی */
const THEMES = [
  { id: 'chatgpt',  name: 'چت‌جی‌پی‌تی', c: ['#2b7fff', '#ffffff'] },
  { id: 'midnight', name: 'نیمه‌شب', c: ['#8b5cf6', '#080a10'] },
  { id: 'ocean',    name: 'اقیانوس',  c: ['#0ea5e9', '#04121f'] },
  { id: 'sunset',   name: 'غروب',    c: ['#fb7185', '#160a12'] },
  { id: 'forest',   name: 'جنگل',    c: ['#10b981', '#07120e'] },
  { id: 'rose',     name: 'رز',      c: ['#ec4899', '#170811'] },
  { id: 'light',    name: 'روشن',    c: ['#7c3aed', '#eef0f4'] },
];
const LS_THEME = 'aichat.theme.v1';
function currentTheme() { try { const v = localStorage.getItem(LS_THEME); return (!v || v === 'midnight') ? 'chatgpt' : v; } catch { return 'chatgpt'; } }
function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem(LS_THEME, id); } catch {}
  renderThemePicker();
}
function renderThemePicker() {
  const pop = $('theme-pop');
  if (!pop) return;
  pop.innerHTML = '';
  const cur = currentTheme();
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme-opt' + (t.id === cur ? ' sel' : '');
    const sw = document.createElement('span');
    sw.className = 'theme-sw';
    sw.style.setProperty('--t1', t.c[0]); sw.style.setProperty('--t2', t.c[1]);
    const nm = document.createElement('span'); nm.textContent = t.name;
    b.appendChild(sw); b.appendChild(nm);
    b.onclick = (e) => { e.stopPropagation(); setTheme(t.id); };
    pop.appendChild(b);
  }
}

/* دریافت لیست مدل‌ها — برای جمینای از endpoint اصلی گوگل (نسخه سازگار OpenAI، ‎/models‎ ندارد) */
async function probeModels(pid, base, key) {
  if (pid === 'gemini') {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } });
    if (!res.ok) throw new Error('خطای ' + res.status);
    const data = await res.json();
    return (data.models || [])
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((id) => /gemini/i.test(id) && !/embed|tts|aqa|veo|imagen/i.test(id))
      .sort();
  }
  const res = await fetch(base.replace(/\/+$/, '') + '/models', { headers: { 'Authorization': 'Bearer ' + key } });
  if (!res.ok) throw new Error('خطای ' + res.status);
  const data = await res.json();
  return (data.data || []).map((m) => m.id).filter(Boolean).sort();
}

/* ---------- state ---------- */
let settings = loadJSON(LS_SETTINGS, null) || defaultSettings();
let convos = loadJSON(LS_CONVOS, []);
let stats = loadJSON(LS_STATS, null) || { messages: 0, byProvider: {} };
let admin = loadJSON(LS_ADMIN, null);
let activeConvoId = convos.length ? convos[0].id : null;
let editingProvider = settings.activeProvider || 'openai';
let aborter = null;
let adminTab = 'stats';
let convoQuery = '';

migrateSettings();

function defaultSettings() {
  const providers = {}, providerVisible = {};
  for (const id of PROVIDER_IDS) {
    providers[id] = { label: PROVIDER_PRESETS[id].label, baseUrl: PROVIDER_PRESETS[id].baseUrl, apiKey: '', model: PROVIDER_PRESETS[id].models[0] || '', modelsList: [] };
    providerVisible[id] = true;
  }
  return { providers, providerVisible, activeProvider: 'openai' };
}
function migrateSettings() {
  let changed = false;
  if (!settings.providers) { settings.providers = {}; changed = true; }
  if (!settings.providerVisible) { settings.providerVisible = {}; changed = true; }
  for (const id of PROVIDER_IDS) {
    if (!settings.providers[id]) {
      settings.providers[id] = { label: PROVIDER_PRESETS[id].label, baseUrl: PROVIDER_PRESETS[id].baseUrl, apiKey: '', model: PROVIDER_PRESETS[id].models[0] || '', modelsList: [] };
      changed = true;
    }
    if (!('modelsList' in settings.providers[id])) { settings.providers[id].modelsList = []; changed = true; }
    if (settings.providerVisible[id] === undefined) { settings.providerVisible[id] = true; changed = true; }
  }
  if (!settings.activeProvider || !settings.providers[settings.activeProvider]) { settings.activeProvider = 'openai'; changed = true; }
  if (changed) saveSettings();
}
function loadJSON(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
function saveConvos() {
  try {
    const slim = convos.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachments: (m.attachments || []).map((a) => ({ id: a.id, kind: a.kind, name: a.name, mime: a.mime, size: a.size, text: a.text, transcribed: a.transcribed })),
      })),
    }));
    localStorage.setItem(LS_CONVOS, JSON.stringify(slim));
  } catch {}
}
function saveStats() { localStorage.setItem(LS_STATS, JSON.stringify(stats)); }
function activeProviderCfg() { return settings.providers[settings.activeProvider]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function isAdmin() { return !!admin && sessionStorage.getItem('aichat.admin.session') === '1'; }
function visibleProviders() { return PROVIDER_IDS.filter((id) => isAdmin() || settings.providerVisible[id] !== false); }
function providerModels(id) {
  const p = settings.providers[id];
  return (p.modelsList && p.modelsList.length ? p.modelsList : PROVIDER_PRESETS[id].models);
}
/* فقط مدل‌های واقعاً موجود (لیست دریافت‌شده) — بدون پیش‌فرض‌های ثابت */
function availableModels(id) {
  const p = settings.providers[id];
  return (p.modelsList && p.modelsList.length) ? p.modelsList.slice() : [];
}
/* نام کوتاه نمایشی مدل */
const MODEL_SHORT = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash', 'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite',
  'gemini-2.5-pro': 'Gemini 2.5 Pro', 'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
  'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o mini', 'gpt-4.1': 'GPT-4.1', 'gpt-4.1-mini': 'GPT-4.1 mini',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B', 'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'deepseek-chat': 'DeepSeek V3', 'deepseek-reasoner': 'DeepSeek R1',
  'grok-3': 'Grok 3', 'grok-3-mini': 'Grok 3 Mini',
  'mistral-small-latest': 'Mistral Small', 'mistral-medium-latest': 'Mistral Medium',
  'llama-3.3-70b': 'Llama 3.3 70B',
};
function shortModelName(m) {
  m = String(m || '');
  if (MODEL_SHORT[m]) return MODEL_SHORT[m];
  let s = m;
  s = s.replace(/[-_](20\d{2}[-_]?\d{2}[-_]?\d{2}|\d{1,2}[-_]20\d{2}|\d{8}|\d{3,4})$/, '');
  s = s.replace(/^[^/]+\//, '');
  s = s.split(/[-_]/).map((w) => (/[0-9]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  return s.trim() || m;
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

/* ---------- elements ---------- */
/* LotUS AI Chat — v6.14 */
const APP_VERSION = '6.17';
const $ = (id) => document.getElementById(id);
const messagesEl = $('messages'), welcomeEl = $('welcome'), inputEl = $('input');
const errorBar = $('error-bar');

/* ---------- markdown ---------- */
marked.setOptions({ breaks: true, gfm: true });
/* لینک‌های خروجی مارک‌داون: جلوگیری از tabnabbing */
try {
  DOMPurify.addHook('afterSanitizeAttributes', (n) => {
    if (n.tagName === 'A' && n.getAttribute('target') === '_blank') n.setAttribute('rel', 'noopener noreferrer');
  });
} catch {}
function renderMarkdown(src) {
  const html = marked.parse(src || '');
  const clean = DOMPurify.sanitize(html);
  const tmp = document.createElement('div');
  tmp.innerHTML = clean;
  tmp.querySelectorAll('pre code').forEach((b) => { try { hljs.highlightElement(b); } catch {} });
  return tmp.innerHTML;
}

/* ---------- conversations ---------- */
function getConvo(id) { return convos.find((c) => c.id === id); }
function activeConvo() { return getConvo(activeConvoId); }

function newConvo() {
  const c = { id: uid(), title: 'گفتگوی جدید', messages: [], provider: settings.activeProvider, model: activeProviderCfg().model, createdAt: Date.now(), updatedAt: Date.now() };
  convos.unshift(c); activeConvoId = c.id; saveConvos();
  renderAll();
  inputEl.focus();
}
function setActiveConvo(id) { activeConvoId = id; saveConvos(); renderAll(); document.body.classList.remove('sidebar-open'); }
function deleteConvo(id) {
  convos = convos.filter((c) => c.id !== id);
  if (activeConvoId === id) activeConvoId = convos.length ? convos[0].id : null;
  saveConvos(); renderAll();
}
function touchConvo(c) {
  c.updatedAt = Date.now();
  if (c.title === 'گفتگوی جدید' && c.messages.length >= 2) {
    const firstUser = c.messages.find((m) => m.role === 'user');
    if (firstUser) c.title = firstUser.content.slice(0, 42) + (firstUser.content.length > 42 ? '…' : '');
  }
  convos.sort((a, b) => b.updatedAt - a.updatedAt);
  saveConvos(); renderSidebar();
}

function groupLabel(ts) {
  const day = 86400000;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= start) return 'امروز';
  if (ts >= start - day) return 'دیروز';
  if (ts >= start - 7 * day) return '۷ روز گذشته';
  return 'قدیمی‌تر';
}

function renderSidebar() {
  const list = $('convo-list');
  list.innerHTML = '';
  let items = convos;
  if (convoQuery.trim()) {
    const q = convoQuery.trim();
    items = convos.filter((c) => c.title.includes(q) || c.messages.some((m) => m.content.includes(q)));
  }
  if (!items.length) {
    list.innerHTML = '<div class="convo-empty"><span class="big">' + icon('chatplus') + '</span>' + (convoQuery.trim() ? 'چیزی پیدا نشد.' : 'هنوز گفتگویی نداری.<br>یکی بساز و شروع کن!') + '</div>';
  } else if (convoQuery.trim()) {
    for (const c of items) list.appendChild(convoEl(c));
  } else {
    const pinned = items.filter((c) => c.pinned);
    if (pinned.length) {
      const gl = document.createElement('div');
      gl.className = 'group-label'; gl.textContent = 'سنجاق‌شده';
      list.appendChild(gl);
      for (const c of pinned) list.appendChild(convoEl(c));
    }
    const groups = {};
    for (const c of items) { if (c.pinned) continue; const g = groupLabel(c.updatedAt); (groups[g] = groups[g] || []).push(c); }
    const gl2 = document.createElement('div');
    gl2.className = 'group-label'; gl2.textContent = 'اخیر';
    list.appendChild(gl2);
    for (const g of ['امروز', 'دیروز', '۷ روز گذشته', 'قدیمی‌تر']) {
      if (!groups[g]) continue;
      for (const c of groups[g]) list.appendChild(convoEl(c));
    }
  }
  const p = activeProviderCfg();
  const chipEl = $('active-provider-chip');
  chipEl.innerHTML = '';
  chipEl.appendChild(providerLogo(settings.activeProvider || 'openai'));
  const ct = document.createElement('span');
  ct.innerHTML = 'متصل به <b></b>';
  ct.querySelector('b').textContent = p.label;
  chipEl.appendChild(ct);
  const abBtn = $('btn-admin');
  const abSpan = abBtn.querySelector('span');
  if (abSpan) abSpan.textContent = isAdmin() ? 'پنل مدیر' : 'ورود مدیر';
  $('admin-badge').classList.toggle('hidden', !isAdmin());
  renderMsLabel();
}

function togglePin(id) {
  const c = getConvo(id);
  if (!c) return;
  c.pinned = !c.pinned;
  saveConvos(); renderSidebar();
}

function convoEl(c) {
  const d = document.createElement('div');
  d.className = 'convo' + (c.id === activeConvoId ? ' active' : '') + (c.pinned ? ' pinned' : '');
  d.innerHTML = '<span class="t"></span><span class="convo-actions"><button class="icon-btn pin' + (c.pinned ? ' on' : '') + '" title="سنجاق">' + icon('pin') + '</button><button class="icon-btn rn" title="تغییر نام">' + icon('pencil') + '</button><button class="icon-btn del" title="حذف">' + icon('trash') + '</button></span>';
  d.querySelector('.t').textContent = c.title;
  d.onclick = () => setActiveConvo(c.id);
  d.querySelector('.pin').onclick = (e) => { e.stopPropagation(); togglePin(c.id); };
  d.querySelector('.del').onclick = (e) => { e.stopPropagation(); if (confirm('این گفتگو حذف بشه؟')) deleteConvo(c.id); };
  d.querySelector('.rn').onclick = (e) => { e.stopPropagation(); startRename(c.id, d); };
  return d;
}

function startRename(id, itemEl) {
  const c = getConvo(id);
  if (!c) return;
  const tEl = itemEl.querySelector('.t');
  const inp = document.createElement('input');
  inp.className = 'rename-input';
  inp.value = c.title === 'گفتگوی جدید' ? '' : c.title;
  inp.placeholder = 'نام گفتگو…';
  tEl.replaceWith(inp);
  inp.focus();
  let done = false;
  const finish = (save) => {
    if (done) return; done = true;
    if (save && inp.value.trim()) { c.title = inp.value.trim().slice(0, 60); saveConvos(); }
    renderSidebar();
    if (activeConvoId === id) renderChat();
  };
  inp.onclick = (e) => e.stopPropagation();
  inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); };
  inp.onblur = () => finish(true);
}

/* ---------- قابلیت‌های دراور (v6.7) ---------- */
const FEATURES = {
  images:    { title: 'تصاویر',        icon: 'image',  desc: 'گالری مشترک: تصاویر ساخته‌شده و به اشتراک‌گذاشته‌شده توسط همه کاربران.' },
  library:   { title: 'کتابخانه',      icon: 'book',   desc: 'متن‌ها، کدها و پاسخ‌های مهمی که ذخیره می‌کنی، اینجا نگه داشته می‌شن.' },
  projects:  { title: 'پروژه‌ها',      icon: 'folder', desc: 'گفتگوهای مرتبط رو توی یه پروژه گروه کن تا همیشه منظم و در دسترس بمونن.' },
  scheduled: { title: 'زمان‌بندی‌شده', icon: 'clock',  desc: 'پیام‌های زمان‌بندی‌شده؛ مثلاً هر صبح یه خلاصه خبری یا یادآوری بگیر.' },
  plugins:   { title: 'افزونه‌ها',      icon: 'plug',   desc: 'ابزارهای سریع سمت کاربر: ماشین‌حساب، تبدیل واحد، فرمت‌کننده JSON و تاریخ/زمان — بدون نیاز به کلید API.' },
};
function openFeature(id) {
  const f = FEATURES[id];
  if (!f) return;
  $('feature-title').textContent = f.title;
  const body = $('feature-body');
  body.innerHTML = '<p class="feature-desc"></p><div class="feature-content"></div>';
  body.querySelector('.feature-desc').textContent = f.desc;
  const content = body.querySelector('.feature-content');
  if (id === 'images') renderImageGallery(content);
  else if (id === 'projects') renderProjectsList(content);
  else if (id === 'library') renderLibrary(content);
  else if (id === 'scheduled') renderScheduledList(content);
  else if (id === 'plugins') renderPlugins(content);
  else {
    content.innerHTML = '<div class="feature-empty">' + icon(f.icon) + 'هنوز چیزی اینجا نیست.<br>به‌زودی فعال می‌شه.</div>';
  }
  $('feature-modal').classList.remove('hidden');
  document.body.classList.remove('sidebar-open');
}
function closeFeature() { stopPluginTimers(); $('feature-modal').classList.add('hidden'); }
/* ---------- پروژه‌ها (v6.12) ---------- */
let projects = loadJSON('aichat.projects', []);
function saveProjects() { try { localStorage.setItem('aichat.projects', JSON.stringify(projects)); } catch {} }
function getProject(id) { return projects.find((p) => p.id === id); }
function projectOfConvo(cid) { return projects.find((p) => (p.chatIds || []).includes(cid)); }
let projTab = 'all', projQuery = '';
const PROJ_COLORS = ['#e8e8e8', '#ffd6d6', '#ffe9c4', '#d9f0d0', '#cfe4ff', '#e3d4ff'];

function renderProjectsList(content) {
  const tabs = [['all', 'همه'], ['mine', 'ساخته‌شده توسط شما'], ['shared', 'به اشتراک‌گذاشته‌شده با شما']];
  let html = '<div class="proj-bar"><div class="proj-tabs">';
  for (const [id, label] of tabs) html += '<button class="proj-tab' + (projTab === id ? ' active' : '') + '" data-tab="' + id + '">' + label + '</button>';
  html += '</div><button class="btn-icon" id="proj-new-top" title="پروژه جدید">' + icon('plus') + '</button></div>';
  html += '<div class="proj-list" id="proj-list"></div>';
  html += '<div class="proj-search"><input id="proj-q" placeholder="جستجو" value="' + escapeHtml(projQuery) + '"></div>';
  content.innerHTML = html;
  content.querySelectorAll('.proj-tab').forEach((b) => { b.onclick = () => { projTab = b.dataset.tab; renderProjectsList(content); }; });
  $('proj-new-top').onclick = () => renderProjectForm(content, null);
  $('proj-q').oninput = (e) => { projQuery = e.target.value; paintProjList(); };
  paintProjList();
}
function paintProjList() {
  const box = $('proj-list');
  if (!box) return;
  let list = projects.slice().sort((a, b) => b.createdAt - a.createdAt);
  if (projTab === 'shared') {
    box.innerHTML = '<div class="feature-empty">' + icon('folder') + 'اشتراک‌گذاری پروژه‌ها به حساب کاربری نیاز داره و فعلاً پشتیبانی نمی‌شه.</div>';
    return;
  }
  if (projQuery.trim()) list = list.filter((p) => (p.name + ' ' + (p.desc || '')).includes(projQuery.trim()));
  if (!list.length) {
    box.innerHTML = '<div class="feature-empty">' + icon('folder') +
      '<div class="proj-empty-title">اولین پروژه‌ات رو شروع کن</div>' +
      '<div class="proj-empty-sub">پروژه‌ها بهت کمک می‌کنن چت‌ها، فایل‌ها و ابزارها رو یه جا منظم کنی</div>' +
      '<div class="modal-actions" style="justify-content:center"><button class="btn-primary" id="proj-new-empty">پروژه جدید</button></div></div>';
    const b = $('proj-new-empty');
    if (b) b.onclick = () => renderProjectForm($('feature-body').querySelector('.feature-content'), null);
    return;
  }
  box.innerHTML = '';
  for (const p of list) {
    const card = document.createElement('button');
    card.className = 'proj-card';
    const dot = document.createElement('span');
    dot.className = 'proj-dot'; dot.style.background = p.color || '#e8e8e8';
    const info = document.createElement('span');
    info.className = 'proj-info';
    const nm = document.createElement('span'); nm.className = 'proj-name'; nm.textContent = p.name;
    info.appendChild(nm);
    if (p.desc) { const ds = document.createElement('span'); ds.className = 'proj-desc'; ds.textContent = p.desc; info.appendChild(ds); }
    const meta = document.createElement('span'); meta.className = 'proj-meta';
    meta.textContent = (p.chatIds || []).length + ' گفتگو · ' + (p.files || []).length + ' فایل';
    info.appendChild(meta);
    card.appendChild(dot); card.appendChild(info);
    card.appendChild(icon('chev-l'));
    card.onclick = () => renderProjectDetail($('feature-body').querySelector('.feature-content'), p.id);
    box.appendChild(card);
  }
}
function renderProjectForm(content, p) {
  const isNew = !p;
  p = p || { name: '', desc: '', color: PROJ_COLORS[0] };
  let sel = p.color || PROJ_COLORS[0];
  content.innerHTML =
    '<div class="proj-form"><h3>' + (isNew ? 'پروژه جدید' : 'ویرایش پروژه') + '</h3>' +
    '<label>نام پروژه<input id="pf-name" maxlength="60" value="' + escapeHtml(p.name) + '" placeholder="مثلاً: پایان‌نامه"></label>' +
    '<label>توضیح (اختیاری)<input id="pf-desc" maxlength="140" value="' + escapeHtml(p.desc || '') + '" placeholder="این پروژه برای چیه؟"></label>' +
    '<div class="pf-colors" id="pf-colors"></div>' +
    '<div class="modal-actions"><button class="btn-ghost" id="pf-cancel">انصراف</button>' +
    '<button class="btn-primary" id="pf-save">' + (isNew ? 'ساخت پروژه' : 'ذخیره') + '</button></div></div>';
  const cw = $('pf-colors');
  for (const c of PROJ_COLORS) {
    const d = document.createElement('button');
    d.className = 'pf-color' + (c === sel ? ' sel' : '');
    d.style.background = c; d.dataset.c = c;
    d.onclick = () => { sel = c; cw.querySelectorAll('.pf-color').forEach((x) => x.classList.toggle('sel', x.dataset.c === c)); };
    cw.appendChild(d);
  }
  $('pf-cancel').onclick = () => isNew ? renderProjectsList(content) : renderProjectDetail(content, p.id);
  $('pf-save').onclick = () => {
    const name = $('pf-name').value.trim();
    if (!name) { $('pf-name').focus(); return; }
    if (isNew) {
      const np = { id: uid(), name, desc: $('pf-desc').value.trim(), color: sel, createdAt: Date.now(), instructions: '', chatIds: [], files: [] };
      projects.push(np); saveProjects();
      renderProjectDetail(content, np.id);
    } else {
      const cur = getProject(p.id);
      if (cur) { cur.name = name; cur.desc = $('pf-desc').value.trim(); cur.color = sel; saveProjects(); }
      renderProjectDetail(content, p.id);
    }
  };
  setTimeout(() => $('pf-name').focus(), 50);
}
function renderProjectDetail(content, pid) {
  const p = getProject(pid);
  if (!p) { renderProjectsList(content); return; }
  content.innerHTML =
    '<div class="proj-detail">' +
    '<div class="proj-dhead"><button class="btn-icon" id="pd-back">' + icon('arrow-r') + '</button>' +
    '<span class="proj-dot" id="pd-dot"></span>' +
    '<div class="pd-title"><div class="pd-name" id="pd-name"></div><div class="pd-sub" id="pd-sub"></div></div>' +
    '<button class="btn-icon" id="pd-edit" title="ویرایش">' + icon('edit') + '</button>' +
    '<button class="btn-icon danger" id="pd-del" title="حذف پروژه">' + icon('trash') + '</button></div>' +
    '<div class="pd-sec"><div class="pd-sec-t">دستورالعمل سفارشی</div>' +
    '<p class="note">این متن به‌عنوان راهنمای رفتاری، به همه گفتگوهای این پروژه اضافه می‌شه.</p>' +
    '<textarea id="pd-inst" rows="3" placeholder="مثلاً: همیشه خلاصه و با مثال جواب بده…"></textarea>' +
    '<div class="modal-actions"><button class="btn-ghost small" id="pd-inst-save">ذخیره دستورالعمل</button></div></div>' +
    '<div class="pd-sec"><div class="pd-sec-t">فایل‌ها <span class="pd-count" id="pd-fcount"></span></div>' +
    '<p class="note">فایل‌های متنی و عکس‌ها به‌عنوان زمینه مشترک به همه گفتگوهای پروژه اضافه می‌شن.</p>' +
    '<div id="pd-files"></div>' +
    '<div class="modal-actions"><button class="btn-ghost small" id="pd-addfile">افزودن فایل</button>' +
    '<input type="file" id="pd-fileinput" class="hidden" multiple></div></div>' +
    '<div class="pd-sec"><div class="pd-sec-t">گفتگوها <span class="pd-count" id="pd-ccount"></span></div>' +
    '<div id="pd-chats"></div>' +
    '<div class="modal-actions"><button class="btn-ghost small" id="pd-addchat">افزودن گفتگو</button></div></div>' +
    '</div>';
  $('pd-dot').style.background = p.color || '#e8e8e8';
  $('pd-name').textContent = p.name;
  $('pd-sub').textContent = p.desc || '';
  $('pd-inst').value = p.instructions || '';
  $('pd-back').onclick = () => renderProjectsList(content);
  $('pd-edit').onclick = () => renderProjectForm(content, p);
  const delBtn = $('pd-del');
  delBtn.onclick = () => {
    if (delBtn.dataset.arm) { projects = projects.filter((x) => x.id !== p.id); saveProjects(); renderProjectsList(content); }
    else { delBtn.dataset.arm = '1'; delBtn.classList.add('armed'); setTimeout(() => { delBtn.dataset.arm = ''; delBtn.classList.remove('armed'); }, 2500); }
  };
  delBtn.title = 'برای حذف، دو بار بزن';
  $('pd-inst-save').onclick = () => { p.instructions = $('pd-inst').value.trim(); saveProjects(); $('pd-inst-save').textContent = 'ذخیره شد ✓'; setTimeout(() => { const b = $('pd-inst-save'); if (b) b.textContent = 'ذخیره دستورالعمل'; }, 1200); };
  paintProjectFiles(p);
  paintProjectChats(p, content);
  $('pd-addfile').onclick = () => $('pd-fileinput').click();
  $('pd-fileinput').onchange = (e) => addProjectFiles(p, e.target.files, content);
  $('pd-addchat').onclick = () => renderChatPicker(content, p);
}
function paintProjectFiles(p) {
  const box = $('pd-files');
  if (!box) return;
  $('pd-fcount').textContent = ' (' + (p.files || []).length + ')';
  box.innerHTML = '';
  if (!(p.files || []).length) { box.innerHTML = '<div class="pd-empty">فایلی اضافه نشده.</div>'; return; }
  for (const f of p.files) {
    const row = document.createElement('div');
    row.className = 'pfile-row';
    const nm = document.createElement('span'); nm.className = 'pfile-name'; nm.textContent = f.name;
    const sz = document.createElement('span'); sz.className = 'pfile-size'; sz.textContent = f.kind === 'text' ? 'متن' : 'عکس';
    const del = document.createElement('button'); del.className = 'btn-icon small danger'; del.innerHTML = icon('x');
    del.onclick = () => { p.files = p.files.filter((x) => x.id !== f.id); saveProjects(); paintProjectFiles(p); };
    row.appendChild(nm); row.appendChild(sz); row.appendChild(del);
    box.appendChild(row);
  }
}
async function addProjectFiles(p, fileList, content) {
  const files = Array.from(fileList || []);
  for (const f of files) {
    if ((p.files || []).length >= 8) { showError('حداکثر ۸ فایل در هر پروژه.'); break; }
    if (f.size > 8 * 1024 * 1024) { showError('«' + f.name + '» بزرگ‌تر از ۸ مگابایته.'); continue; }
    try {
      const rec = { id: uid(), name: f.name };
      if ((f.type || '').startsWith('image/')) { rec.kind = 'image'; rec.dataUrl = await fileToDataUrl(f, 768); }
      else if (isTextFile(f)) { rec.kind = 'text'; rec.text = await readTextFile(f, 15000); }
      else { showError('«' + f.name + '» پشتیبانی نمی‌شه (فقط متن و عکس).'); continue; }
      p.files = p.files || [];
      p.files.push(rec);
    } catch { showError('خواندن «' + f.name + '» ممکن نشد.'); }
  }
  saveProjects();
  renderProjectDetail(content, p.id);
}
function paintProjectChats(p, content) {
  const box = $('pd-chats');
  if (!box) return;
  $('pd-ccount').textContent = ' (' + (p.chatIds || []).length + ')';
  box.innerHTML = '';
  const chats = (p.chatIds || []).map(getConvo).filter(Boolean);
  if (!chats.length) { box.innerHTML = '<div class="pd-empty">گفتگویی اضافه نشده.</div>'; return; }
  for (const c of chats) {
    const row = document.createElement('button');
    row.className = 'pchat-row';
    const t = document.createElement('span'); t.className = 'pchat-t'; t.textContent = c.title || 'گفتگوی بدون عنوان';
    const n = document.createElement('span'); n.className = 'pchat-n'; n.textContent = (c.messages || []).length + ' پیام';
    row.appendChild(t); row.appendChild(n);
    row.onclick = () => { setActiveConvo(c.id); closeFeature(); };
    const rm = document.createElement('span');
    rm.className = 'pchat-rm'; rm.innerHTML = icon('x'); rm.title = 'حذف از پروژه';
    rm.onclick = (e) => { e.stopPropagation(); p.chatIds = p.chatIds.filter((x) => x !== c.id); saveProjects(); paintProjectChats(p, content); };
    row.appendChild(rm);
    box.appendChild(row);
  }
}
function renderChatPicker(content, p) {
  const avail = convos.filter((c) => !(p.chatIds || []).includes(c.id));
  content.innerHTML =
    '<div class="proj-detail"><div class="proj-dhead"><button class="btn-icon" id="cp-back">' + icon('arrow-r') + '</button>' +
    '<div class="pd-title"><div class="pd-name">افزودن گفتگو</div><div class="pd-sub">به «' + escapeHtml(p.name) + '»</div></div></div>' +
    '<div id="cp-list"></div></div>';
  $('cp-back').onclick = () => renderProjectDetail(content, p.id);
  const box = $('cp-list');
  if (!avail.length) { box.innerHTML = '<div class="pd-empty">همه گفتگوها قبلاً اضافه شدن یا گفتگویی نیست.</div>'; return; }
  for (const c of avail) {
    const row = document.createElement('button');
    row.className = 'pchat-row';
    const t = document.createElement('span'); t.className = 'pchat-t'; t.textContent = c.title || 'گفتگوی بدون عنوان';
    const add = document.createElement('span'); add.className = 'pchat-add'; add.textContent = 'افزودن';
    row.appendChild(t); row.appendChild(add);
    row.onclick = () => { p.chatIds = p.chatIds || []; p.chatIds.push(c.id); saveProjects(); renderProjectDetail(content, p.id); };
    box.appendChild(row);
  }
}
/* تزریق زمینه پروژه به پیام‌های API */
function projectContext(p) {
  const sys = [];
  if (p.instructions && p.instructions.trim()) sys.push('دستورالعمل پروژه «' + p.name + '»:\n' + p.instructions.trim().slice(0, 8000));
  let budget = 40000; /* سقف کلی متن فایل‌ها تا پیام از ظرفیت مدل نزنه بیرون */
  for (const f of (p.files || [])) {
    if (budget <= 0) break;
    if (f.kind === 'text' && f.text) {
      const t = String(f.text).slice(0, Math.min(15000, budget));
      sys.push('📄 محتوای فایل «' + f.name + '» (زمینه مشترک پروژه):\n```\n' + t + '\n```');
      budget -= t.length;
    }
  }
  return sys.join('\n\n');
}

/* ---------- toast (v6.17): اعلان کوتاه پایین صفحه ---------- */
function toast(msg, kind) {
  let t = document.getElementById('app-toast');
  if (!t) { t = document.createElement('div'); t.id = 'app-toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast show ' + (kind || '');
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.className = 'toast ' + (kind || ''); }, 2800);
}
/* تاریخ/ساعت شمسی با Intl (بدون وابستگی خارجی) */
function fmtFaDateTime(ts) {
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts)); }
  catch { return new Date(ts).toLocaleString('fa-IR'); }
}

/* ---------- کتابخانه (v6.17): ذخیره پاسخ‌ها و کدهای مهم ---------- */
const LS_LIBRARY = 'aichat.library.v1';
let library = loadJSON(LS_LIBRARY, []);
let libTab = 'all', libQuery = '';
function saveLibrary() { try { localStorage.setItem(LS_LIBRARY, JSON.stringify(library.slice(0, 400))); } catch {} }
function libIsSaved(convoId, content) { return library.some((it) => it.convoId === convoId && it.content === content); }
function libItemKind(content) { return /```/.test(String(content || '')) ? 'code' : 'text'; }
function libTitle(content) {
  const first = String(content || '').replace(/```[\s\S]*?```/g, ' [کد] ').replace(/[#*`>_~|[\](){}]/g, ' ').replace(/\s+/g, ' ').trim();
  return (first || 'آیتم ذخیره‌شده').slice(0, 80);
}
function renderLibrary(content) {
  stopPluginTimers();
  const tabs = [['all', 'همه'], ['text', 'متن'], ['code', 'کد']];
  let html = '<div class="proj-bar"><div class="proj-tabs">';
  for (const [id, label] of tabs) html += '<button class="proj-tab' + (libTab === id ? ' active' : '') + '" data-libtab="' + id + '">' + label + '</button>';
  html += '</div><span class="lib-count" id="lib-count"></span></div>';
  html += '<div class="proj-search"><input id="lib-q" placeholder="جستجو در کتابخانه…" value="' + escapeHtml(libQuery) + '"></div>';
  html += '<div class="lib-list" id="lib-list"></div>';
  content.innerHTML = html;
  content.querySelectorAll('[data-libtab]').forEach((b) => { b.onclick = () => { libTab = b.dataset.libtab; renderLibrary(content); }; });
  $('lib-q').oninput = (e) => { libQuery = e.target.value; paintLibList(); };
  paintLibList();
}
function paintLibList() {
  const box = $('lib-list');
  if (!box) return;
  const cnt = $('lib-count');
  if (cnt) cnt.textContent = library.length ? library.length + ' آیتم' : '';
  let list = library.slice().sort((a, b) => b.savedAt - a.savedAt);
  if (libTab !== 'all') list = list.filter((it) => it.kind === libTab);
  if (libQuery.trim()) { const q = libQuery.trim(); list = list.filter((it) => (it.content + ' ' + (it.convoTitle || '')).includes(q)); }
  if (!list.length) {
    box.innerHTML = '<div class="feature-empty">' + icon('bookmark') + (library.length ? 'چیزی پیدا نشد.' : 'هنوز چیزی در کتابخانه ذخیره نشده.<br>با دکمه‌ی نشانک (🔖) زیر هر پاسخ، متن یا کد مهم رو ذخیره کن.') + '</div>';
    return;
  }
  box.innerHTML = '';
  for (const it of list) {
    const card = document.createElement('div');
    card.className = 'lib-card';
    const convoExists = !!getConvo(it.convoId);
    card.innerHTML =
      '<div class="lib-head"><span class="lib-kind ' + it.kind + '">' + (it.kind === 'code' ? 'کد' : 'متن') + '</span><span class="lib-date"></span></div>' +
      '<div class="lib-title"></div>' +
      '<pre class="lib-prev"></pre>' +
      '<div class="lib-meta"></div>' +
      '<div class="lib-acts">' +
        '<button class="act-btn" data-la="copy" title="کپی">' + icon('copy') + '</button>' +
        (convoExists ? '<button class="act-btn" data-la="open" title="باز کردن گفتگو">' + icon('chatplus') + '</button>' : '') +
        '<button class="act-btn" data-la="del" title="حذف">' + icon('trash') + '</button>' +
      '</div>';
    card.querySelector('.lib-date').textContent = fmtFaDateTime(it.savedAt);
    card.querySelector('.lib-title').textContent = libTitle(it.content);
    card.querySelector('.lib-prev').textContent = String(it.content).replace(/```([\s\S]*?)```/g, (m, g1) => '```' + g1.slice(0, 140) + (g1.length > 140 ? '…' : '') + '```').slice(0, 500);
    card.querySelector('.lib-meta').textContent = (it.convoTitle || 'گفتگو') + (it.model ? ' · ' + shortModelName(it.model) : '');
    card.querySelector('[data-la="copy"]').onclick = () => {
      navigator.clipboard.writeText(it.content).then(() => toast('کپی شد.', 'ok')).catch(() => toast('کپی نشد.', 'err'));
    };
    const ob = card.querySelector('[data-la="open"]');
    if (ob) ob.onclick = () => { closeFeature(); setActiveConvo(it.convoId); };
    card.querySelector('[data-la="del"]').onclick = () => { library = library.filter((x) => x.id !== it.id); saveLibrary(); paintLibList(); };
    box.appendChild(card);
  }
}

/* ---------- زمان‌بندی‌شده (v6.17): زمان‌بند سمت کاربر ---------- */
const LS_SCHEDULED = 'aichat.scheduled.v1';
let scheduled = loadJSON(LS_SCHEDULED, []);
let schedBusy = false;
const WEEKDAYS_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']; /* index = Date.getDay() */
function saveScheduled() { try { localStorage.setItem(LS_SCHEDULED, JSON.stringify(scheduled)); } catch {} }
function schedTimeParts(t) { const p = String(t.time || '09:00').split(':'); return [+(p[0] || 9), +(p[1] || 0)]; }
function nextRunAfter(t, from) {
  const now = from instanceof Date ? from : new Date(from == null ? Date.now() : from);
  const [hh, mm] = schedTimeParts(t);
  if (t.repeat === 'once') {
    if (!t.date) return null;
    const d = new Date(t.date + 'T' + (t.time || '09:00'));
    return (isNaN(d.getTime()) || d <= now) ? null : d;
  }
  if (t.repeat === 'daily') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm, 0, 0);
    if (d.getDay() === (+t.weekday || 0) && d > now) return d;
  }
  return null;
}
/* آیا این تسک الان باید اجرا بشه؟ (اگه ظرف ۲ دقیقه‌ی آخر اجرا نشده باشه) */
function schedDue(t, now) {
  if (!t.enabled) return false;
  now = now instanceof Date ? now : new Date(now);
  const [hh, mm] = schedTimeParts(t);
  if (t.repeat === 'once') {
    if (!t.date) return false;
    const d = new Date(t.date + 'T' + (t.time || '09:00'));
    return !isNaN(d.getTime()) && d.getTime() <= now && !t.lastRun;
  }
  let cand = null;
  if (t.repeat === 'daily') {
    cand = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0).getTime();
  } else {
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, hh, mm, 0, 0);
      if (d.getDay() === (+t.weekday || 0)) { cand = d.getTime(); break; }
    }
    if (cand == null) return false;
  }
  if (cand > now) return false;
  return !(t.lastRun && t.lastRun >= cand - 120000);
}
function schedDesc(t) {
  const tm = t.time || '09:00';
  if (t.repeat === 'daily') return 'هر روز ' + tm;
  if (t.repeat === 'weekly') return 'هر ' + WEEKDAYS_FA[+t.weekday || 0] + '، ساعت ' + tm;
  if (t.date) {
    const d = new Date(t.date + 'T' + tm);
    return isNaN(d.getTime()) ? 'یک‌بار' : fmtFaDateTime(d.getTime()) + ' (یک‌بار)';
  }
  return 'یک‌بار';
}
async function runScheduledTask(t) {
  const cfg = settings.providers[settings.activeProvider] || {};
  if (!(cfg.apiKey || '').trim()) { toast('برای اجرای تسک، اول به یک API وصل شو.', 'err'); return false; }
  let c = (t.convoId && getConvo(t.convoId)) || null;
  if (!c) {
    c = { id: uid(), title: '⏰ ' + (t.name || 'تسک زمان‌بندی‌شده'), messages: [], provider: settings.activeProvider, model: cfg.model, createdAt: Date.now(), updatedAt: Date.now() };
    convos.unshift(c);
  }
  c.messages.push({ role: 'user', content: t.prompt, scheduledFrom: t.name || '' });
  if (activeConvoId !== c.id) { activeConvoId = c.id; saveConvos(); }
  renderAll();
  await runAssistant(c);
  saveConvos();
  return true;
}
async function tickScheduler() {
  if (schedBusy || aborter) return;
  const now = Date.now();
  const due = scheduled.filter((t) => schedDue(t, now));
  if (!due.length) return;
  for (const t of due) {
    schedBusy = true;
    try {
      const ok = await runScheduledTask(t);
      if (ok) {
        t.lastRun = Date.now();
        if (t.repeat === 'once') t.enabled = false;
        toast('⏰ تسک «' + (t.name || '') + '» اجرا شد.', 'ok');
      } else if (t.repeat === 'once') t.enabled = false;
    } catch { t.lastRun = Date.now(); if (t.repeat === 'once') t.enabled = false; }
    schedBusy = false;
  }
  saveScheduled();
  renderAll();
  const fm = $('feature-modal');
  if (!fm.classList.contains('hidden')) {
    const content = fm.querySelector('.feature-content');
    if (content && $('feature-title').textContent === 'زمان‌بندی‌شده') renderScheduledList(content);
  }
}
function renderScheduledList(content) {
  stopPluginTimers();
  let html = '<div class="proj-bar"><span class="sched-note">⏰ تسک‌ها فقط در حالی که سایت بازه توی مرورگرت اجرا می‌شن.</span>' +
    '<button class="btn-ghost small" id="sched-new">' + icon('plus') + ' تسک جدید</button></div>';
  html += '<div class="sched-list" id="sched-list"></div>';
  content.innerHTML = html;
  $('sched-new').onclick = () => renderScheduledForm(content, null);
  paintSchedList();
}
function paintSchedList() {
  const box = $('sched-list');
  if (!box) return;
  if (!scheduled.length) {
    box.innerHTML = '<div class="feature-empty">' + icon('clock') + 'هنوز تسک زمان‌بندی‌شده‌ای نداری.<br>مثلاً «خلاصه خبرهای صبح» هر روز ۹ صبح یا «یادآوری تمرین» هر شنبه.' +
      '<div class="modal-actions" style="justify-content:center"><button class="btn-primary" id="sched-new-empty">ساختن اولین تسک</button></div></div>';
    const b = $('sched-new-empty');
    if (b) b.onclick = () => renderScheduledForm($('feature-body').querySelector('.feature-content'), null);
    return;
  }
  box.innerHTML = '';
  const list = scheduled.slice().sort((a, b) => (a.enabled === b.enabled) ? 0 : (a.enabled ? -1 : 1));
  for (const t of list) {
    const nr = nextRunAfter(t, new Date());
    const done = t.repeat === 'once' && !t.enabled && t.lastRun;
    const card = document.createElement('div');
    card.className = 'sched-card' + (t.enabled ? '' : ' paused');
    card.innerHTML =
      '<div class="sched-head"><span class="sched-dot ' + (t.enabled ? (done ? 'done' : 'live') : 'off') + '"></span><b class="sched-name"></b>' +
      '<span class="sched-status">' + (done ? 'انجام شد' : (t.enabled ? 'فعال' : 'متوقف')) + '</span></div>' +
      '<div class="sched-prompt"></div>' +
      '<div class="sched-meta"></div><div class="sched-next"></div>' +
      '<div class="sched-acts">' +
        '<button class="act-btn" data-sa="run" title="الان اجرا کن">' + icon('play') + '</button>' +
        (t.repeat !== 'once' ? '<button class="act-btn" data-sa="toggle" title="' + (t.enabled ? 'توقف' : 'فعال‌سازی') + '">' + icon(t.enabled ? 'pause' : 'play') + '</button>' : '') +
        '<button class="act-btn" data-sa="del" title="حذف">' + icon('trash') + '</button>' +
      '</div>';
    card.querySelector('.sched-name').textContent = t.name || 'تسک';
    card.querySelector('.sched-prompt').textContent = t.prompt || '';
    card.querySelector('.sched-meta').textContent = schedDesc(t) + (t.convoId ? ' · در گفتگوی مشخص' : ' · گفتگوی جدید');
    card.querySelector('.sched-next').textContent = t.enabled && nr ? 'اجرای بعدی: ' + fmtFaDateTime(nr.getTime()) : (done && t.lastRun ? 'آخرین اجرا: ' + fmtFaDateTime(t.lastRun) : '');
    card.querySelector('[data-sa="run"]').onclick = async () => {
      if (schedBusy) return;
      schedBusy = true;
      try {
        const ok = await runScheduledTask(t);
        if (ok) { t.lastRun = Date.now(); if (t.repeat === 'once') t.enabled = false; saveScheduled(); toast('⏰ تسک «' + (t.name || '') + '» اجرا شد.', 'ok'); }
      } finally { schedBusy = false; paintSchedList(); }
    };
    const tog = card.querySelector('[data-sa="toggle"]');
    if (tog) tog.onclick = () => { t.enabled = !t.enabled; saveScheduled(); paintSchedList(); };
    card.querySelector('[data-sa="del"]').onclick = () => { if (!confirm('این تسک حذف بشه؟')) return; scheduled = scheduled.filter((x) => x.id !== t.id); saveScheduled(); paintSchedList(); };
    box.appendChild(card);
  }
}
function renderScheduledForm(content, t) {
  stopPluginTimers();
  const isEdit = !!t;
  let html = '<div class="proj-dhead"><button class="btn-icon" id="sched-back">' + icon('arrow-r') + '</button><b>' + (isEdit ? 'ویرایش تسک' : 'تسک زمان‌بندی‌شده جدید') + '</b></div>';
  html += '<label>نام تسک<input id="sc-name" placeholder="مثلاً: خلاصه خبرهای صبح"></label>';
  html += '<label>پیامی که فرستاده می‌شه<textarea id="sc-prompt" rows="3" placeholder="مثلاً: ۵ خبر مهم امروز رو به فارسی خلاصه کن"></textarea></label>';
  html += '<div class="sched-row"><label>تکرار<select id="sc-repeat">' +
    '<option value="once">یک‌بار</option><option value="daily">هر روز</option><option value="weekly">هفتگی</option>' +
    '</select></label><label>ساعت<input type="time" id="sc-time" dir="ltr"></label></div>';
  html += '<div id="sc-date-wrap"><label>تاریخ<input type="date" id="sc-date" dir="ltr"></label></div>';
  html += '<div id="sc-week-wrap" class="hidden"><label>روز هفته<select id="sc-week">' + WEEKDAYS_FA.map((d, i) => '<option value="' + i + '">' + d + '</option>').join('') + '</select></label></div>';
  html += '<label>مقصد<select id="sc-target"><option value="">گفتگوی جدید</option></select></label>';
  html += '<div class="modal-actions"><button class="btn-primary" id="sc-save">ذخیره</button><button class="btn-ghost" id="sc-cancel">انصراف</button></div>';
  content.innerHTML = html;
  const rep = $('sc-repeat');
  const upd = () => { $('sc-date-wrap').classList.toggle('hidden', rep.value !== 'once'); $('sc-week-wrap').classList.toggle('hidden', rep.value !== 'weekly'); };
  rep.onchange = upd;
  const tgt = $('sc-target');
  for (const c of convos.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50)) {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.title || 'گفتگو';
    tgt.appendChild(o);
  }
  if (isEdit) {
    $('sc-name').value = t.name || ''; $('sc-prompt').value = t.prompt || '';
    rep.value = t.repeat || 'once'; $('sc-time').value = t.time || '09:00';
    $('sc-date').value = t.date || ''; $('sc-week').value = String(+t.weekday || 0);
    tgt.value = t.convoId || '';
  } else {
    $('sc-time').value = '09:00';
    $('sc-date').value = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  }
  upd();
  $('sched-back').onclick = () => renderScheduledList(content);
  $('sc-cancel').onclick = () => renderScheduledList(content);
  $('sc-save').onclick = () => {
    const name = $('sc-name').value.trim(), prompt = $('sc-prompt').value.trim();
    if (!name) { toast('نام تسک رو بنویس.', 'err'); return; }
    if (!prompt) { toast('پیام تسک رو بنویس.', 'err'); return; }
    const repeat = rep.value, time = $('sc-time').value || '09:00';
    const t2 = {
      id: t ? t.id : uid(), name, prompt, repeat, time,
      date: repeat === 'once' ? ($('sc-date').value || '') : '',
      weekday: repeat === 'weekly' ? +$('sc-week').value : 0,
      convoId: tgt.value || '',
      enabled: t ? t.enabled !== false : true,
      lastRun: t ? t.lastRun : null,
      createdAt: t ? t.createdAt : Date.now(),
    };
    if (repeat === 'once' && !t2.date) { toast('برای تسک یک‌بار، تاریخ انتخاب کن.', 'err'); return; }
    if (isEdit) scheduled = scheduled.map((x) => (x.id === t2.id ? t2 : x));
    else scheduled.push(t2);
    saveScheduled();
    toast('تسک ذخیره شد؛ به‌محض اینکه ساعتش بشه و سایت باز باشه، اجرا می‌شه.', 'ok');
    renderScheduledList(content);
  };
}

/* ---------- افزونه‌ها (v6.17): ابزارهای سریع سمت کاربر ---------- */
const PLUGINS = [
  { id: 'calc', name: 'ماشین‌حساب', icon: 'calc', desc: 'حساب‌های ریاضی + توابع مثل sin، cos، sqrt و log' },
  { id: 'convert', name: 'تبدیل واحد', icon: 'swap', desc: 'طول، وزن، دما، حجم داده و زمان' },
  { id: 'json', name: 'فرمت‌کننده JSON', icon: 'braces', desc: 'اعتبارسنجی، فرمت کردن یا فشرده‌سازی JSON' },
  { id: 'time', name: 'تاریخ و زمان', icon: 'calendar', desc: 'تقویم شمسی و میلادی + ساعت مناطق مختلف' },
];
let pluginTimer = null;
function stopPluginTimers() { if (pluginTimer) { clearInterval(pluginTimer); pluginTimer = null; } }
function renderPlugins(content) {
  stopPluginTimers();
  let html = '<div class="plug-grid">';
  for (const p of PLUGINS) html += '<button class="plug-card" data-plug="' + p.id + '"><span class="plug-ico">' + icon(p.icon) + '</span><b></b><span class="plug-desc"></span></button>';
  html += '</div><p class="feature-note">این ابزارها کاملاً داخل مرورگرت اجرا می‌شن — بدون نیاز به کلید API.</p>';
  content.innerHTML = html;
  content.querySelectorAll('[data-plug]').forEach((b) => {
    const p = PLUGINS.find((x) => x.id === b.dataset.plug);
    b.querySelector('b').textContent = p.name;
    b.querySelector('.plug-desc').textContent = p.desc;
    b.onclick = () => renderPluginTool(content, p.id);
  });
}
function renderPluginTool(content, id) {
  stopPluginTimers();
  const p = PLUGINS.find((x) => x.id === id);
  const head = '<div class="proj-dhead"><button class="btn-icon" id="plug-back">' + icon('arrow-r') + '</button><b>' + p.name + '</b></div>';
  let body = '';
  if (id === 'calc') body = renderCalcTool();
  else if (id === 'convert') body = renderConvertTool();
  else if (id === 'json') body = renderJsonTool();
  else body = renderTimeTool();
  content.innerHTML = head + body;
  $('plug-back').onclick = () => renderPlugins(content);
  if (id === 'calc') wireCalc();
  else if (id === 'convert') wireConvert();
  else if (id === 'json') wireJson();
  else { paintTime(); pluginTimer = setInterval(paintTime, 1000); }
}
/* ماشین‌حساب: پارسر صعودی بازگشتی — هیچ eval ای اجرا نمی‌شه */
function calcEval(src) {
  const s = String(src).replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/\s+/g, '');
  if (!s) throw new Error('عبارت خالی است');
  if (/[^0-9a-zA-Z+\-*/%^().,]/.test(s)) throw new Error('فقط اعداد و عملیات مجاز وارد کن');
  const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, log: Math.log, log10: Math.log10, log2: Math.log2, floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, pow: Math.pow, sign: Math.sign };
  const CONSTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };
  let i = 0;
  const peek = () => s[i];
  const eat = (c) => { if (s[i] !== c) throw new Error('انتظار ' + c + ' بود'); i++; };
  function parseExpr() {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = parseTerm(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function parseTerm() {
    let v = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') { const op = s[i++]; const r = parseUnary(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; }
    return v;
  }
  function parseUnary() {
    if (peek() === '-') { i++; return -parseUnary(); }
    if (peek() === '+') { i++; return parseUnary(); }
    return parsePower();
  }
  function parsePower() {
    const base = parseAtom();
    if (peek() === '^') { i++; return Math.pow(base, parseUnary()); }
    return base;
  }
  function parseAtom() {
    if (peek() === '(') { i++; const v = parseExpr(); eat(')'); return v; }
    if (/[0-9.]/.test(peek() || '')) {
      let n = '';
      while (i < s.length && /[0-9.]/.test(s[i])) n += s[i++];
      const v = Number(n);
      if (!isFinite(v)) throw new Error('عدد نامعتبر: ' + n);
      return v;
    }
    if (/[a-zA-Z]/.test(peek() || '')) {
      let n = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) n += s[i++];
      if (peek() === '(') {
        i++;
        const args = [parseExpr()];
        while (peek() === ',') { i++; args.push(parseExpr()); }
        eat(')');
        const f = FUNCS[n];
        if (!f) throw new Error('تابع ناشناخته: ' + n);
        return f.apply(null, args);
      }
      if (n in CONSTS) return CONSTS[n];
      if (n in FUNCS) throw new Error('توابع باید پرانتز داشته باشند: ' + n + '(…)');
      throw new Error('ناشناخته: ' + n);
    }
    throw new Error('نشانه‌ی عجیب: ' + (peek() || 'پایان عبارت'));
  }
  const result = parseExpr();
  if (i < s.length) throw new Error('پایان عبارت قابل فهم نبود');
  if (typeof result !== 'number' || isNaN(result)) throw new Error('نتیجه عددی نیست');
  if (!isFinite(result)) throw new Error('نتیجه بی‌نهایت است (تقسیم بر صفر؟)');
  return result;
}
function fmtNum(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e15 || a < 1e-9) return v.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Math.round(v * 1e12) / 1e12);
}
function renderCalcTool() {
  let h = '<div class="calc-box"><input id="calc-in" dir="ltr" placeholder="مثلاً: (2+3)*sqrt(16)" autocomplete="off" spellcheck="false">';
  h += '<div class="calc-result" id="calc-res">= ?</div><div class="calc-keys">';
  for (const k of ['pi', 'sqrt', 'sin', 'cos', 'log', '(', ')', '^', '/', '*', '-', '+']) h += '<button data-ck="' + k + '">' + (k === 'pi' ? 'π' : k) + '</button>';
  h += '<button data-ck="clear">C</button></div>';
  h += '<div class="calc-hint">توابع: sin cos tan asin acos atan sqrt cbrt abs exp log log10 log2 floor ceil round min max pow sign — ثابت‌ها: pi ، e ، tau — مثال: 2^10 ، sin(pi/2) ، sqrt(2)*100</div></div>';
  return h;
}
function wireCalc() {
  const inp = $('calc-in'), res = $('calc-res');
  const upd = () => {
    if (!inp.value.trim()) { res.textContent = '= ?'; res.classList.remove('err'); return; }
    try { res.textContent = '= ' + fmtNum(calcEval(inp.value)); res.classList.remove('err'); }
    catch (e) { res.textContent = e.message || 'خطا'; res.classList.add('err'); }
  };
  inp.addEventListener('input', upd);
  document.querySelectorAll('[data-ck]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.ck === 'clear') { inp.value = ''; }
      else if (b.dataset.ck === 'sqrt' || b.dataset.ck === 'sin' || b.dataset.ck === 'cos' || b.dataset.ck === 'log') inp.value += b.dataset.ck + '(';
      else inp.value += b.dataset.ck;
      inp.focus(); upd();
    };
  });
}
/* تبدیل واحد */
const UNITS = {
  length: { name: 'طول', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 } },
  weight: { name: 'وزن', units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 } },
  temp:   { name: 'دما', units: { c: '°C', f: '°F', k: 'K' } },
  data:   { name: 'حجم داده', units: { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 } },
  time:   { name: 'زمان', units: { s: 1, min: 60, h: 3600, d: 86400, wk: 604800 } },
};
function convertValue(v, cat, from, to) {
  if (cat === 'temp') {
    let c;
    if (from === 'c') c = v;
    else if (from === 'f') c = (v - 32) * 5 / 9;
    else c = v - 273.15;
    if (to === 'c') return c;
    if (to === 'f') return c * 9 / 5 + 32;
    return c + 273.15;
  }
  const u = UNITS[cat].units;
  return (v * u[from]) / u[to];
}
function renderConvertTool() {
  const cats = Object.keys(UNITS).map((k) => '<option value="' + k + '">' + UNITS[k].name + '</option>').join('');
  let h = '<div class="calc-box"><label>دسته<select id="cv-cat">' + cats + '</select></label>';
  h += '<input id="cv-val" dir="ltr" type="number" step="any" placeholder="مقدار" autocomplete="off">';
  h += '<div class="sched-row"><label>از<select id="cv-from"></select></label><button class="act-btn" id="cv-swap" title="جابجا کن" style="align-self:center">' + icon('swap') + '</button><label>به<select id="cv-to"></select></label></div>';
  h += '<div class="calc-result" id="cv-res">= ?</div><div class="calc-hint">طول: mm cm m km in ft mi — وزن: mg g kg t oz lb — دما: °C °F K — داده: b kb mb gb tb — زمان: s min h d wk</div></div>';
  return h;
}
function wireConvert() {
  const cat = $('cv-cat'), from = $('cv-from'), to = $('cv-to'), val = $('cv-val'), res = $('cv-res');
  const fillUnits = () => {
    const u = UNITS[cat.value].units;
    const keys = Object.keys(u);
    from.innerHTML = keys.map((k) => '<option value="' + k + '">' + k + '</option>').join('');
    to.innerHTML = keys.map((k) => '<option value="' + k + '">' + k + '</option>').join('');
    from.selectedIndex = 0;
    to.selectedIndex = Math.min(1, keys.length - 1);
  };
  const upd = () => {
    const v = parseFloat(val.value);
    if (isNaN(v)) { res.textContent = '= ?'; res.classList.remove('err'); return; }
    try {
      const r = convertValue(v, cat.value, from.value, to.value);
      res.textContent = fmtNum(v) + ' ' + from.value + '  =  ' + fmtNum(r) + ' ' + to.value;
      res.classList.remove('err');
    } catch (e) { res.textContent = e.message; res.classList.add('err'); }
  };
  cat.onchange = () => { fillUnits(); upd(); };
  from.onchange = upd; to.onchange = upd; val.addEventListener('input', upd);
  $('cv-swap').onclick = () => { const t = from.value; from.value = to.value; to.value = t; upd(); };
  fillUnits();
}
/* ابزار JSON */
function renderJsonTool() {
  return '<div class="json-box"><textarea id="json-in" dir="ltr" rows="7" placeholder=\'{ "name": "نمونه" }\' spellcheck="false"></textarea>' +
    '<div class="calc-keys"><button data-js="fmt">فرمت کن</button><button data-js="min">فشرده کن</button><button data-js="copy">کپی نتیجه</button></div>' +
    '<textarea id="json-out" dir="ltr" rows="5" readonly placeholder="نتیجه اینجا ظاهر می‌شه"></textarea>' +
    '<div class="json-msg" id="json-msg"></div></div>';
}
function wireJson() {
  const inp = $('json-in'), out = $('json-out'), msg = $('json-msg');
  const run = (mode) => {
    msg.className = 'json-msg';
    try {
      if (!inp.value.trim()) { msg.textContent = 'اول JSON رو وارد کن.'; msg.classList.add('err'); return; }
      const parsed = JSON.parse(inp.value);
      out.value = mode === 'min' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
      msg.textContent = '✅ JSON معتبر است.';
      msg.classList.add('ok');
    } catch (e) {
      out.value = '';
      msg.textContent = '❌ خطای JSON: ' + (e.message || '');
      msg.classList.add('err');
    }
  };
  document.querySelectorAll('[data-js="fmt"]').forEach((b) => { b.onclick = () => run('fmt'); });
  document.querySelectorAll('[data-js="min"]').forEach((b) => { b.onclick = () => run('min'); });
  document.querySelectorAll('[data-js="copy"]').forEach((b) => {
    b.onclick = () => {
      if (!out.value) { msg.textContent = 'نتیجه‌ای برای کپی نیست.'; msg.className = 'json-msg err'; return; }
      navigator.clipboard.writeText(out.value).then(() => { msg.textContent = '✅ کپی شد.'; msg.className = 'json-msg ok'; }).catch(() => { msg.textContent = 'کپی نشد.'; msg.className = 'json-msg err'; });
    };
  });
}
/* تاریخ و زمان */
const TZS = [['Asia/Tehran', 'تهران'], ['America/New_York', 'نیویورک'], ['Europe/London', 'لندن'], ['Asia/Tokyo', 'توکیو'], ['UTC', 'وقت جهانی UTC']];
function renderTimeTool() {
  return '<div class="time-big" id="tm-big"></div><div class="time-greg" id="tm-greg"></div><div class="tz-grid" id="tm-tz"></div>';
}
function paintTime() {
  const b = $('tm-big');
  if (!b) { stopPluginTimers(); return; }
  const now = new Date();
  try { b.textContent = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'medium' }).format(now); }
  catch { b.textContent = now.toLocaleString('fa-IR'); }
  try { $('tm-greg').textContent = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'medium' }).format(now); }
  catch { $('tm-greg').textContent = now.toISOString(); }
  const tz = $('tm-tz');
  if (tz) {
    tz.innerHTML = TZS.map(([tzid, name]) => {
      let s = '—';
      try { s = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tzid }).format(now); } catch {}
      return '<div class="tz-row"><span>' + name + '</span><b dir="ltr">' + s + '</b></div>';
    }).join('');
  }
}
function apiChars(m) {
  const c = m.content;
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) return c.reduce((n, p) => n + (p.type === 'text' ? (p.text || '').length : 2000), 0);
  return 0;
}
const API_CHAR_BUDGET = 120000;
function trimApiMessages(msgs) {
  const sys = msgs.filter((m) => m.role === 'system');
  const rest = msgs.filter((m) => m.role !== 'system');
  let budget = Math.max(20000, API_CHAR_BUDGET - sys.reduce((n, m) => n + apiChars(m), 0));
  const kept = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const cost = apiChars(rest[i]);
    if (kept.length < 2 || budget >= cost) { kept.unshift(rest[i]); budget -= cost; }
    else break;
  }
  return sys.concat(kept);
}

/* ---------- گالری مشترک تصاویر (v6.9) ---------- */
const LS_GALLERY = 'aichat.gallery';
const LS_GCONSENT = 'aichat.gallery.consent';
function galleryCfg() { try { return JSON.parse(localStorage.getItem(LS_GALLERY)) || {}; } catch { return {}; } }
function galleryReady() { const c = galleryCfg(); return !!(c.url && c.key); }
async function supaRest(path, opts) {
  const c = galleryCfg();
  const base = String(c.url || '').replace(/\/+$/, '');
  const res = await fetch(base + path, Object.assign({}, opts, {
    headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' }, (opts && opts.headers) || {}),
  }));
  if (!res.ok) throw new Error('خطای ' + res.status);
  return res.json().catch(() => ({}));
}
function downscaleImage(dataUrl, maxDim) {
  maxDim = maxDim || 512;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const r = Math.min(1, maxDim / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * r));
        cv.height = Math.max(1, Math.round(img.height * r));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob((b) => resolve(b), 'image/jpeg', 0.72);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
/* آپلود بندانگشتی عکس‌های ارسالی در چت — خطا هرگز چت رو خراب نمی‌کنه */
async function shareToGallery(atts, caption) {
  if (!galleryReady()) return;
  try {
    const c = galleryCfg();
    const base = String(c.url).replace(/\/+$/, '');
    for (const a of atts) {
      const src = a.dataUrl || a.frameUrl;
      if (a.kind !== 'image' || !src || src.indexOf('data:') !== 0) continue;
      const blob = await downscaleImage(src);
      if (!blob) continue;
      const name = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
      const up = await fetch(base + '/storage/v1/object/gallery/' + name, {
        method: 'POST',
        headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!up.ok) continue;
      await supaRest('/rest/v1/gallery', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ url: base + '/storage/v1/object/public/gallery/' + name, caption: String(caption || '').slice(0, 120) }),
      });
    }
  } catch { /* silent */ }
}
async function fetchGallery(limit) {
  const rows = await supaRest('/rest/v1/gallery?select=id,url,caption,created_at&order=created_at.desc&limit=' + (limit || 60));
  return Array.isArray(rows) ? rows : [];
}
async function renderImageGallery(content) {
  if (!galleryReady()) {
    content.innerHTML = '<div class="feature-empty">' + icon('image') +
      'گالری مشترک هنوز راه‌اندازی نشده.' +
      (isAdmin() ? '<br>از پنل مدیر، تب «گالری مشترک» رو فعال کن.' : '<br>از مدیر برنامه بخواه فعالش کنه.') + '</div>';
    return;
  }
  const consent = localStorage.getItem(LS_GCONSENT);
  if (!consent) {
    content.innerHTML =
      '<div class="feature-empty">' + icon('image') +
      'این گالری، تصاویر ساخته‌شده توسط <b>همه کاربران</b> رو نشون میده.<br>نمایش داده بشه؟</div>' +
      '<div class="modal-actions" style="justify-content:center">' +
      '<button class="btn-primary" id="g-consent-yes">باشه، نمایش بده</button>' +
      '<button class="btn-ghost" id="g-consent-no">نه</button></div>' +
      '<div class="feature-note">این اجازه فقط همین یک‌بار پرسیده می‌شه.</div>';
    $('g-consent-yes').onclick = () => { localStorage.setItem(LS_GCONSENT, 'granted'); openFeature('images'); };
    $('g-consent-no').onclick = () => { localStorage.setItem(LS_GCONSENT, 'denied'); openFeature('images'); };
    return;
  }
  if (consent === 'denied') {
    content.innerHTML = '<div class="feature-empty">' + icon('image') + 'نمایش گالری رو رد کردی.</div>' +
      '<div class="modal-actions" style="justify-content:center"><button class="btn-ghost" id="g-reask">تغییر نظر</button></div>';
    $('g-reask').onclick = () => { localStorage.removeItem(LS_GCONSENT); openFeature('images'); };
    return;
  }
  content.innerHTML = '<div class="feature-empty">' + icon('image') + 'در حال بارگذاری…</div>';
  try {
    const rows = await fetchGallery();
    if (!rows.length) {
      content.innerHTML = '<div class="feature-empty">' + icon('image') + 'هنوز تصویری به اشتراک گذاشته نشده.<br>اولین عکس رو تو بفرست!</div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'img-grid';
    for (const r of rows) {
      const d = document.createElement('div');
      d.className = 'g-item';
      const img = document.createElement('img');
      img.src = r.url; img.alt = r.caption || ''; img.loading = 'lazy';
      d.appendChild(img);
      if (r.caption) {
        const cap = document.createElement('div');
        cap.className = 'g-cap'; cap.textContent = r.caption;
        d.appendChild(cap);
      }
      d.onclick = () => {
        try {
          const u = new URL(r.url, location.href);
          if (u.protocol !== 'https:' && !(u.protocol === 'data:' && /^data:image\//i.test(r.url))) return;
        } catch { return; }
        window.open(r.url, '_blank', 'noopener');
      };
      grid.appendChild(d);
    }
    content.innerHTML = '';
    content.appendChild(grid);
    const note = document.createElement('div');
    note.className = 'feature-note';
    note.textContent = 'تصاویری که در چت فرستاده می‌شن، به‌صورت بندانگشتی اینجا به اشتراک گذاشته می‌شن.';
    content.appendChild(note);
  } catch (e) {
    content.innerHTML = '<div class="feature-empty">' + icon('image') + 'خطا در بارگذاری گالری.<br>اتصال اینترنت یا تنظیمات سرور رو بررسی کن.</div>';
  }
}

/* ---------- safe backup import: strip dangerous keys + shape check ---------- */
function safeParseBackup(text) {
  const d = JSON.parse(text);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('bad shape');
  const strip = (o) => {
    if (!o || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(strip);
    const out = {};
    for (const k of Object.keys(o)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = strip(o[k]);
    }
    return out;
  };
  const clean = strip(d);
  if (clean.settings && (typeof clean.settings !== 'object' || Array.isArray(clean.settings))) throw new Error('bad shape');
  if (clean.convos && !Array.isArray(clean.convos)) throw new Error('bad shape');
  if (clean.stats && (typeof clean.stats !== 'object' || Array.isArray(clean.stats))) throw new Error('bad shape');
  /* اعتبارسنجی عمیق: baseUrlها فقط https (یا localhost) تا کلید به سرور مهاجم نرود */
  const okUrl = (u) => {
    if (typeof u !== 'string' || !u) return true;
    try {
      const p = new URL(u);
      if (p.protocol === 'https:') return true;
      if (p.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(p.hostname)) return true;
      return false;
    } catch { return false; }
  };
  if (clean.settings && clean.settings.providers && typeof clean.settings.providers === 'object') {
    for (const k of Object.keys(clean.settings.providers)) {
      if (!PROVIDER_IDS.includes(k)) { delete clean.settings.providers[k]; continue; }
      const pr = clean.settings.providers[k];
      if (!pr || typeof pr !== 'object') { delete clean.settings.providers[k]; continue; }
      if (!okUrl(pr.baseUrl)) throw new Error('bad baseUrl');
      if (pr.apiKey != null && typeof pr.apiKey !== 'string') throw new Error('bad shape');
      if (pr.model != null && typeof pr.model !== 'string') throw new Error('bad shape');
    }
  }
  if (Array.isArray(clean.convos)) {
    for (const c of clean.convos) {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !Array.isArray(c.messages)) throw new Error('bad shape');
    }
  }
  return clean;
}

/* ---------- chat rendering ---------- */
function renderAll() { renderSidebar(); renderChat(); }

function renderChat() {
  const c = activeConvo();
  messagesEl.innerHTML = '';
  hideError();
  closeModelMenu();
  if (!c || !c.messages.length) {
    welcomeEl.classList.remove('hidden');
  } else {
    welcomeEl.classList.add('hidden');
    const lastIdx = c.messages.length - 1;
    c.messages.forEach((m, i) => {
      if (m.role === 'user') messagesEl.appendChild(buildUserEl(m));
      else messagesEl.appendChild(buildAssistantEl(m, i, i === lastIdx));
    });
  }
  renderMsLabel();
  renderSuggestions();
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function buildUserEl(m) {
  const wrap = document.createElement('div');
  wrap.className = 'msg user';
  const b = document.createElement('div');
  b.className = 'bubble';
  if (m.attachments && m.attachments.length) {
    const row = document.createElement('div');
    row.className = 'att-row';
    for (const a of m.attachments) {
      const src = a.dataUrl || a.frameUrl;
      if ((a.kind === 'image' || a.kind === 'video') && src) {
        const img = document.createElement('img');
        img.className = 'att-img'; img.src = src; img.alt = a.name || '';
        row.appendChild(img);
      } else if (a.kind === 'audio' && a.blob) {
        const tag = document.createElement('span');
        tag.className = 'att-tag';
        const au = document.createElement('audio');
        au.controls = true;
        try { au.src = URL.createObjectURL(a.blob); } catch {}
        tag.appendChild(au);
        row.appendChild(tag);
      } else {
        const tag = document.createElement('span');
        tag.className = 'att-tag';
        tag.textContent = a.name || 'فایل';
        row.appendChild(tag);
      }
    }
    b.appendChild(row);
  }
  const t = document.createElement('div');
  t.textContent = m.content;
  b.appendChild(t);
  wrap.appendChild(b);
  return wrap;
}

function buildAssistantEl(m, idx, isLast) {
  const wrap = document.createElement('div');
  wrap.className = 'msg assistant';
  wrap.dataset.idx = idx;
  const cv = activeConvo();
  const libSaved = cv ? libIsSaved(cv.id, m.content) : false;
  const pid = m.provider || settings.activeProvider;
  const plabel = (settings.providers[pid] || {}).label || pid;
  const head = document.createElement('div');
  head.className = 'answer-head';
  head.innerHTML = '<span class="model-badge"><span class="dot"></span><span></span></span>';
  head.querySelector('.model-badge span:last-child').textContent = plabel + (m.model ? ' · ' + shortModelName(m.model) : '');
  const body = document.createElement('div');
  body.className = 'answer-body';
  body.innerHTML = renderMarkdown(m.content);
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML =
    '<button class="act-btn" data-act="copy" title="کپی">' + icon('copy') + '</button>' +
    '<button class="act-btn' + (libSaved ? ' on' : '') + '" data-act="save" title="ذخیره در کتابخانه">' + icon('bookmark') + '</button>' +
    '<button class="act-btn" data-act="speak" title="بخون">' + icon('speak') + '</button>' +
    '<button class="act-btn" data-act="regen" title="تلاش مجدد">' + icon('refresh') + '</button>' +
    '<button class="act-btn' + (m.rating === 1 ? ' on' : '') + '" data-act="like" title="خوب بود">' + icon('thumbup') + '</button>' +
    '<button class="act-btn' + (m.rating === -1 ? ' on' : '') + '" data-act="dislike" title="بد بود">' + icon('thumbdown') + '</button>';
  wrap.appendChild(head); wrap.appendChild(body); wrap.appendChild(actions);
  if (isLast) {
    const fu = document.createElement('div');
    fu.className = 'followups';
    for (const q of FOLLOWUPS) {
      const chip = document.createElement('button');
      chip.className = 'fu-chip';
      chip.textContent = q;
      chip.dataset.follow = q;
      fu.appendChild(chip);
    }
    wrap.appendChild(fu);
  }
  return wrap;
}

function renderSuggestions() {
  const g = $('suggest-grid');
  if (!g || g.dataset.done) return;
  g.dataset.done = '1';
  for (const [ic, tx] of SUGGESTIONS) {
    const card = document.createElement('button');
    card.className = 'suggest-row';
    card.innerHTML = '<span class="ic"></span><span class="tx"></span>';
    card.querySelector('.ic').innerHTML = icon(ic);
    card.querySelector('.tx').textContent = tx;
    card.onclick = () => submitUserText(tx);
    g.appendChild(card);
  }
  const wp = $('welcome-providers');
  wp.innerHTML = '';
  /* فقط سرویس‌هایی که بهشون وصلی (کلید دارن) */
  const connected = visibleProviders().filter((id) => id !== 'custom' && (settings.providers[id].apiKey || '').trim());
  if (!connected.length) {
    const s = document.createElement('span');
    s.className = 'wp-hint';
    s.textContent = 'هنوز به هیچ سرویسی وصل نیستی — از تنظیمات «اتصال هوشمند» کلید API رو وارد کن.';
    wp.appendChild(s);
  }
  for (const id of connected) {
    const s = document.createElement('span');
    s.className = 'wp-chip';
    s.appendChild(providerLogo(id));
    const t = document.createElement('span');
    t.textContent = settings.providers[id].label;
    s.appendChild(t);
    wp.appendChild(s);
  }
}

function showError(msg) { errorBar.textContent = msg; errorBar.classList.remove('hidden'); }
function hideError() { errorBar.classList.add('hidden'); }
function showStop(on) {
  $('btn-send').classList.toggle('hidden', on);
  $('btn-stop').classList.toggle('hidden', !on);
}

/* ---------- API ---------- */
async function streamChat(apiMessages, cfg, onToken, signal) {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
    body: JSON.stringify({ model: cfg.model, messages: apiMessages, stream: true }),
    signal,
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.error?.message || JSON.stringify(j); } catch { detail = await res.text().catch(() => ''); }
    throw new Error('خطای ' + res.status + (detail ? ': ' + detail.slice(0, 300) : ''));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const tok = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
        if (tok) onToken(tok);
      } catch {}
    }
  }
}

function bumpStats(pid, n) { stats.messages += n; stats.byProvider[pid] = (stats.byProvider[pid] || 0) + n; saveStats(); }

async function submitUserText(text) {
  text = (text || '').trim();
  if ((!text && !attachments.length) || aborter) return;
  const cfg = activeProviderCfg();
  if (!cfg.apiKey) { showError('اول باید کلید API رو وارد کنی. از «اتصال هوشمند» توی تنظیمات استفاده کن — خودش تشخیص می‌ده. ⚡'); openSettings(); setTimeout(() => $('smart-key').focus(), 300); return; }
  if (!cfg.model) { showError('مدل انتخاب نشده. از سوییچر بالای صفحه یه مدل انتخاب کن.'); return; }

  let c = activeConvo();
  if (!c) {
    c = { id: uid(), title: 'گفتگوی جدید', messages: [], provider: settings.activeProvider, model: cfg.model, createdAt: Date.now(), updatedAt: Date.now() };
    convos.unshift(c); activeConvoId = c.id;
  }
  c.provider = settings.activeProvider; c.model = cfg.model;
  hideError();
  inputEl.value = ''; autoresize(); refreshComposerState();

  let fullText = text;
  for (const a of attachments) {
    if (a.kind === 'text' && a.text) {
      fullText += '\n\n📄 **محتوای فایل «' + a.name + '»:**\n```\n' + a.text.slice(0, 15000) + '\n```';
    } else if (a.kind === 'audio' && a.transcribed) {
      fullText += '\n\n🎙️ **رونویسی صوت:**\n' + a.transcribed;
    } else if (a.kind === 'audio') {
      fullText += '\n\n🎙️ [فایل صوتی پیوست شد: ' + a.name + ']';
    } else if (a.kind === 'video') {
      fullText += a.frameUrl
        ? '\n\n🎥 [ویدیو پیوست شد: ' + a.name + ' — یک فریم از ویدیو هم برای مدل فرستاده شد]'
        : '\n\n🎥 [ویدیو پیوست شد: ' + a.name + ']';
    } else if (a.kind === 'image') {
      if (!text) fullText += 'این تصویر رو ببین و توضیح بده.';
    } else {
      fullText += '\n\n📎 [فایل پیوست شد: ' + a.name + ']';
    }
  }
  const msgAtts = attachments.map((a) => ({ id: a.id, kind: a.kind, name: a.name, mime: a.mime, size: a.size, dataUrl: a.dataUrl, frameUrl: a.frameUrl, blob: a.blob, text: a.text, transcribed: a.transcribed }));
  attachments = []; renderAttachChips();
  c.messages.push({ role: 'user', content: fullText.trim(), attachments: msgAtts });
  shareToGallery(msgAtts, c.title);
  bumpStats(c.provider, 1);
  saveConvos();
  renderAll();
  await runAssistant(c);
}

async function runAssistant(c) {
  const cfg = settings.providers[c.provider] || activeProviderCfg();
  const wrap = document.createElement('div');
  wrap.className = 'msg assistant';
  wrap.innerHTML = '<div class="answer-head"><span class="model-badge"><span class="dot"></span><span></span></span></div><div class="answer-body"><span class="cursor"></span></div>';
  wrap.querySelector('.model-badge span:last-child').textContent = cfg.label + (cfg.model ? ' · ' + shortModelName(cfg.model) : '');
  welcomeEl.classList.add('hidden');
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  const body = wrap.querySelector('.answer-body');

  showStop(true);
  aborter = new AbortController();
  let full = '';
  let lastRender = 0;
  let visionSkipped = false;
  const doStream = (apiMessages) => streamChat(apiMessages, cfg, (tok) => {
    full += tok;
    const now = Date.now();
    if (now - lastRender > 110) {
      lastRender = now;
      body.innerHTML = renderMarkdown(full) + '<span class="cursor"></span>';
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }, aborter.signal);
  const textOnlyMessages = () => c.messages.map((m) => ({ role: m.role, content: m.content }));
  try {
    try {
      await doStream(toApiMessages(c));
    } catch (e) {
      if (/content must be a string/i.test(e.message || '')) {
        visionSkipped = true;
        await doStream(textOnlyMessages());
      } else throw e;
    }
    if (visionSkipped) full += '\n\n*⚠️ این مدل تصویر رو پشتیبانی نمی‌کنه؛ پیام بدون تصویر (فقط متن) فرستاده شد.*';
    c.messages.push({ role: 'assistant', content: full, provider: c.provider, model: cfg.model, rating: 0 });
    bumpStats(c.provider, 1);
    touchConvo(c);
    renderChat();
  } catch (e) {
    if (e.name === 'AbortError') {
      if (full) {
        c.messages.push({ role: 'assistant', content: full + '\n\n*⏹ متوقف شد.*', provider: c.provider, model: cfg.model, rating: 0 });
        bumpStats(c.provider, 1); touchConvo(c);
      }
      renderChat();
    } else {
      wrap.remove();
      let emsg = e.message || 'خطایی رخ داد. اتصال اینترنت و کلید API رو بررسی کن.';
      if (/خطای 403/.test(emsg)) emsg += ' (احتمالاً مدل انتخاب‌شده با کلیدت در دسترس نیست؛ از منوی مدل یه مدل پایدار انتخاب کن)';
      if (/خطای 404/.test(emsg)) emsg += ' (این مدل پیدا نشد؛ از تنظیمات «دریافت لیست مدل‌ها» رو بزن و یه مدل موجود انتخاب کن)';
      if (/خطای 400/.test(emsg) && /reduce the length|too long|maximum context|context_length/i.test(emsg)) emsg += ' (حجم پیام‌های ارسالی — تاریخچه گفتگو + فایل‌های پروژه — از ظرفیت این مدل بیشتره؛ یه گفتگوی جدید شروع کن، فایل‌های سنگین پروژه رو کم کن یا مدلی با ظرفیت بیشتر انتخاب کن)';
      showError('⚠️ ' + emsg);
    }
  } finally {
    aborter = null;
    showStop(false);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

async function regenerate() {
  const c = activeConvo();
  if (!c || aborter) return;
  while (c.messages.length && c.messages[c.messages.length - 1].role === 'assistant') c.messages.pop();
  if (!c.messages.length || c.messages[c.messages.length - 1].role !== 'user') { showError('پیامی برای بازتولید نیست.'); return; }
  saveConvos(); renderChat();
  await runAssistant(c);
}

function stopStream() { if (aborter) aborter.abort(); }

/* ---------- سوییچر مدل (سبک LobeChat) ---------- */
function renderMsLabel() {
  const p = activeProviderCfg();
  const pid = settings.activeProvider || 'openai';
  $('ms-label').innerHTML = '';
  $('ms-label').appendChild(providerLogo(pid));
  const b = document.createElement('b');
  b.textContent = p.label;
  const s = document.createElement('span');
  s.className = 'mname';
  s.textContent = p.model ? ' · ' + shortModelName(p.model) : '';
  s.title = p.model || '';
  s.dir = 'ltr';
  $('ms-label').appendChild(b);
  $('ms-label').appendChild(s);
}
function openModelMenu() {
  const menu = $('model-menu');
  menu.innerHTML = '';
  /* فقط مدلِ ذخیره‌شده‌ی هر سرویس متصل — نه فهرست کامل مدل‌های API */
  const connected = visibleProviders().filter((id) => {
    const p = settings.providers[id];
    return p && (p.apiKey || '').trim() && (p.model || '').trim();
  });
  if (!connected.length) {
    const s = document.createElement('div');
    s.className = 'mm-empty';
    s.textContent = 'هنوز مدلی نداری — از تنظیمات کلید API رو وارد و مدل رو انتخاب کن.';
    menu.appendChild(s);
    menu.classList.remove('hidden');
    return;
  }
  for (const id of connected) {
    const p = settings.providers[id];
    const g = document.createElement('div');
    g.className = 'mm-group';
    const h = document.createElement('div');
    h.className = 'mm-provider';
    h.appendChild(providerLogo(id));
    const ht = document.createElement('span');
    ht.textContent = p.label;
    h.appendChild(ht);
    g.appendChild(h);
    const btn = document.createElement('button');
    btn.className = 'mm-model' + (settings.activeProvider === id ? ' sel' : '');
    btn.dir = 'ltr';
    btn.textContent = shortModelName(p.model);
    btn.title = p.model;
    btn.onclick = () => selectModel(id, p.model);
    g.appendChild(btn);
    menu.appendChild(g);
  }
  menu.classList.remove('hidden');
}
function closeModelMenu() { $('model-menu').classList.add('hidden'); }
function selectModel(id, m) {
  closeModelMenu();
  if (!settings.providers[id].apiKey) {
    editingProvider = id;
    openSettings();
    setTimeout(() => { $('smart-key').focus(); }, 300);
    return;
  }
  settings.activeProvider = id;
  settings.providers[id].model = m;
  saveSettings();
  const c = activeConvo();
  if (c && !c.messages.length) { c.provider = id; c.model = m; saveConvos(); }
  renderAll();
}

/* ---------- مودال تنظیمات ---------- */
function fillProviderTabs() {
  const tabs = $('provider-tabs');
  tabs.innerHTML = '';
  for (const id of visibleProviders()) {
    const b = document.createElement('button');
    b.className = 'ptab';
    b.appendChild(providerLogo(id));
    const t = document.createElement('span');
    t.textContent = settings.providers[id].label;
    b.appendChild(t);
    if ((settings.providers[id].apiKey || '').trim()) {
      const d = document.createElement('span');
      d.className = 'p-conn';
      d.title = 'متصل';
      b.appendChild(d);
    }
    if (id === editingProvider) b.classList.add('active');
    b.onclick = () => { editingProvider = id; fillProviderTabs(); fillSettingsForm(); };
    tabs.appendChild(b);
  }
}
function fillSettingsForm() {
  const p = settings.providers[editingProvider];
  $('set-name').value = p.label;
  $('set-baseurl').value = p.baseUrl;
  $('set-key').value = p.apiKey || '';
  $('set-model').value = p.model || '';
  const dl = $('model-datalist');
  dl.innerHTML = '';
  for (const m of providerModels(editingProvider)) {
    const o = document.createElement('option');
    o.value = m;
    dl.appendChild(o);
  }
  hideTest();
}
function openSettings() {
  if (!visibleProviders().includes(editingProvider)) editingProvider = settings.activeProvider;
  fillProviderTabs();
  fillSettingsForm();
  $('smart-key').value = '';
  $('settings-modal').classList.remove('hidden');
}
function closeSettings() { $('settings-modal').classList.add('hidden'); }
function showTest(msg, ok) {
  const el = $('test-result');
  el.textContent = msg;
  el.className = 'test-result ' + (ok ? 'ok' : 'err');
  el.classList.remove('hidden');
}
function hideTest() { $('test-result').classList.add('hidden'); }

async function testConnection() {
  const cfg = { label: $('set-name').value.trim(), baseUrl: $('set-baseurl').value.trim(), apiKey: cleanKey($('set-key').value), model: $('set-model').value.trim() };
  if (!cfg.apiKey) { showTest('کلید API رو وارد کن.', false); return; }
  if (!cfg.baseUrl) { showTest('آدرس پایه (Base URL) رو وارد کن.', false); return; }
  if (!cfg.model) { showTest('نام مدل رو وارد کن.', false); return; }
  showTest('⏳ در حال تست…', true);
  try {
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5, stream: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) showTest('✅ اتصال موفق! مدل جواب داد.', true);
    else {
      let msg = data.error?.message || ('خطای ' + res.status);
      if (res.status === 403) msg += ' — احتمالاً این مدل با کلیدت در دسترس نیست (مدل‌های preview نیاز به دسترسی خاص دارن)؛ یه مدل پایدار مثل gemini-2.5-flash امتحان کن.';
      showTest('❌ خطا: ' + msg, false);
    }
  } catch (e) {
    showTest('❌ خطا: ' + (e.message || 'اتصال برقرار نشد'), false);
  }
}

async function fetchModels() {
  const baseUrl = $('set-baseurl').value.trim();
  const apiKey = cleanKey($('set-key').value);
  if (!apiKey) { showTest('اول کلید API رو وارد کن.', false); return; }
  showTest('⏳ در حال دریافت مدل‌ها…', true);
  try {
    const ids = await probeModels(editingProvider, baseUrl, apiKey);
    if (!ids.length) { showTest('لیست مدل‌ها خالی برگشت.', false); return; }
    settings.providers[editingProvider].modelsList = ids;
    saveSettings();
    fillSettingsForm();
    if (!($('set-model').value.trim())) $('set-model').value = ids[0];
    showTest('✅ ' + ids.length + ' مدل پیدا شد.', true);
  } catch (e) {
    showTest('❌ ' + (e.message || 'دریافت مدل‌ها ناموفق بود'), false);
  }
}

/* مدل‌های پایدار پیشنهادی هر ارائه‌دهنده — مدل‌های آزمایشی (preview) هرگز خودکار انتخاب نمی‌شن */
const STABLE_MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  xai: ['grok-3-mini', 'grok-3'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  mistral: ['mistral-small-latest', 'mistral-medium-latest'],
  cerebras: ['llama-3.3-70b'],
  together: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'],
  openrouter: ['meta-llama/llama-3.3-70b-instruct:free'],
};
const isPreviewModel = (m) => /preview|experimental|exp-|computer-use|thinking|nightly|beta/i.test(m);
function pickSuggestedModel(pid, ids) {
  if (!ids || !ids.length) return '';
  const priority = STABLE_MODELS[pid] || [];
  const hit = priority.find((m) => ids.includes(m));
  if (hit) return hit;
  const preset = (PROVIDER_PRESETS[pid] && PROVIDER_PRESETS[pid].models[0]) || '';
  if (preset && ids.includes(preset) && !isPreviewModel(preset)) return preset;
  const stable = ids.filter((m) => !isPreviewModel(m));
  return stable.find((m) => /flash|mini|small|lite|pro|chat|instruct/i.test(m)) || stable[0] || ids[0];
}
/* مهاجرت خودکار: اگه مدل ذخیره‌شده آزمایشی/محدود باشه، با یه مدل پایدار جایگزین می‌شه */
function migratePreviewModels() {
  let changed = false;
  for (const id of PROVIDER_IDS) {
    const p = settings.providers[id];
    if (!p || !p.model || !isPreviewModel(p.model)) continue;
    const better = pickSuggestedModel(id, (p.modelsList && p.modelsList.length) ? p.modelsList : null)
      || (PROVIDER_PRESETS[id] && PROVIDER_PRESETS[id].models[0]) || '';
    if (better && better !== p.model && !isPreviewModel(better)) { p.model = better; changed = true; }
  }
  if (changed) saveSettings();
  return changed;
}

function showSmartErr(t) {
  const box = $('smart-result');
  box.className = 'test-result err'; box.classList.remove('hidden');
  box.textContent = '❌ ' + t;
  const btn = $('btn-smart');
  btn.disabled = false; btn.textContent = 'تشخیص';
}
/* ادامه اتصال هوشمند بعد از مشخص شدن ارائه‌دهنده: فقط همین یک سرویس صدا زده می‌شه */
async function finishSmartConnect(pid, key, preProbed) {
  const box = $('smart-result'), btn = $('btn-smart');
  box.className = 'test-result ok'; box.classList.remove('hidden');
  box.textContent = '⏳ در حال اتصال…';
  try {
    const p = settings.providers[pid];
    p.apiKey = key;
    settings.activeProvider = pid;
    editingProvider = pid;
    saveSettings();
    let modelCount = 0, chosen = p.model;
    try {
      const ids = preProbed || await probeModels(pid, p.baseUrl, key);
      if (ids.length) {
        p.modelsList = ids; modelCount = ids.length;
        chosen = pickSuggestedModel(pid, ids);
        p.model = chosen;
      }
    } catch {}
    if (!p.model && providerModels(pid).length) p.model = providerModels(pid)[0];
    saveSettings();
    fillProviderTabs(); fillSettingsForm(); renderAll();
    box.className = 'test-result ok';
    box.textContent = '✅ وصل شدی به ' + p.label + '!' + (chosen ? ' مدل پیشنهادی: ' + chosen : '') + (modelCount ? ' (' + modelCount + ' مدل پیدا شد)' : '');
  } finally {
    btn.disabled = false; btn.textContent = 'تشخیص';
  }
}
/* اتصال هوشمند */
async function smartConnect() {
  const key = cleanKey($('smart-key').value);
  const box = $('smart-result');
  box.className = 'test-result err'; box.classList.remove('hidden');
  if (!key || key.length < 8) { box.textContent = 'اول کلید API رو بچسبون.'; return; }
  const btn = $('btn-smart');
  btn.disabled = true; btn.textContent = '⏳';
  box.className = 'test-result ok';
  box.textContent = '⏳ در حال تشخیص…';
  try {
    let pid = null, preProbed = null;
    for (const [re, id] of KEY_HINTS) if (re.test(key)) { pid = id; break; }
    if (!pid) {
      /* پیشوند ناشناس: به‌جای ارسال کلید به هر ۹ سرویس، از کاربر می‌پرسیم مال کدومه */
      box.className = 'test-result';
      box.innerHTML = '';
      const t = document.createElement('div');
      t.textContent = 'پیشوند این کلید رو نشناختم. برای اینکه کلیدت رو به سرویس‌های دیگه نفرستم، بگو مال کدوم ارائه‌دهنده‌ست:';
      t.style.marginBottom = '8px';
      box.appendChild(t);
      const wrap = document.createElement('div');
      wrap.style.display = 'flex'; wrap.style.flexWrap = 'wrap'; wrap.style.gap = '6px';
      for (const id of PROVIDER_IDS) {
        if (id === 'custom') continue;
        const b = document.createElement('button');
        b.className = 'btn-ghost small'; b.textContent = PROVIDER_PRESETS[id].label;
        b.onclick = async () => {
          box.className = 'test-result ok'; box.textContent = '⏳ در حال امتحان کلید با ' + PROVIDER_PRESETS[id].label + '…';
          try {
            const ids = await probeModels(id, PROVIDER_PRESETS[id].baseUrl, key);
            if (ids && ids.length) { await finishSmartConnect(id, key, ids); }
            else showSmartErr('این کلید با ' + PROVIDER_PRESETS[id].label + ' جواب نداد. یه ارائه‌دهنده دیگه رو امتحان کن یا از تب‌های پایین دستی وارد کن.');
          } catch { showSmartErr('این کلید با ' + PROVIDER_PRESETS[id].label + ' جواب نداد. یه ارائه‌دهنده دیگه رو امتحان کن یا از تب‌های پایین دستی وارد کن.'); }
        };
        wrap.appendChild(b);
      }
      box.appendChild(wrap);
      return;
    }
    await finishSmartConnect(pid, key, null);
  } finally {
    btn.disabled = false; btn.textContent = 'تشخیص';
  }
}

function saveProviderSettings() {
  const p = settings.providers[editingProvider];
  p.label = $('set-name').value.trim() || PROVIDER_PRESETS[editingProvider].label;
  p.baseUrl = $('set-baseurl').value.trim();
  p.apiKey = cleanKey($('set-key').value);
  p.model = $('set-model').value.trim();
  saveSettings();
  fillProviderTabs(); fillSettingsForm(); renderAll();
  showTest('💾 ذخیره شد.', true);
}

/* ---------- پنل مدیریت ---------- */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function saveAdmin() { localStorage.setItem(LS_ADMIN, JSON.stringify(admin)); }

function openAdmin() {
  renderAdminAuth();
  renderAdminPanel();
  $('admin-modal').classList.remove('hidden');
}
function closeAdmin() { $('admin-modal').classList.add('hidden'); }

/* رمز مدیر با PBKDF2 (۱۰۰هزار تکرار + نمک یکتا)؛ حساب‌های قدیمی موقع ورود مهاجرت می‌کنن */
async function adminHash(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('aichat-admin::' + pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return 'pbkdf2$' + [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function adminHashLegacy(pass) { return sha256('aichat-admin::' + pass); }

function renderAdminAuth() {
  const box = $('admin-auth');
  if (isAdmin()) { box.innerHTML = ''; return; }
  if (!admin) {
    box.innerHTML =
      '<h3>ساخت حساب مدیر</h3>' +
      '<p class="note">هنوز حسابی ساخته نشده. یه ایمیل و رمز برای خودت بساز — فقط تو با این مشخصات می‌تونی وارد پنل مدیریت بشی.</p>' +
      '<label>ایمیل<input type="email" id="adm-email" dir="ltr" placeholder="you@example.com"></label>' +
      '<label>رمز عبور<input type="password" id="adm-pass" placeholder="حداقل ۶ کاراکتر"></label>' +
      '<label>تکرار رمز عبور<input type="password" id="adm-pass2" placeholder="تکرار رمز"></label>' +
      '<div class="modal-actions"><button class="btn-primary" id="adm-create">ساخت حساب مدیر</button></div>' +
      '<div id="adm-msg" class="test-result hidden"></div>';
    $('adm-create').onclick = async () => {
      const email = $('adm-email').value.trim().toLowerCase();
      const p1 = $('adm-pass').value, p2 = $('adm-pass2').value;
      const msg = $('adm-msg');
      msg.classList.remove('hidden');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.className = 'test-result err'; msg.textContent = 'ایمیل معتبر نیست.'; return; }
      if (p1.length < 6) { msg.className = 'test-result err'; msg.textContent = 'رمز باید حداقل ۶ کاراکتر باشه.'; return; }
      if (p1 !== p2) { msg.className = 'test-result err'; msg.textContent = 'تکرار رمز با رمز یکی نیست.'; return; }
      admin = { email, salt: uid() + uid(), passHash: '', createdAt: Date.now() };
      admin.passHash = await adminHash(p1, admin.salt);
      saveAdmin();
      saveAdmin();
      sessionStorage.setItem('aichat.admin.session', '1');
      msg.className = 'test-result ok'; msg.textContent = '✅ حساب ساخته شد و وارد شدی!';
      setTimeout(() => { renderAdminAuth(); renderAdminPanel(); renderAll(); }, 700);
    };
  } else {
    box.innerHTML =
      '<h3>ورود مدیر</h3>' +
      '<p class="note">فقط با ایمیل و رمزی که موقع ساخت حساب وارد کردی می‌تونی وارد بشی.</p>' +
      '<label>ایمیل<input type="email" id="adm-email" dir="ltr" placeholder="you@example.com"></label>' +
      '<label>رمز عبور<input type="password" id="adm-pass" placeholder="رمز عبور"></label>' +
      '<div class="modal-actions"><button class="btn-primary" id="adm-login">ورود</button></div>' +
      '<div id="adm-msg" class="test-result hidden"></div>';
    $('adm-login').onclick = async () => {
      const email = $('adm-email').value.trim().toLowerCase();
      const pass = $('adm-pass').value;
      const msg = $('adm-msg');
      msg.classList.remove('hidden');
      const h = admin.salt ? await adminHash(pass, admin.salt) : null;
      const hOld = !admin.salt ? await adminHashLegacy(pass) : null;
      if (email === admin.email && (h === admin.passHash || hOld === admin.passHash)) {
        if (!admin.salt || !String(admin.passHash).startsWith('pbkdf2$')) {
          admin.salt = uid() + uid();
          admin.passHash = await adminHash(pass, admin.salt);
          saveAdmin();
        }
        sessionStorage.setItem('aichat.admin.session', '1');
        msg.className = 'test-result ok'; msg.textContent = '✅ خوش برگشتی!';
        setTimeout(() => { renderAdminAuth(); renderAdminPanel(); renderAll(); }, 600);
      } else {
        msg.className = 'test-result err'; msg.textContent = '❌ ایمیل یا رمز اشتباهه.';
      }
    };
  }
}

function renderAdminPanel() {
  const panel = $('admin-panel');
  if (!isAdmin()) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  const tabs = $('admin-tabs');
  tabs.innerHTML = '';
  const names = { stats: ['chart', 'آمار'], providers: ['sliders', 'ارائه‌دهنده‌ها'], gallery: ['image', 'گالری مشترک'], security: ['lock', 'امنیت'], data: ['download', 'داده‌ها'] };
  for (const [id, [ic, label]] of Object.entries(names)) {
    const b = document.createElement('button');
    b.innerHTML = icon(ic) + '<span></span>';
    b.querySelector('span').textContent = label;
    if (adminTab === id) b.classList.add('active');
    b.onclick = () => { adminTab = id; renderAdminPanel(); };
    tabs.appendChild(b);
  }
  const c = $('admin-content');
  c.innerHTML = '';
  if (adminTab === 'stats') renderAdminStats(c);
  else if (adminTab === 'providers') renderAdminProviders(c);
  else if (adminTab === 'gallery') renderAdminGallery(c);
  else if (adminTab === 'security') renderAdminSecurity(c);
  else if (adminTab === 'data') renderAdminData(c);
}

function renderAdminStats(c) {
  const total = convos.length;
  const totalMsgs = convos.reduce((n, x) => n + x.messages.length, 0);
  c.innerHTML = '<h3>آمار کلی</h3><div class="stat-cards" id="sc"></div><h3>استفاده به تفکیک ارائه‌دهنده</h3><div id="sb"></div>';
  const sc = c.querySelector('#sc');
  const cards = [[total, 'گفتگو'], [totalMsgs, 'پیام'], [stats.messages, 'پیام این مرورگر']];
  for (const [n, l] of cards) {
    const d = document.createElement('div');
    d.className = 'stat-card';
    d.innerHTML = '<div class="sc-num">' + n + '</div><div class="sc-label"></div>';
    d.querySelector('.sc-label').textContent = l;
    sc.appendChild(d);
  }
  const sb = c.querySelector('#sb');
  const entries = Object.entries(stats.byProvider).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 1;
  if (!entries.length) sb.innerHTML = '<p class="note">هنوز پیامی ارسال نشده.</p>';
  for (const [pid, n] of entries) {
    const row = document.createElement('div');
    row.className = 'stat-bar';
    row.innerHTML = '<span class="sb-label"></span><div class="sb-track"><div class="sb-fill" style="width:' + Math.max(4, (n / max) * 100) + '%"></div></div><span class="sb-num">' + n + '</span>';
    row.querySelector('.sb-label').textContent = (settings.providers[pid] || {}).label || pid;
    sb.appendChild(row);
  }
}

function renderAdminProviders(c) {
  c.innerHTML = '<h3>نمایش ارائه‌دهنده‌ها برای مهمان‌ها</h3><p class="note">مهمان‌ها بدون ورود از سایت استفاده می‌کنن، ولی فقط ارائه‌دهنده‌هایی رو می‌بینن که اینجا روشن باشن.</p><div id="pr"></div>';
  const box = c.querySelector('#pr');
  for (const id of PROVIDER_IDS) {
    if (id === 'custom') continue;
    const p = settings.providers[id];
    const row = document.createElement('div');
    row.className = 'prov-row';
    row.innerHTML = '<div class="pr-info"><b></b><span class="pr-key"></span></div><label class="switch"><input type="checkbox"><span class="slider"></span></label>';
    row.querySelector('b').textContent = p.label;
    row.querySelector('.pr-key').textContent = p.apiKey ? 'کلید ثبت شده' : 'بدون کلید';
    const chk = row.querySelector('input');
    chk.checked = settings.providerVisible[id] !== false;
    chk.onchange = () => { settings.providerVisible[id] = chk.checked; saveSettings(); renderAll(); };
    box.appendChild(row);
  }
}

function renderAdminGallery(c) {
  const g = galleryCfg();
  c.innerHTML =
    '<h3>گالری مشترک تصاویر</h3>' +
    '<p class="note">برای نمایش تصاویر همه کاربران، یه پروژه رایگان Supabase بساز. راهنمای قدم‌به‌قدم: <b dir="ltr">gallery-backend/SETUP-FA.md</b></p>' +
    '<label>آدرس پروژه (URL)<input id="gal-url" dir="ltr" placeholder="https://xyz.supabase.co"></label>' +
    '<label>کلید anon<input id="gal-key" dir="ltr" type="password" placeholder="anon public key"></label>' +
    '<div class="modal-actions"><button class="btn-ghost" id="gal-test">تست اتصال</button><button class="btn-primary" id="gal-save">ذخیره</button></div>' +
    '<div id="gal-msg" class="test-result hidden"></div>' +
    '<p class="note">عکس‌های ارسالی در چت، بندانگشتی و کم‌حجم (حداکثر ۵۱۲ پیکسل، JPEG) آپلود می‌شن.</p>';
  $('gal-url').value = g.url || '';
  $('gal-key').value = g.key || '';
  const msg = $('gal-msg');
  const read = () => ({ url: $('gal-url').value.trim().replace(/\/+$/, ''), key: $('gal-key').value.trim() });
  $('gal-save').onclick = () => {
    const v = read();
    if (!v.url || !v.key) { msg.className = 'test-result err'; msg.classList.remove('hidden'); msg.textContent = 'هر دو مقدار رو وارد کن.'; return; }
    localStorage.setItem(LS_GALLERY, JSON.stringify(v));
    msg.className = 'test-result ok'; msg.classList.remove('hidden'); msg.textContent = 'ذخیره شد.';
  };
  $('gal-test').onclick = async () => {
    const v = read();
    msg.classList.remove('hidden');
    if (!v.url || !v.key) { msg.className = 'test-result err'; msg.textContent = 'اول هر دو مقدار رو وارد کن (یا ذخیره‌شده‌ها رو تست می‌کنم).'; }
    const bak = galleryCfg();
    localStorage.setItem(LS_GALLERY, JSON.stringify(v.url && v.key ? v : bak));
    msg.className = 'test-result ok'; msg.textContent = 'در حال تست…';
    try {
      await fetchGallery(1);
      msg.className = 'test-result ok'; msg.textContent = 'اتصال به گالری موفق بود!';
    } catch (e) {
      msg.className = 'test-result err'; msg.textContent = 'خطا: ' + (e.message || 'اتصال ناموفق');
    }
  };
}

function renderAdminSecurity(c) {
  c.innerHTML =
    '<h3>تغییر مشخصات ورود</h3>' +
    '<label>ایمیل جدید<input type="email" id="adm-new-email" dir="ltr"></label>' +
    '<div class="modal-actions"><button class="btn-ghost" id="adm-save-email">ذخیره ایمیل</button></div>' +
    '<label>رمز فعلی<input type="password" id="adm-cur-pass"></label>' +
    '<label>رمز جدید<input type="password" id="adm-new-pass"></label>' +
    '<div class="modal-actions"><button class="btn-ghost" id="adm-save-pass">تغییر رمز</button></div>' +
    '<div id="adm-sec-msg" class="test-result hidden"></div>' +
    '<div class="modal-actions"><button class="btn-danger" id="adm-logout">خروج از حساب مدیر</button></div>';
  $('adm-new-email').value = admin.email;
  $('adm-save-email').onclick = () => {
    const email = $('adm-new-email').value.trim().toLowerCase();
    const msg = $('adm-sec-msg');
    msg.classList.remove('hidden');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.className = 'test-result err'; msg.textContent = 'ایمیل معتبر نیست.'; return; }
    admin.email = email; saveAdmin();
    msg.className = 'test-result ok'; msg.textContent = '✅ ایمیل ذخیره شد.';
  };
  $('adm-save-pass').onclick = async () => {
    const cur = $('adm-cur-pass').value, nw = $('adm-new-pass').value;
    const msg = $('adm-sec-msg');
    msg.classList.remove('hidden');
    if (await adminHash(cur, admin.salt) !== admin.passHash) { msg.className = 'test-result err'; msg.textContent = 'رمز فعلی اشتباهه.'; return; }
    if (nw.length < 6) { msg.className = 'test-result err'; msg.textContent = 'رمز جدید باید حداقل ۶ کاراکتر باشه.'; return; }
    if (!admin.salt) admin.salt = uid() + uid();
    admin.passHash = await adminHash(nw, admin.salt); saveAdmin();
    msg.className = 'test-result ok'; msg.textContent = '✅ رمز تغییر کرد.';
    $('adm-cur-pass').value = ''; $('adm-new-pass').value = '';
  };
  $('adm-logout').onclick = () => {
    sessionStorage.removeItem('aichat.admin.session');
    closeAdmin(); renderAll();
  };
}

function renderAdminData(c) {
  c.innerHTML =
    '<h3>بکاپ و داده‌ها</h3>' +
    '<div class="modal-actions">' +
    '<button class="btn-ghost" id="adm-export">⬇️ دانلود بکاپ</button>' +
    '<label class="btn-ghost file-label" style="flex:1">⬆️ بازیابی بکاپ<input type="file" id="adm-import" accept=".json" class="hidden"></label>' +
    '</div>' +
    '<div class="modal-actions">' +
    '<button class="btn-danger" id="adm-clear-convos">حذف همه گفتگوها</button>' +
    '<button class="btn-danger" id="adm-wipe">پاک‌سازی کامل</button>' +
    '</div>' +
    '<div id="adm-data-msg" class="test-result hidden"></div>' +
    '<p class="note">بکاپ شامل تنظیمات، گفتگوها و آمار می‌شه. حساب مدیر توی بکاپ نیست.</p>' +
    '<p class="note" style="color:#b3541e">⚠️ فایل بکاپ حاوی کلیدهای API شماست؛ با کسی به اشتراک نذار و جای امن نگهش دار.</p>';
  $('adm-export').onclick = () => {
    const data = { settings, convos, stats, exportedAt: Date.now() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'aichat-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('adm-import').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const msg = $('adm-data-msg');
      msg.classList.remove('hidden');
      try {
        const d = safeParseBackup(r.result);
        if (d.settings) settings = d.settings;
        if (d.convos) convos = d.convos;
        if (d.stats) stats = d.stats;
        migrateSettings(); saveSettings(); saveConvos(); saveStats();
        activeConvoId = convos.length ? convos[0].id : null;
        renderAll(); renderAdminPanel();
        msg.className = 'test-result ok'; msg.textContent = '✅ بکاپ بازیابی شد.';
      } catch { msg.className = 'test-result err'; msg.textContent = '❌ فایل معتبر نیست.'; }
    };
    r.readAsText(f);
  };
  $('adm-clear-convos').onclick = () => {
    if (!confirm('همه گفتگوها حذف بشن؟')) return;
    convos = []; activeConvoId = null; saveConvos(); renderAll();
    $('adm-data-msg').className = 'test-result ok';
    $('adm-data-msg').classList.remove('hidden');
    $('adm-data-msg').textContent = '✅ همه گفتگوها حذف شدن.';
  };
  $('adm-wipe').onclick = () => {
    if (!confirm('همه داده‌های این مرورگر (تنظیمات، گفتگوها، آمار) پاک بشه؟ حساب مدیر هم حذف می‌شه.')) return;
    localStorage.removeItem(LS_SETTINGS); localStorage.removeItem(LS_CONVOS); localStorage.removeItem(LS_STATS); localStorage.removeItem(LS_ADMIN);
    sessionStorage.removeItem('aichat.admin.session');
    location.reload();
  };
}

/* ============ v5: پیوست‌ها، گفتاربه‌متن، ضبط صدا، TTS، خروجی ============ */
let attachments = [];
const TEXT_EXTS = ['txt', 'md', 'markdown', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'csv', 'log', 'sql', 'sh', 'vue', 'env'];
function isTextFile(f) {
  if (f.type && (f.type.startsWith('text/') || f.type === 'application/json' || f.type === 'application/xml' || f.type === 'application/javascript')) return true;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  return TEXT_EXTS.includes(ext);
}
function fileToDataUrl(file, maxDim) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, (maxDim || 1024) / Math.max(img.width || 1, img.height || 1));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * scale));
        cv.height = Math.max(1, Math.round(img.height * scale));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
    img.src = url;
  });
}
function readTextFile(file, maxChars) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || '').slice(0, maxChars || 30000));
    r.onerror = () => reject(new Error('read'));
    r.readAsText(file);
  });
}
function extractVideoFrame(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    const done = (dataUrl) => { URL.revokeObjectURL(url); resolve(dataUrl || null); };
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.6, (v.duration || 1) / 2); } catch { done(null); } };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 768 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(v.videoWidth * scale));
        cv.height = Math.max(1, Math.round(v.videoHeight * scale));
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        done(cv.toDataURL('image/jpeg', 0.8));
      } catch { done(null); }
    };
    v.onerror = () => done(null);
    setTimeout(() => done(null), 9000);
    v.src = url;
  });
}
async function addFiles(fileList, source) {
  const files = Array.from(fileList || []);
  for (const f of files) {
    if (attachments.length >= 6) { showError('حداکثر ۶ پیوست در هر پیام.'); break; }
    if (f.size > 12 * 1024 * 1024) { showError('«' + f.name + '» بزرگ‌تر از ۱۲ مگابایته و اضافه نشد.'); continue; }
    const att = { id: uid(), name: f.name, mime: f.type || '', size: f.size };
    try {
      if (source === 'video' || (f.type || '').startsWith('video/')) {
        att.kind = 'video';
        att.frameUrl = await extractVideoFrame(f);
      } else if ((f.type || '').startsWith('image/')) {
        att.kind = 'image';
        att.dataUrl = await fileToDataUrl(f, 1024);
      } else if ((f.type || '').startsWith('audio/')) {
        att.kind = 'audio'; att.blob = f;
      } else if (isTextFile(f)) {
        att.kind = 'text';
        att.text = await readTextFile(f, 30000);
      } else {
        att.kind = 'file';
      }
      attachments.push(att);
    } catch { showError('خواندن «' + f.name + '» ممکن نشد.'); }
  }
  renderAttachChips();
}
function renderAttachChips() {
  const box = $('attach-chips');
  box.innerHTML = '';
  box.classList.toggle('hidden', !attachments.length);
  for (const a of attachments) {
    const chip = document.createElement('div');
    chip.className = 'a-chip';
    let visual = '';
    if (a.kind === 'image' && a.dataUrl) visual = '<img class="thumb" alt="">';
    else if (a.kind === 'video' && a.frameUrl) visual = '<img class="thumb" alt="">';
    else visual = '<span class="a-ico">' + icon(a.kind === 'audio' ? 'mic' : a.kind === 'text' ? 'filetext' : a.kind === 'video' ? 'video' : 'clip') + '</span>';
    const badge = a.transcribed ? '<span class="a-ok">✓ رونویسی شد</span>' : (a.transcribing ? '<span class="a-ok">در حال رونویسی…</span>' : '');
    chip.innerHTML = visual + '<span class="a-name"></span>' + badge + '<button class="a-x" title="حذف">' + icon('x') + '</button>';
    const im = chip.querySelector('img.thumb');
    if (im) im.src = a.dataUrl || a.frameUrl;
    chip.querySelector('.a-name').textContent = a.name;
    chip.querySelector('.a-x').onclick = () => { attachments = attachments.filter((x) => x.id !== a.id); renderAttachChips(); };
    box.appendChild(chip);
  }
  refreshComposerState();
}
/* پیام‌های API: متن + تصویر (vision) */
function toApiMessages(c) {
  const msgs = c.messages.map((m) => {
    if (m.role === 'user' && m.attachments && m.attachments.length) {
      const parts = [{ type: 'text', text: m.content || '' }];
      for (const a of m.attachments) {
        const url = (a.dataUrl && a.dataUrl.indexOf('data:') === 0) ? a.dataUrl : (a.frameUrl || null);
        if (url && (a.kind === 'image' || a.kind === 'video')) parts.push({ type: 'image_url', image_url: { url } });
      }
      if (parts.length > 1) return { role: 'user', content: parts };
    }
    return { role: m.role, content: m.content };
  });
  /* زمینه مشترک پروژه: دستورالعمل + فایل‌ها */
  try {
    const p = projectOfConvo(c.id);
    if (p) {
      const sys = projectContext(p);
      if (sys) msgs.unshift({ role: 'system', content: sys });
      const imgs = (p.files || []).filter((f) => f.kind === 'image' && f.dataUrl && f.dataUrl.indexOf('data:') === 0).slice(0, 4);
      if (imgs.length) {
        const fu = msgs.find((m) => m.role === 'user');
        if (fu) {
          const parts = typeof fu.content === 'string' ? [{ type: 'text', text: fu.content }] : fu.content.slice();
          for (const im of imgs) parts.push({ type: 'image_url', image_url: { url: im.dataUrl } });
          fu.content = parts;
        }
      }
    }
  } catch {}
  return trimApiMessages(msgs);
}
/* ---------- ضبط صدا + رونویسی Whisper ---------- */
let mediaRecorder = null, recordChunks = [], recordTimer = null, recordStart = 0;
async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) { showError('ضبط صدا در این مرورگر پشتیبانی نمی‌شه.'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) recordChunks.push(e.data); };
    mediaRecorder.onstop = onRecordStop;
    mediaRecorder.start();
    recordStart = Date.now();
    $('record-time').textContent = '0:00';
    $('record-bar').classList.remove('hidden');
    recordTimer = setInterval(() => {
      const s = Math.floor((Date.now() - recordStart) / 1000);
      $('record-time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 500);
  } catch { showError('دسترسی به میکروفن داده نشد. از تنظیمات مرورگر اجازه بده.'); }
}
function stopRecordingUI() {
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null; }
  $('record-bar').classList.add('hidden');
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaRecorder && mediaRecorder.stream) mediaRecorder.stream.getTracks().forEach((t) => t.stop());
  } catch {}
}
async function onRecordStop() {
  const mime = (mediaRecorder && mediaRecorder.mimeType) || 'audio/webm';
  const blob = new Blob(recordChunks, { type: mime });
  stopRecordingUI();
  mediaRecorder = null;
  if (!blob.size) return;
  const att = { id: uid(), kind: 'audio', name: 'voice-' + new Date().toTimeString().slice(0, 8).replace(/:/g, '') + '.webm', mime: blob.type, size: blob.size, blob, transcribing: true };
  attachments.push(att);
  renderAttachChips();
  try {
    const t = await transcribeWhisper(blob);
    if (t) att.transcribed = t;
  } catch {}
  att.transcribing = false;
  renderAttachChips();
}
async function transcribeWhisper(blob) {
  const key = (settings.providers.openai || {}).apiKey;
  if (!key) return null;
  const fd = new FormData();
  fd.append('file', blob, 'voice.webm');
  fd.append('model', 'whisper-1');
  fd.append('language', 'fa');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cleanKey(key) },
    body: fd,
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => ({}));
  return (j.text || '').trim() || null;
}
/* ---------- گفتار به متن زنده (رایگان، بدون کلید) ---------- */
let recog = null, dictating = false;
function toggleDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showError('مرورگرت گفتار به متن رو پشتیبانی نمی‌کنه. کروم یا اج رو امتحان کن.'); return; }
  if (dictating) { try { recog.stop(); } catch {} return; }
  recog = new SR();
  recog.lang = 'fa-IR';
  recog.interimResults = true;
  recog.continuous = true;
  let base = inputEl.value ? inputEl.value + ' ' : '';
  recog.onresult = (e) => {
    let interim = '', fin = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) fin += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    if (fin) base = (base + fin).replace(/\s+/g, ' ');
    inputEl.value = (base + interim).trim();
    autoresize();
  };
  recog.onend = () => { dictating = false; $('btn-mic').classList.remove('listening'); };
  recog.onerror = (e) => {
    dictating = false; $('btn-mic').classList.remove('listening');
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') showError('دسترسی به میکروفن داده نشد.');
    else if (e.error && e.error !== 'aborted' && e.error !== 'no-speech') showError('خطا در گفتار به متن.');
  };
  try { recog.start(); dictating = true; $('btn-mic').classList.add('listening'); }
  catch { showError('شروع گفتار ممکن نشد.'); }
}
/* ---------- خواندن پاسخ با صدا (TTS رایگان) ---------- */
function speakText(text) {
  try {
    if (!window.speechSynthesis) { showError('پخش صوتی در این مرورگر پشتیبانی نمی‌شه.'); return; }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    const clean = String(text || '')
      .replace(/```[\s\S]*?```/g, ' . تکه‌کد . ')
      .replace(/[*#`_~>\[\](){}|]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fa-IR'; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { showError('پخش صوتی ممکن نشد.'); }
}
/* ---------- خروجی Markdown ---------- */
function exportChat() {
  const c = activeConvo();
  if (!c || !c.messages.length) { showError('گفتگویی برای خروجی نیست.'); return; }
  let md = '# ' + (c.title || 'گفتگو') + '\n\n';
  for (const m of c.messages) {
    md += m.role === 'user' ? '## تو\n\n' : '## دستیار\n\n';
    if (m.attachments && m.attachments.length) {
      md += m.attachments.map((a) => '> 📎 پیوست: ' + a.name + '\n').join('') + '\n';
    }
    md += (m.content || '') + '\n\n---\n\n';
  }
  const blob = new Blob(['﻿' + md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chat-' + String(c.id || 'x').slice(-6) + '.md';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- events ---------- */
function autoresize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 170) + 'px';
}

$('btn-new-chat').onclick = newConvo;
$('btn-new-chat-top').onclick = newConvo;
$('btn-toggle-sidebar').onclick = () => {
  if (window.matchMedia('(max-width:860px)').matches) document.body.classList.toggle('sidebar-open');
  else document.body.classList.toggle('sidebar-hidden');
};
$('drawer-scrim').onclick = () => document.body.classList.remove('sidebar-open');
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.body.classList.remove('sidebar-open');
  closeModelMenu();
  const tp = $('theme-pop'); if (tp) tp.classList.add('hidden');
  const am = $('attach-menu'); if (am) am.classList.add('hidden');
  closeSettings(); closeAdmin();
});
$('btn-search-toggle').onclick = () => {
  const w = $('search-wrap');
  w.classList.toggle('hidden');
  if (!w.classList.contains('hidden')) $('convo-search').focus();
};
$('btn-guide').onclick = () => { openSettings(); const d = document.querySelector('details.free-guide'); if (d) d.open = true; };
$('convo-search').addEventListener('input', (e) => { convoQuery = e.target.value; renderSidebar(); });

const refreshComposerState = () => {
  const has = inputEl.value.trim().length > 0 || attachments.length > 0;
  document.querySelector('.composer').classList.toggle('has-text', has);
  $('btn-send').title = has ? 'ارسال' : 'گفتگوی صوتی (ضبط صدا)';
};
$('btn-send').onclick = () => {
  if (inputEl.value.trim() || attachments.length) submitUserText(inputEl.value);
  else startRecording();
};
$('btn-stop').onclick = stopStream;
$('btn-mic').onclick = toggleDictation;
$('btn-export').onclick = exportChat;
$('btn-attach').onclick = (e) => { e.stopPropagation(); $('attach-menu').classList.toggle('hidden'); };
document.addEventListener('click', (e) => { if (!e.target.closest('.attach-wrap')) $('attach-menu').classList.add('hidden'); });
$('attach-menu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-am]');
  if (!b) return;
  $('attach-menu').classList.add('hidden');
  const k = b.dataset.am;
  if (k === 'file') $('fi-file').click();
  else if (k === 'image') $('fi-image').click();
  else if (k === 'camera') $('fi-camera').click();
  else if (k === 'video') $('fi-video').click();
  else if (k === 'voice') startRecording();
});
$('fi-file').addEventListener('change', (e) => { addFiles(e.target.files, 'file'); e.target.value = ''; });
$('fi-image').addEventListener('change', (e) => { addFiles(e.target.files, 'image'); e.target.value = ''; });
$('fi-camera').addEventListener('change', (e) => { addFiles(e.target.files, 'camera'); e.target.value = ''; });
$('fi-video').addEventListener('change', (e) => { addFiles(e.target.files, 'video'); e.target.value = ''; });
$('btn-record-stop').onclick = () => { try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch {} };
inputEl.addEventListener('input', () => { autoresize(); refreshComposerState(); });
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitUserText(inputEl.value); }
});

$('model-switcher').onclick = (e) => {
  e.stopPropagation();
  if ($('model-menu').classList.contains('hidden')) openModelMenu();
  else closeModelMenu();
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('.switcher-wrap')) closeModelMenu();
});

messagesEl.addEventListener('click', (e) => {
  const fu = e.target.closest('[data-follow]');
  if (fu) { submitUserText(fu.dataset.follow); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const wrap = e.target.closest('.msg.assistant');
  if (!wrap) return;
  const c = activeConvo();
  if (!c) return;
  const m = c.messages[+wrap.dataset.idx];
  if (!m) return;
  const act = btn.dataset.act;
  if (act === 'copy') {
    navigator.clipboard.writeText(m.content).then(() => {
      btn.innerHTML = icon('check'); btn.classList.add('on');
      setTimeout(() => { btn.innerHTML = icon('copy'); btn.classList.remove('on'); }, 1400);
    }).catch(() => showError('کپی نشد؛ دستی انتخاب و کپی کن.'));
  } else if (act === 'save') {
    const exists = libIsSaved(c.id, m.content);
    if (exists) library = library.filter((it) => !(it.convoId === c.id && it.content === m.content));
    else library.push({ id: uid(), content: m.content, convoId: c.id, convoTitle: c.title, provider: m.provider, model: m.model, savedAt: Date.now(), kind: libItemKind(m.content) });
    saveLibrary();
    btn.classList.toggle('on', !exists);
    btn.title = exists ? 'حذف از کتابخانه' : 'ذخیره در کتابخانه';
    toast(exists ? 'از کتابخانه حذف شد.' : '🔖 در کتابخانه ذخیره شد.', 'ok');
  } else if (act === 'speak') {
    speakText(m.content);
  } else if (act === 'regen') {
    regenerate();
  } else if (act === 'like' || act === 'dislike') {
    const v = act === 'like' ? 1 : -1;
    m.rating = m.rating === v ? 0 : v;
    saveConvos(); renderChat();
  }
});

$('btn-settings').onclick = openSettings;
$('btn-close-settings').onclick = closeSettings;
$('btn-close-feature').onclick = closeFeature;
$('feature-modal').addEventListener('click', (e) => { if (e.target === $('feature-modal')) closeFeature(); });
document.querySelectorAll('.feature-btn').forEach((b) => { b.onclick = () => openFeature(b.dataset.feature); });
$('settings-modal').addEventListener('click', (e) => { if (e.target === $('settings-modal')) closeSettings(); });
$('btn-test').onclick = testConnection;
$('btn-fetch-models').onclick = fetchModels;
$('btn-save-settings').onclick = saveProviderSettings;
$('btn-smart').onclick = smartConnect;
$('smart-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') smartConnect(); });
$('btn-toggle-key').onclick = () => { const k = $('set-key'); k.type = k.type === 'password' ? 'text' : 'password'; };

$('btn-admin').onclick = openAdmin;
$('btn-close-admin').onclick = closeAdmin;
$('admin-modal').addEventListener('click', (e) => { if (e.target === $('admin-modal')) closeAdmin(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSettings(); closeAdmin(); closeModelMenu(); closeFeature(); }
});

/* ---------- init ---------- */
document.documentElement.dataset.theme = currentTheme();
renderThemePicker();
$('btn-theme').onclick = (e) => { e.stopPropagation(); renderThemePicker(); $('theme-pop').classList.toggle('hidden'); };
document.addEventListener('click', (e) => {
  const pop = $('theme-pop');
  if (pop && !pop.classList.contains('hidden') && !e.target.closest('.theme-wrap')) pop.classList.add('hidden');
});
if (!visibleProviders().includes(settings.activeProvider)) settings.activeProvider = 'openai';
migratePreviewModels();
const _av = $('app-version'); if (_av) _av.textContent = 'نسخه برنامه: ' + APP_VERSION;
renderAll();
autoresize();
/* زمان‌بند تسک‌ها: هر ۱۰ ثانیه یک‌بار چک می‌کنه (فقط وقتی سایت بازه) */
setInterval(tickScheduler, 10000);
setTimeout(tickScheduler, 2500);
