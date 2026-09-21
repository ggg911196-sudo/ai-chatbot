/* چت‌بات چند API — منطق اصلی */
'use strict';

const LS_SETTINGS = 'aichat.settings.v1';
const LS_CONVOS = 'aichat.convos.v1';

/* پیش‌فرض ارائه‌دهنده‌ها (OpenAI-Compatible) */
const PROVIDER_PRESETS = {
  openai:     { label: 'OpenAI',     baseUrl: 'https://api.openai.com/v1',        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o4-mini'] },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',     models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-001'] },
  groq:       { label: 'Groq',       baseUrl: 'https://api.groq.com/openai/v1',   models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  deepseek:   { label: 'DeepSeek',   baseUrl: 'https://api.deepseek.com/v1',      models: ['deepseek-chat', 'deepseek-reasoner'] },
  xai:        { label: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1',              models: ['grok-3', 'grok-3-mini'] },
  custom:     { label: '✏️ سفارشی',   baseUrl: '',                                 models: [] },
};
const PROVIDER_IDS = Object.keys(PROVIDER_PRESETS);

/* ---------- state ---------- */
let settings = loadJSON(LS_SETTINGS, null) || defaultSettings();
let convos = loadJSON(LS_CONVOS, []);
let activeConvoId = convos.length ? convos[0].id : null;
let editingProvider = settings.activeProvider || 'openai';
let aborter = null;

function defaultSettings() {
  const providers = {};
  for (const id of PROVIDER_IDS) {
    providers[id] = { label: PROVIDER_PRESETS[id].label, baseUrl: PROVIDER_PRESETS[id].baseUrl, apiKey: '', model: PROVIDER_PRESETS[id].models[0] || '' };
  }
  return { providers, activeProvider: 'openai' };
}
function loadJSON(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
function saveConvos() { localStorage.setItem(LS_CONVOS, JSON.stringify(convos)); }
function activeProviderCfg() { return settings.providers[settings.activeProvider]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

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
  if (!cfg.apiKey) { showError('اول باید کلید API رو وارد کنی. از دکمه «تنظیمات API» استفاده کن. ⚙️'); openSettings(); return; }
  if (!cfg.model) { showError('مدل انتخاب نشده. از تنظیمات یه مدل وارد کن.'); openSettings(); return; }

  let c = activeConvo();
  if (!c) { newConvo(); c = activeConvo(); }
  c.provider = settings.activeProvider; c.model = cfg.model;

  hideError();
  inputEl.value = ''; autoresize();
  c.messages.push({ role: 'user', content: text });
  appendMessage('user', text);
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
    touchConvo(c);
  } catch (e) {
    if (e.name === 'AbortError') {
      bubble.innerHTML = renderMarkdown(full) + '\n\n*⏹ متوقف شد.*';
      if (full) { c.messages.push({ role: 'assistant', content: full }); touchConvo(c); }
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

/* ---------- settings modal ---------- */
function openSettings() {
  editingProvider = settings.activeProvider;
  renderProviderTabs();
  loadProviderForm();
  $('test-result').classList.add('hidden');
  $('settings-modal').classList.remove('hidden');
}
function closeSettings() { $('settings-modal').classList.add('hidden'); renderSidebar(); renderChat(); }

function renderProviderTabs() {
  const tabs = $('provider-tabs');
  tabs.innerHTML = '';
  for (const id of PROVIDER_IDS) {
    const b = document.createElement('button');
    b.textContent = settings.providers[id].label;
    if (id === editingProvider) b.classList.add('active');
    b.onclick = () => { saveProviderForm(); editingProvider = id; renderProviderTabs(); loadProviderForm(); $('test-result').classList.add('hidden'); };
    tabs.appendChild(b);
  }
  const wp = $('welcome-providers');
  wp.innerHTML = '';
  for (const id of PROVIDER_IDS) {
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
  const dl = $('model-datalist');
  dl.innerHTML = '';
  for (const m of (PROVIDER_PRESETS[editingProvider].models || [])) {
    const o = document.createElement('option'); o.value = m; dl.appendChild(o);
  }
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
    const dl = $('model-datalist');
    dl.innerHTML = '';
    for (const id of ids) { const o = document.createElement('option'); o.value = id; dl.appendChild(o); }
    box.classList.add('ok');
    box.textContent = '✅ ' + ids.length + ' مدل پیدا شد. حالا از کادر مدل یکی رو انتخاب کن.';
  } catch (e) {
    box.classList.add('err');
    box.textContent = '❌ نشد: ' + e.message;
  }
}

/* ---------- events ---------- */
function autoresize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; }

$('btn-send').onclick = sendMessage;
$('btn-stop').onclick = stopStream;
$('btn-new-chat').onclick = () => { newConvo(); document.body.classList.remove('sidebar-open'); };
$('btn-settings').onclick = openSettings;
$('btn-close-settings').onclick = closeSettings;
$('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });
$('btn-test').onclick = testConnection;
$('btn-fetch-models').onclick = fetchModels;
$('btn-save-settings').onclick = () => { setAsActive(); closeSettings(); };
$('btn-toggle-key').onclick = () => { $('set-key').type = $('set-key').type === 'password' ? 'text' : 'password'; };
$('btn-toggle-sidebar').onclick = () => document.body.classList.toggle('sidebar-open');
inputEl.addEventListener('input', autoresize);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });

/* ---------- init ---------- */
renderProviderTabs();
renderSidebar();
renderChat();
autoresize();
