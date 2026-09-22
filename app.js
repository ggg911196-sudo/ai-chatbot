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

/* ظاهر هر ارائه‌دهنده: لوگوی واقعی + گرادیان اختصاصی */
const PROVIDER_LOOK = {
  openai:     { icon: 'openai',       g: ['#111111', '#3d3d3d'], letter: 'AI' },
  gemini:     { icon: 'googlegemini', g: ['#1a73e8', '#9b72f2'], letter: 'G'  },
  groq:       { icon: null,           g: ['#f55036', '#8f1d12'], letter: 'G'  },
  cerebras:   { icon: null,           g: ['#e11d48', '#7f1d1d'], letter: 'C'  },
  mistral:    { icon: 'mistralai',    g: ['#ff7000', '#c22e00'], letter: 'M'  },
  together:   { icon: null,           g: ['#0f62fe', '#003a9e'], letter: 'T'  },
  openrouter: { icon: 'openrouter',   g: ['#0ea5e9', '#4f46e5'], letter: 'OR' },
  deepseek:   { icon: 'deepseek',     g: ['#4d6bfe', '#1e2f8f'], letter: 'DS' },
  xai:        { icon: 'x',            g: ['#000000', '#3f3f46'], letter: '𝕏'  },
  custom:     { icon: null,           g: ['#6b7280', '#374151'], letter: '✎'  },
};
function providerLogo(id) {
  const L = PROVIDER_LOOK[id] || PROVIDER_LOOK.custom;
  const s = document.createElement('span');
  s.className = 'p-logo';
  s.style.background = 'linear-gradient(135deg,' + L.g[0] + ',' + L.g[1] + ')';
  s.title = (PROVIDER_PRESETS[id] || {}).label || id;
  const putLetter = () => { const i = document.createElement('i'); i.textContent = L.letter; s.appendChild(i); };
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
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key));
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
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

/* ---------- elements ---------- */
const $ = (id) => document.getElementById(id);
const messagesEl = $('messages'), welcomeEl = $('welcome'), inputEl = $('input');
const errorBar = $('error-bar');

/* ---------- markdown ---------- */
marked.setOptions({ breaks: true, gfm: true });
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
    gl2.className = 'group-label'; gl2.textContent = 'گفتگوهای اخیر';
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
  const pid = m.provider || settings.activeProvider;
  const plabel = (settings.providers[pid] || {}).label || pid;
  const head = document.createElement('div');
  head.className = 'answer-head';
  head.innerHTML = '<span class="model-badge"><span class="dot"></span><span></span></span>';
  head.querySelector('.model-badge span:last-child').textContent = plabel + (m.model ? ' · ' + m.model : '');
  const body = document.createElement('div');
  body.className = 'answer-body';
  body.innerHTML = renderMarkdown(m.content);
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML =
    '<button class="act-btn" data-act="copy" title="کپی">' + icon('copy') + '</button>' +
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
  for (const id of visibleProviders()) {
    if (id === 'custom') continue;
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
  wrap.querySelector('.model-badge span:last-child').textContent = cfg.label + (cfg.model ? ' · ' + cfg.model : '');
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
      showError('⚠️ ' + (e.message || 'خطایی رخ داد. اتصال اینترنت و کلید API رو بررسی کن.'));
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
  s.textContent = p.model ? ' · ' + p.model : '';
  s.dir = 'ltr';
  $('ms-label').appendChild(b);
  $('ms-label').appendChild(s);
}
function openModelMenu() {
  const menu = $('model-menu');
  menu.innerHTML = '';
  for (const id of visibleProviders()) {
    if (id === 'custom') continue;
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
    const models = providerModels(id);
    if (!models.length) {
      const s = document.createElement('div');
      s.className = 'mm-empty';
      s.textContent = 'مدلی ثبت نشده';
      g.appendChild(s);
    }
    for (const m of models.slice(0, 30)) {
      const btn = document.createElement('button');
      btn.className = 'mm-model' + (settings.activeProvider === id && p.model === m ? ' sel' : '');
      btn.dir = 'ltr';
      btn.textContent = m;
      btn.onclick = () => selectModel(id, m);
      g.appendChild(btn);
    }
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
      box.textContent = '⏳ پیشوند کلید ناشناسه؛ دارم با همه ارائه‌دهنده‌ها امتحانش می‌کنم…';
      const order = ['openai', 'groq', 'gemini', 'cerebras', 'mistral', 'together', 'openrouter', 'deepseek', 'xai'];
      const attempts = await Promise.allSettled(order.map(async (id) => {
        const ids = await probeModels(id, PROVIDER_PRESETS[id].baseUrl, key);
        if (ids && ids.length) return { id, ids };
        throw new Error('empty');
      }));
      for (let i = 0; i < order.length; i++) {
        if (attempts[i].status === 'fulfilled') { pid = attempts[i].value.id; preProbed = attempts[i].value.ids; break; }
      }
      if (!pid) {
        box.className = 'test-result err';
        box.textContent = '❌ این کلید با هیچ‌کدوم از ارائه‌دهنده‌ها جواب نداد. مطمئن شو کلید رو کامل کپی کردی؛ اگه باز نشد از تب‌های پایین دستی وارد کن.';
        return;
      }
    }
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
      admin = { email, passHash: await sha256('aichat-admin::' + p1), createdAt: Date.now() };
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
      const h = await sha256('aichat-admin::' + pass);
      if (email === admin.email && h === admin.passHash) {
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
  const names = { stats: ['chart', 'آمار'], providers: ['sliders', 'ارائه‌دهنده‌ها'], security: ['lock', 'امنیت'], data: ['download', 'داده‌ها'] };
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
    if (await sha256('aichat-admin::' + cur) !== admin.passHash) { msg.className = 'test-result err'; msg.textContent = 'رمز فعلی اشتباهه.'; return; }
    if (nw.length < 6) { msg.className = 'test-result err'; msg.textContent = 'رمز جدید باید حداقل ۶ کاراکتر باشه.'; return; }
    admin.passHash = await sha256('aichat-admin::' + nw); saveAdmin();
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
    '<p class="note">بکاپ شامل تنظیمات، گفتگوها و آمار می‌شه. حساب مدیر توی بکاپ نیست.</p>';
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
        const d = JSON.parse(r.result);
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
  return c.messages.map((m) => {
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
  if (e.key === 'Escape') { closeSettings(); closeAdmin(); closeModelMenu(); }
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
renderAll();
autoresize();
