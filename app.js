/* چت‌بات چند API — منطق اصلی (نسخه ۲: تشخیص هوشمند کلید + پنل مدیریت) */
'use strict';

const LS_SETTINGS = 'aichat.settings.v1';
const LS_CONVOS = 'aichat.convos.v1';
const LS_ADMIN = 'aichat.admin.v1';
const LS_STATS = 'aichat.stats.v1';

/* ارائه‌دهنده‌ها (OpenAI-Compatible) */
const PROVIDER_PRESETS = {
  openai:     { label: 'OpenAI',        baseUrl: 'https://api.openai.com/v1',                          models: ['gpt-4o-mini', 'gpt-4o'] },
  gemini:     { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.0-flash', 'gemini-2.5-flash'] },
  groq:       { label: 'Groq',          baseUrl: 'https://api.groq.com/openai/v1',                     models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  cerebras:   { label: 'Cerebras',      baseUrl: 'https://api.cerebras.ai/v1',                         models: ['llama-3.3-70b'] },
  mistral:    { label: 'Mistral',       baseUrl: 'https://api.mistral.ai/v1',                          models: ['mistral-small-latest', 'mistral-medium-latest'] },
  together:   { label: 'Together AI',   baseUrl: 'https://api.together.xyz/v1',                        models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'] },
  openrouter: { label: 'OpenRouter',    baseUrl: 'https://openrouter.ai/api/v1',                       models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-001'] },
  deepseek:   { label: 'DeepSeek',      baseUrl: 'https://api.deepseek.com/v1',                        models: ['deepseek-chat', 'deepseek-reasoner'] },
  xai:        { label: 'xAI (Grok)',    baseUrl: 'https://api.x.ai/v1',                                models: ['grok-3-mini', 'grok-3'] },
  custom:     { label: '✏️ سفارشی',      baseUrl: '',                                                   models: [] },
};
const PROVIDER_IDS = Object.keys(PROVIDER_PRESETS);

/* سرنخ‌های تشخیص ارائه‌دهنده از روی شکل کلید */
const KEY_HINTS = [
  [/^sk-or-v1-/i, 'openrouter'],
  [/^gsk_/i, 'groq'],
  [/^xai-/i, 'xai'],
  [/^AIza/i, 'gemini'],
  [/^csk-/i, 'cerebras'],
  [/^sk-proj-/i, 'openai'],
];

/* ---------- state ---------- */
let settings = loadJSON(LS_SETTINGS, null) || defaultSettings();
let convos = loadJSON(LS_CONVOS, []);
let stats = loadJSON(LS_STATS, null) || { messages: 0, byProvider: {} };
let admin = loadJSON(LS_ADMIN, null);
let activeConvoId = convos.length ? convos[0].id : null;
let editingProvider = settings.activeProvider || 'openai';
let aborter = null;
let adminTab = 'stats';

migrateSettings();

function defaultSettings() {
  const providers = {};
  const providerVisible = {};
  for (const id of PROVIDER_IDS) {
    providers[id] = { label: PROVIDER_PRESETS[id].label, baseUrl: PROVIDER_PRESETS[id].baseUrl, apiKey: '', model: PROVIDER_PRESETS[id].models[0] || '' };
    providerVisible[id] = true;
  }
  return { providers, providerVisible, activeProvider: 'openai' };
}
/* مهاجرت تنظیمات قدیمی به نسخه جدید (بدون از دست رفتن کلیدها) */
function migrateSettings() {
  let changed = false;
  if (!settings.providers) { settings.providers = {}; changed = true; }
  if (!settings.providerVisible) { settings.providerVisible = {}; changed = true; }
  for (const id of PROVIDER_IDS) {
    if (!settings.providers[id]) {
      settings.providers[id] = { label: PROVIDER_PRESETS[id].label, baseUrl: PROVIDER_PRESETS[id].baseUrl, apiKey: '', model: PROVIDER_PRESETS[id].models[0] || '' };
      changed = true;
    }
    if (settings.providerVisible[id] === undefined) { settings.providerVisible[id] = true; changed = true; }
  }
  if (!settings.activeProvider || !settings.providers[settings.activeProvider]) { settings.activeProvider = 'openai'; changed = true; }
  if (changed) saveSettings();
}
function loadJSON(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
function saveConvos() { localStorage.setItem(LS_CONVOS, JSON.stringify(convos)); }
function saveStats() { localStorage.setItem(LS_STATS, JSON.stringify(stats)); }
function activeProviderCfg() { return settings.providers[settings.activeProvider]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function isAdmin() { return !!admin && sessionStorage.getItem('aichat.admin.session') === '1'; }
function visibleProviders() { return PROVIDER_IDS.filter((id) => isAdmin() || settings.providerVisible[id] !== false); }

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
  renderSidebar(); renderChat();
  inputEl.focus();
}
function setActiveConvo(id) { activeConvoId = id; saveConvos(); renderSidebar(); renderChat(); }
function deleteConvo(id, ev) {
  ev.stopPropagation();
  convos = convos.filter((c) => c.id !== id);
  if (activeConvoId === id) activeConvoId = convos.length ? convos[0].id : null;
  saveConvos(); renderSidebar(); renderChat();
}
function touchConvo(c) {
  c.updatedAt = Date.now();
  if (c.title === 'گفتگوی جدید' && c.messages.length >= 2) {
    const firstUser = c.messages.find((m) => m.role === 'user');
    if (firstUser) c.title = firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '');
  }
  convos.sort((a, b) => b.updatedAt - a.updatedAt);
  saveConvos(); renderSidebar();
}

function renderSidebar() {
  const list = $('convo-list');
  list.innerHTML = '';
  if (!convos.length) {
    list.innerHTML = '<div class="convo-empty">هنوز گفتگویی نداری.<br>یکی بساز و شروع کن! ✨</div>';
  }
  for (const c of convos) {
    const d = document.createElement('div');
    d.className = 'convo' + (c.id === activeConvoId ? ' active' : '');
    d.innerHTML = '<span class="t"></span><button class="del" title="حذف">🗑</button>';
    d.querySelector('.t').textContent = c.title;
    d.onclick = () => setActiveConvo(c.id);
    d.querySelector('.del').onclick = (e) => deleteConvo(c.id, e);
    list.appendChild(d);
  }
  const p = activeProviderCfg();
  $('active-provider-chip').innerHTML = 'متصل به <b></b>';
  $('active-provider-chip').querySelector('b').textContent = p.label;
  $('btn-admin').textContent = isAdmin() ? '🛡 پنل مدیر' : '🔐 ورود مدیر';
  $('admin-badge').classList.toggle('hidden', !isAdmin());
}

/* ---------- chat rendering ---------- */
function renderChat() {
  const c = activeConvo();
  messagesEl.innerHTML = '';
  hideError();
  if (!c || !c.messages.length) {
    welcomeEl.classList.remove('hidden');
    $('chat-title').textContent = 'گفتگوی جدید';
  } else {
    welcomeEl.classList.add('hidden');
    $('chat-title').textContent = c.title;
    for (const m of c.messages) appendMessage(m.role, m.content, false);
  }
  const p = activeProviderCfg();
  $('header-provider').textContent = p.label;
  $('header-model').textContent = p.model || '—';
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(role, content, animate = true) {
  welcomeEl.classList.add('hidden');
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  const roleEl = document.createElement('div');
  roleEl.className = 'role';
  roleEl.textContent = role === 'user' ? 'شما' : ('🤖 ' + activeProviderCfg().label);
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  wrap.appendChild(roleEl); wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  if (role === 'user') { bubble.textContent = content; }
  else { bubble.innerHTML = renderMarkdown(content); }
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function showError(msg) { errorBar.textContent = msg; errorBar.classList.remove('hidden'); }
function hideError() { errorBar.classList.add('hidden'); }

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

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || aborter) return;
  const cfg = activeProviderCfg();
  if (!cfg.apiKey) { showError('اول باید کلید API رو وارد کنی. از «اتصال هوشمند» توی تنظیمات استفاده کن — خودش تشخیص می‌ده. ⚡'); openSettings(); return; }
  if (!cfg.model) { showError('مدل انتخاب نشده. از تنظیمات یه مدل انتخاب کن.'); openSettings(); return; }

  let c = activeConvo();
  if (!c) { newConvo(); c = activeConvo(); }
  c.provider = settings.activeProvider; c.model = cfg.model;

  hideError();
  inputEl.value = ''; autoresize();
  c.messages.push({ role: 'user', content: text });
  appendMessage('user', text);
  bumpStats(c.provider, 1);
  touchConvo(c);

  const bubble = appendMessage('assistant', '');
  bubble.innerHTML = '<span class="cursor"></span>';
  $('btn-send').classList.add('hidden');
  $('btn-stop').classList.remove('hidden');

  aborter = new AbortController();
  let full = '';
  let lastRender = 0;
  try {
    await streamChat(c.messages, cfg, (tok) => {
      full += tok;
      const now = Date.now();
      if (now - lastRender > 120) {
        lastRender = now;
        bubble.innerHTML = renderMarkdown(full) + '<span class="cursor"></span>';
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }, aborter.signal);
    bubble.innerHTML = renderMarkdown(full);
    c.messages.push({ role: 'assistant', content: full });
    bumpStats(c.provider, 1);
    touchConvo(c);
  } catch (e) {
    if (e.name === 'AbortError') {
      bubble.innerHTML = renderMarkdown(full) + '\n\n*⏹ متوقف شد.*';
      if (full) { c.messages.push({ role: 'assistant', content: full }); bumpStats(c.provider, 1); touchConvo(c); }
      else bubble.remove();
    } else {
      bubble.remove();
      showError('⚠️ ' + (e.message || 'خطایی رخ داد. اتصال اینترنت و کلید API رو بررسی کن.'));
    }
  } finally {
    aborter = null;
    $('btn-send').classList.remove('hidden');
    $('btn-stop').classList.add('hidden');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function stopStream() { if (aborter) aborter.abort(); }
function bumpStats(pid, n) { stats.messages += n; stats.byProvider[pid] = (stats.byProvider[pid] || 0) + n; saveStats(); }

/* ---------- تشخیص هوشمند کلید ---------- */
function orderCandidates(key) {
  const hinted = [];
  for (const [rx, id] of KEY_HINTS) if (rx.test(key)) hinted.push(id);
  if (/^sk-/i.test(key) && !hinted.includes('openai') && !hinted.includes('deepseek')) hinted.push('openai', 'deepseek');
  const rest = PROVIDER_IDS.filter((id) => id !== 'custom' && !hinted.includes(id));
  return [...hinted, ...rest];
}

async function probeProvider(id, key) {
  const base = PROVIDER_PRESETS[id].baseUrl.replace(/\/+$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(base + '/models', { headers: { 'Authorization': 'Bearer ' + key }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.data || []).map((m) => m.id).sort();
  } catch { return null; }
  finally { clearTimeout(t); }
}

function pickDefaultModel(ids) {
  if (!ids.length) return '';
  const pref = [/gemini-2\.0-flash$/, /gemini-2\.5-flash$/, /llama-3\.3-70b-versatile$/, /llama-3\.3-70b$/, /mistral-small/, /deepseek-chat$/, /grok-3-mini$/, /gpt-4o-mini$/];
  for (const rx of pref) { const m = ids.find((i) => rx.test(i)); if (m) return m; }
  const chat = ids.find((i) => /chat|instruct|gpt|llama|qwen|mistral|gemini|grok|deepseek|command|mixtral/i.test(i));
  return chat || ids[0];
}

async function smartConnect() {
  const key = $('smart-key').value.trim();
  const box = $('smart-result');
  box.classList.remove('hidden', 'ok', 'err');
  if (!key) { box.classList.add('err'); box.textContent = 'اول کلید API رو بچسبون.'; return; }
  box.textContent = '⏳ در حال تشخیص ارائه‌دهنده…';
  $('btn-smart').disabled = true;
  try {
    for (const id of orderCandidates(key)) {
      const ids = await probeProvider(id, key);
      if (ids) {
        editingProvider = id;
        const p = settings.providers[id];
        p.apiKey = key;
        fillModelDatalist(ids);
        if (ids.length) p.model = pickDefaultModel(ids);
        saveSettings();
        renderProviderTabs();
        loadProviderForm();
        box.classList.add('ok');
        box.textContent = '✅ تشخیص داده شد: ' + settings.providers[id].label + ' — ' + ids.length + ' مدل. مدل پیشنهادی انتخاب شد، ذخیره رو بزن.';
        return;
      }
    }
    box.classList.add('err');
    box.textContent = '❌ هیچ ارائه‌دهنده‌ای با این کلید جواب نداد. کلید رو بررسی کن یا از تب «✏️ سفارشی» آدرس رو دستی بده.';
  } finally {
    $('btn-smart').disabled = false;
  }
}

function fillModelDatalist(ids) {
  const dl = $('model-datalist');
  dl.innerHTML = '';
  for (const id of ids) { const o = document.createElement('option'); o.value = id; dl.appendChild(o); }
}

/* ---------- settings modal ---------- */
function openSettings() {
  if (!visibleProviders().includes(editingProvider)) editingProvider = visibleProviders()[0] || 'openai';
  if (!visibleProviders().includes(settings.activeProvider)) { settings.activeProvider = visibleProviders()[0] || 'openai'; saveSettings(); }
  renderProviderTabs();
  loadProviderForm();
  $('smart-key').value = '';
  $('smart-result').classList.add('hidden');
  $('test-result').classList.add('hidden');
  $('settings-modal').classList.remove('hidden');
}
function closeSettings() { $('settings-modal').classList.add('hidden'); renderSidebar(); renderChat(); }

function renderProviderTabs() {
  const tabs = $('provider-tabs');
  tabs.innerHTML = '';
  for (const id of visibleProviders()) {
    const b = document.createElement('button');
    b.textContent = settings.providers[id].label + (isAdmin() && settings.providerVisible[id] === false ? ' 👁‍🗨' : '');
    if (id === editingProvider) b.classList.add('active');
    b.onclick = () => { saveProviderForm(); editingProvider = id; renderProviderTabs(); loadProviderForm(); $('test-result').classList.add('hidden'); };
    tabs.appendChild(b);
  }
  const wp = $('welcome-providers');
  wp.innerHTML = '';
  for (const id of visibleProviders()) {
    if (id === 'custom') continue;
    const s = document.createElement('span');
    s.textContent = settings.providers[id].label;
    wp.appendChild(s);
  }
}
function loadProviderForm() {
  const p = settings.providers[editingProvider];
  $('set-name').value = p.label;
  $('set-baseurl').value = p.baseUrl;
  $('set-key').value = p.apiKey;
  $('set-key').type = 'password';
  $('set-model').value = p.model;
  fillModelDatalist(PROVIDER_PRESETS[editingProvider].models || []);
}
function saveProviderForm() {
  const p = settings.providers[editingProvider];
  p.label = $('set-name').value.trim() || PROVIDER_PRESETS[editingProvider].label;
  p.baseUrl = $('set-baseurl').value.trim().replace(/\/+$/, '');
  p.apiKey = $('set-key').value.trim();
  p.model = $('set-model').value.trim();
}
function setAsActive() {
  saveProviderForm();
  settings.activeProvider = editingProvider;
  saveSettings();
}

async function testConnection() {
  saveProviderForm();
  const p = settings.providers[editingProvider];
  const box = $('test-result');
  box.classList.remove('hidden', 'ok', 'err');
  if (!p.baseUrl || !p.apiKey) { box.classList.add('err'); box.textContent = 'آدرس پایه و کلید API رو وارد کن.'; return; }
  box.textContent = '⏳ در حال تست اتصال…';
  try {
    const res = await fetch(p.baseUrl.replace(/\/+$/, '') + '/models', { headers: { 'Authorization': 'Bearer ' + p.apiKey } });
    if (!res.ok) throw new Error('خطای ' + res.status);
    const j = await res.json();
    const n = (j.data || []).length;
    box.classList.add('ok');
    box.textContent = '✅ اتصال موفق! ' + (n ? n + ' مدل در دسترسه.' : 'کلید معتبره.');
  } catch (e) {
    box.classList.add('err');
    box.textContent = '❌ اتصال ناموفق: ' + e.message + '. آدرس، کلید و اینترنت رو بررسی کن.';
  }
}

async function fetchModels() {
  saveProviderForm();
  const p = settings.providers[editingProvider];
  const box = $('test-result');
  box.classList.remove('hidden', 'ok', 'err');
  if (!p.baseUrl || !p.apiKey) { box.classList.add('err'); box.textContent = 'اول آدرس پایه و کلید API رو وارد کن.'; return; }
  box.textContent = '⏳ در حال دریافت لیست مدل‌ها…';
  try {
    const res = await fetch(p.baseUrl.replace(/\/+$/, '') + '/models', { headers: { 'Authorization': 'Bearer ' + p.apiKey } });
    if (!res.ok) throw new Error('خطای ' + res.status);
    const j = await res.json();
    const ids = (j.data || []).map((m) => m.id).sort();
    fillModelDatalist(ids);
    box.classList.add('ok');
    box.textContent = '✅ ' + ids.length + ' مدل پیدا شد. حالا از کادر مدل یکی رو انتخاب کن.';
  } catch (e) {
    box.classList.add('err');
    box.textContent = '❌ نشد: ' + e.message;
  }
}

/* ---------- مدیریت (ادمین) ---------- */
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('aichat-admin::' + s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function openAdmin() {
  renderAdminAuth();
  $('admin-panel').classList.add('hidden');
  $('admin-modal').classList.remove('hidden');
}
function closeAdmin() { $('admin-modal').classList.add('hidden'); renderSidebar(); }

function renderAdminAuth() {
  const box = $('admin-auth');
  box.classList.remove('hidden');
  if (!admin) {
    box.innerHTML =
      '<h3>👑 ساخت حساب مدیر</h3>' +
      '<p class="note">هنوز حسابی ساخته نشده. ایمیل و رمز عبورت رو وارد کن تا فقط تو به پنل مدیریت دسترسی داشته باشی.</p>' +
      '<label>ایمیل<input type="email" id="adm-email" dir="ltr" placeholder="you@mail.com"></label>' +
      '<label>رمز عبور<input type="password" id="adm-pass" placeholder="حداقل ۶ کاراکتر"></label>' +
      '<label>تکرار رمز عبور<input type="password" id="adm-pass2" placeholder="تکرار رمز عبور"></label>' +
      '<div id="adm-msg" class="test-result hidden"></div>' +
      '<div class="modal-actions"><button id="adm-create" class="btn-primary">ساخت حساب مدیر</button></div>';
    $('adm-create').onclick = async () => {
      const email = $('adm-email').value.trim().toLowerCase();
      const p1 = $('adm-pass').value, p2 = $('adm-pass2').value;
      const msg = $('adm-msg'); msg.classList.remove('hidden', 'ok', 'err');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.classList.add('err'); msg.textContent = 'ایمیل معتبر وارد کن.'; return; }
      if (p1.length < 6) { msg.classList.add('err'); msg.textContent = 'رمز عبور باید حداقل ۶ کاراکتر باشه.'; return; }
      if (p1 !== p2) { msg.classList.add('err'); msg.textContent = 'تکرار رمز با رمز یکی نیست.'; return; }
      admin = { email, passHash: await sha256Hex(p1), createdAt: Date.now() };
      localStorage.setItem(LS_ADMIN, JSON.stringify(admin));
      sessionStorage.setItem('aichat.admin.session', '1');
      renderAdminPanel();
    };
  } else if (!isAdmin()) {
    box.innerHTML =
      '<h3>🔐 ورود مدیر</h3>' +
      '<p class="note">این بخش فقط برای مدیر سایته. بقیه بدون ورود می‌تونن چت کنن.</p>' +
      '<label>ایمیل<input type="email" id="adm-email" dir="ltr" placeholder="you@mail.com"></label>' +
      '<label>رمز عبور<input type="password" id="adm-pass" placeholder="رمز عبور"></label>' +
      '<div id="adm-msg" class="test-result hidden"></div>' +
      '<div class="modal-actions"><button id="adm-login" class="btn-primary">ورود</button></div>';
    const doLogin = async () => {
      const email = $('adm-email').value.trim().toLowerCase();
      const msg = $('adm-msg'); msg.classList.remove('hidden', 'ok', 'err');
      const h = await sha256Hex($('adm-pass').value);
      if (email === admin.email && h === admin.passHash) {
        sessionStorage.setItem('aichat.admin.session', '1');
        renderAdminPanel();
      } else { msg.classList.add('err'); msg.textContent = '❌ ایمیل یا رمز عبور اشتباهه.'; }
    };
    $('adm-login').onclick = doLogin;
    $('adm-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  } else {
    renderAdminPanel();
  }
}

function renderAdminPanel() {
  $('admin-auth').classList.add('hidden');
  const panel = $('admin-panel');
  panel.classList.remove('hidden');
  const tabs = $('admin-tabs');
  tabs.innerHTML = '';
  const defs = [['stats', '📊 آمار'], ['providers', '🔌 ارائه‌دهنده‌ها'], ['data', '💾 داده‌ها'], ['security', '🛡 امنیت']];
  for (const [id, label] of defs) {
    const b = document.createElement('button');
    b.textContent = label;
    if (id === adminTab) b.classList.add('active');
    b.onclick = () => { adminTab = id; renderAdminPanel(); };
    tabs.appendChild(b);
  }
  const c = $('admin-content');
  if (adminTab === 'stats') renderAdminStats(c);
  else if (adminTab === 'providers') renderAdminProviders(c);
  else if (adminTab === 'data') renderAdminData(c);
  else renderAdminSecurity(c);
  renderSidebar();
}

function renderAdminStats(c) {
  const keys = PROVIDER_IDS.filter((id) => settings.providers[id].apiKey).length;
  const max = Math.max(1, ...Object.values(stats.byProvider));
  let bars = '';
  for (const id of PROVIDER_IDS) {
    const n = stats.byProvider[id] || 0;
    if (!n) continue;
    bars += '<div class="stat-bar"><span class="sb-label">' + escapeHtml(settings.providers[id].label) + '</span>' +
      '<div class="sb-track"><div class="sb-fill" style="width:' + Math.round((n / max) * 100) + '%"></div></div>' +
      '<span class="sb-num">' + n + '</span></div>';
  }
  c.innerHTML =
    '<div class="stat-cards">' +
    '<div class="stat-card"><div class="sc-num">' + convos.length + '</div><div class="sc-label">گفتگو</div></div>' +
    '<div class="stat-card"><div class="sc-num">' + stats.messages + '</div><div class="sc-label">پیام</div></div>' +
    '<div class="stat-card"><div class="sc-num">' + keys + '</div><div class="sc-label">کلید فعال</div></div>' +
    '</div>' +
    '<h3>مصرف به تفکیک ارائه‌دهنده</h3>' +
    (bars || '<p class="note">هنوز پیامی ثبت نشده.</p>');
}

function renderAdminProviders(c) {
  let rows = '';
  for (const id of PROVIDER_IDS) {
    const p = settings.providers[id];
    const vis = settings.providerVisible[id] !== false;
    rows += '<div class="prov-row">' +
      '<div class="pr-info"><b>' + escapeHtml(p.label) + '</b>' +
      '<span class="pr-key">' + (p.apiKey ? '🔑 کلید ثبت شده' : 'بدون کلید') + (p.model ? ' · ' + escapeHtml(p.model) : '') + '</span></div>' +
      '<label class="switch"><input type="checkbox" data-id="' + id + '" ' + (vis ? 'checked' : '') + '><span class="slider"></span></label>' +
      '</div>';
  }
  c.innerHTML = '<h3>نمایش ارائه‌دهنده‌ها برای مهمان‌ها</h3><p class="note">خاموش کردن یعنی مهمان‌ها اون ارائه‌دهنده رو نمی‌بینن (خودت همیشه همه رو می‌بینی).</p>' + rows;
  c.querySelectorAll('input[type=checkbox]').forEach((ch) => {
    ch.onchange = () => { settings.providerVisible[ch.dataset.id] = ch.checked; saveSettings(); renderProviderTabs(); };
  });
}

function renderAdminData(c) {
  c.innerHTML =
    '<h3>پشتیبان‌گیری و بازیابی</h3>' +
    '<div class="modal-actions">' +
    '<button id="adm-export" class="btn-ghost">⬇️ خروجی JSON</button>' +
    '<label class="btn-ghost file-label">⬆️ ورود JSON<input type="file" id="adm-import" accept=".json" class="hidden"></label>' +
    '</div>' +
    '<h3>حذف</h3>' +
    '<div class="modal-actions"><button id="adm-clear-convos" class="btn-danger">🗑 حذف همه گفتگوها</button></div>' +
    '<div id="adm-data-msg" class="test-result hidden"></div>';
  $('adm-export').onclick = () => {
    const data = { settings, convos, stats, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aichat-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('adm-import').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const msg = $('adm-data-msg'); msg.classList.remove('hidden', 'ok', 'err');
      try {
        const d = JSON.parse(r.result);
        if (d.convos) { convos = d.convos; saveConvos(); }
        if (d.settings) { settings = d.settings; migrateSettings(); }
        if (d.stats) { stats = d.stats; saveStats(); }
        msg.classList.add('ok'); msg.textContent = '✅ بازیابی شد.';
        renderSidebar(); renderChat();
      } catch { msg.classList.add('err'); msg.textContent = '❌ فایل معتبر نیست.'; }
    };
    r.readAsText(f);
  };
  $('adm-clear-convos').onclick = () => {
    if (!confirm('همه گفتگوها حذف بشن؟')) return;
    convos = []; activeConvoId = null; saveConvos();
    renderSidebar(); renderChat(); renderAdminPanel();
  };
}

function renderAdminSecurity(c) {
  c.innerHTML =
    '<h3>تغییر ایمیل مدیر</h3>' +
    '<label>ایمیل فعلی: <b dir="ltr">' + escapeHtml(admin.email) + '</b></label>' +
    '<div class="key-row"><input type="email" id="adm-new-email" dir="ltr" placeholder="ایمیل جدید"><button id="adm-save-email" class="btn-ghost small">ذخیره</button></div>' +
    '<h3>تغییر رمز عبور</h3>' +
    '<label>رمز فعلی<input type="password" id="adm-cur-pass"></label>' +
    '<label>رمز جدید<input type="password" id="adm-new-pass" placeholder="حداقل ۶ کاراکتر"></label>' +
    '<div class="modal-actions"><button id="adm-save-pass" class="btn-ghost">ذخیره رمز جدید</button></div>' +
    '<h3>نشست</h3>' +
    '<div class="modal-actions"><button id="adm-logout" class="btn-ghost">🚪 خروج از حساب مدیر</button>' +
    '<button id="adm-wipe" class="btn-danger">💥 حذف کامل همه داده‌ها</button></div>' +
    '<div id="adm-sec-msg" class="test-result hidden"></div>';
  $('adm-save-email').onclick = () => {
    const v = $('adm-new-email').value.trim().toLowerCase();
    const msg = $('adm-sec-msg'); msg.classList.remove('hidden', 'ok', 'err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { msg.classList.add('err'); msg.textContent = 'ایمیل معتبر وارد کن.'; return; }
    admin.email = v; localStorage.setItem(LS_ADMIN, JSON.stringify(admin));
    msg.classList.add('ok'); msg.textContent = '✅ ایمیل به‌روز شد.'; renderAdminSecurity(c);
  };
  $('adm-save-pass').onclick = async () => {
    const msg = $('adm-sec-msg'); msg.classList.remove('hidden', 'ok', 'err');
    const curH = await sha256Hex($('adm-cur-pass').value);
    if (curH !== admin.passHash) { msg.classList.add('err'); msg.textContent = 'رمز فعلی اشتباهه.'; return; }
    if ($('adm-new-pass').value.length < 6) { msg.classList.add('err'); msg.textContent = 'رمز جدید باید حداقل ۶ کاراکتر باشه.'; return; }
    admin.passHash = await sha256Hex($('adm-new-pass').value);
    localStorage.setItem(LS_ADMIN, JSON.stringify(admin));
    msg.classList.add('ok'); msg.textContent = '✅ رمز عبور عوض شد.';
  };
  $('adm-logout').onclick = () => { sessionStorage.removeItem('aichat.admin.session'); closeAdmin(); };
  $('adm-wipe').onclick = () => {
    if (!confirm('همه‌چیز (گفتگوها، کلیدها، تنظیمات و حساب مدیر) حذف بشه؟ این کار برگشت‌ناپذیره!')) return;
    for (const k of [LS_SETTINGS, LS_CONVOS, LS_ADMIN, LS_STATS]) localStorage.removeItem(k);
    sessionStorage.removeItem('aichat.admin.session');
    location.reload();
  };
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

/* ---------- events ---------- */
function autoresize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; }

$('btn-send').onclick = sendMessage;
$('btn-stop').onclick = stopStream;
$('btn-new-chat').onclick = () => { newConvo(); document.body.classList.remove('sidebar-open'); };
$('btn-settings').onclick = openSettings;
$('btn-admin').onclick = openAdmin;
$('btn-close-settings').onclick = closeSettings;
$('btn-close-admin').onclick = closeAdmin;
$('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });
$('admin-modal').addEventListener('click', (e) => { if (e.target.id === 'admin-modal') closeAdmin(); });
$('btn-test').onclick = testConnection;
$('btn-fetch-models').onclick = fetchModels;
$('btn-smart').onclick = smartConnect;
$('smart-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') smartConnect(); });
$('btn-save-settings').onclick = () => { setAsActive(); closeSettings(); };
$('btn-toggle-key').onclick = () => { $('set-key').type = $('set-key').type === 'password' ? 'text' : 'password'; };
$('btn-toggle-sidebar').onclick = () => document.body.classList.toggle('sidebar-open');
inputEl.addEventListener('input', autoresize);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSettings(); closeAdmin(); } });

/* ---------- init ---------- */
if (!isAdmin() && settings.providerVisible[settings.activeProvider] === false) {
  settings.activeProvider = visibleProviders()[0] || 'openai';
  saveSettings();
}
if (!visibleProviders().includes(editingProvider)) editingProvider = visibleProviders()[0] || 'openai';
renderProviderTabs();
renderSidebar();
renderChat();
autoresize();
