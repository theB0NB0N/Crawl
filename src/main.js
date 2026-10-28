import { loadData } from './data.js';
import { newGame, makeStorage, saveGame, loadGame, exportSave, importSave, TABS, TRINKET_SLOTS, xpToNext } from './state.js';
import { mapView, visibleExits, currentRoom } from './map.js';
import { takeTurn } from './engine.js';
import { DEFAULT_PROMPT } from './prompt.js';
import { checkCodeAchievements } from './achievements.js';
import { openBox, addBox } from './loot.js';
import { checkKey } from './openrouter.js';
import { createDebug } from './debug.js';

const store = makeStorage(globalThis.localStorage);
const app = document.getElementById('app');
const debug = createDebug(store);
const ui = { tab: 'story', feed: [], busy: false, error: '', selClass: null };
let data, state;

const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/')))));
const baseUrl = () => location.origin + location.pathname;

function applyHash() {
  const h = location.hash.replace(/^#/, '');
  const m = h.match(/^(setup|save)=(.+)$/);
  if (!m) return '';
  let msg = '';
  try {
    const o = dec(m[2]);
    if (m[1] === 'setup') {
      if (o.key) store.set('crawl_key', String(o.key));
      if (o.model) store.set('crawl_model', String(o.model));
      if (o.prompt) store.set('crawl_prompt', String(o.prompt));
      msg = 'Setup loaded from link.';
    } else {
      state = importSave(JSON.stringify(o));
      saveGame(store, state);
      msg = 'Save loaded from link.';
    }
  } catch { msg = 'That link was not valid.'; }
  history.replaceState(null, '', location.pathname + location.search);
  return msg;
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const floorData = () => data.floors[state.floor.number];
const model = () => store.get('crawl_model', 'openrouter/free');
const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));

async function init() {
  data = await loadData();
  state = loadGame(store);
  const hashMsg = applyHash();
  if (state) ui.feed = [{ k: 'log', t: hashMsg || 'Save loaded.' }];
  else if (hashMsg) ui.error = hashMsg;
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function persist() { saveGame(store, state); }

function render() {
  if (!state) return renderCreate();
  app.innerHTML = `${topBar()}<div class="main" id="main">${body()}</div>${tabBar()}`;
  bind();
  const m = document.getElementById('main');
  if (ui.tab === 'story') m.scrollTop = m.scrollHeight;
}

function topBar() {
  const c = state.crawler;
  return `<div class="top"><span>${esc(c.name)} L${c.level}</span>
  <div class="bar hp"><i style="width:${pct(c.hp, c.hpMax)}%"></i></div><span>${c.hp}</span>
  <div class="bar mp"><i style="width:${pct(c.mp, c.mpMax)}%"></i></div>
  <div class="bar xp"><i style="width:${pct(c.xp, xpToNext(c.level))}%"></i></div>
  <span>T${state.floor.turnsLeft}</span><button id="dbg" title="Copy debug report" style="background:none;border:0;font-size:16px">🐞</button></div>`;
}

function tabBar() {
  const tabs = [['story', 'Story'], ['map', 'Map'], ['inv', 'Items'], ['ach', 'Feats'], ['set', 'More']];
  return `<div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${n}${k === 'inv' && state.lootBoxes.length ? ` (${state.lootBoxes.length}🎁)` : ''}</button>`).join('')}</div>`;
}

function body() {
  if (ui.tab === 'story') return storyView();
  if (ui.tab === 'map') return mapSvg();
  if (ui.tab === 'inv') return invView();
  if (ui.tab === 'ach') return achView();
  return settingsView();
}

function storyView() {
  const feed = ui.feed.map((f) => `<p class="msg ${f.k}">${esc(f.t)}</p>`).join('');
  const exits = visibleExits(state, floorData()).map((e) => `${e.name}${e.status.ok ? '' : ' (blocked)'}`).join(' · ');
  const input = state.dead
    ? `<div class="row"><button class="btn" id="restart">New crawl</button></div>`
    : `<div class="row"><input id="act" placeholder="What do you do?" autocomplete="off"><button class="btn" id="go" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '…' : 'Go'}</button></div>`;
  return `<p class="msg log">📍 ${esc(currentRoom(state, floorData()).name)} — exits: ${esc(exits)}</p>${feed}${ui.error ? `<p class="err">${esc(ui.error)}</p>` : ''}<div id="inputslot">${input}</div>`;
}

function mapSvg() {
  const { nodes, edges } = mapView(state, floorData());
  const S = 70, P = 40;
  const pos = (n) => [P + n.x * S, P + n.y * S];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const maxX = Math.max(...nodes.map((n) => pos(n)[0])) + P, maxY = Math.max(...nodes.map((n) => pos(n)[1])) + P;
  const lines = edges.map((e) => { const a = pos(byId[e.from]), b = pos(byId[e.to]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#4a4060" stroke-width="2" ${e.kind === 'normal' ? '' : 'stroke-dasharray="4"'}/>`; }).join('');
  const dots = nodes.map((n) => { const [x, y] = pos(n); return `<circle cx="${x}" cy="${y}" r="14" fill="${n.current ? '#ff4d6d' : n.visited ? '#5ad19a' : '#2e2740'}"/><text x="${x}" y="${y + 28}" fill="#9a90ab" font-size="9" text-anchor="middle">${esc(n.label)}</text>`; }).join('');
  return `<h2>Floor ${state.floor.number}: ${esc(state.floor.name)}</h2><svg class="map" viewBox="0 0 ${maxX} ${maxY + 20}">${lines}${dots}</svg>`;
}

function itemCard(i, extra = '') { return `<div class="card"><b>${esc(i.name)}</b><span>${esc(i.desc)}</span>${extra}</div>`; }

function invView() {
  const boxes = state.lootBoxes.length
    ? `<h2>Loot boxes</h2>${state.lootBoxes.map((b, i) => `<div class="card"><b>${esc(b.tier)} box</b><span>${esc(b.from)}</span><br><button class="btn" data-open="${i}">Open</button></div>`).join('')}`
    : '';
  const trink = `<h2>Trinkets (${state.trinkets.filter(Boolean).length}/${TRINKET_SLOTS})</h2>` + state.trinkets.map((t, i) => t ? itemCard(t) : `<div class="card"><span>Slot ${i + 1}: empty</span></div>`).join('');
  const tabs = TABS.map((t) => `<h2>${t}</h2>${state.inventory[t].map((i) => itemCard(i)).join('') || '<p class="msg me">Nothing.</p>'}`).join('');
  return boxes + trink + tabs;
}

function achView() {
  const have = new Set(state.achievements.map((a) => a.id));
  return `<h2>Achievements ${have.size}/${data.achievements.achievements.length}</h2>` + data.achievements.achievements.map((a) =>
    `<div class="card"><b>${have.has(a.id) ? '🏆 ' + esc(a.name) : '???'}</b><span>${have.has(a.id) ? esc(a.quip) : esc(a.trigger)}</span></div>`).join('');
}

function settingsView() {
  return `<h2>Settings</h2>
  <p>OpenRouter key</p><input id="key" type="password" value="${esc(store.get('crawl_key'))}">
  <p>Model</p><input id="model" value="${esc(model())}">
  <p><button class="btn alt" id="check">Check key</button> <span id="keyout"></span></p>
  <p>DM prompt</p><textarea id="prompt" rows="10">${esc(store.get('crawl_prompt', DEFAULT_PROMPT))}</textarea>
  <p><button class="btn" id="saveset">Save settings</button> <button class="btn alt" id="resetp">Reset prompt</button></p>
  <h2>Move to another device</h2>
  <p><button class="btn alt" id="setuplink">Copy setup link</button> <button class="btn alt" id="savelink">Copy save link</button></p>
  <p class="msg me">Links contain your key or save. Send them only to yourself (AirDrop, Messages) and treat them like a password.</p>
  <textarea id="linkout" rows="3" placeholder="If copying fails, the link appears here"></textarea>
  <h2>Debug</h2>
  <p><button class="btn alt" id="dbg2">Copy debug report</button> <button class="btn alt" id="dbgclear">Clear log</button></p>
  <textarea id="dbgout" rows="4" placeholder="If copying fails, the report appears here"></textarea>
  <h2>Save</h2>
  <p><button class="btn alt" id="export">Export</button> <button class="btn alt" id="import">Import</button> <button class="btn alt" id="restart">New crawl</button></p>
  <textarea id="blob" rows="4" placeholder="Export/import text appears here"></textarea>`;
}

function renderCreate() {
  const sel = ui.selClass;
  app.innerHTML = `<div class="main"><h1>CRAWL</h1><p class="msg me">Human. Alone. Pick a class.</p>
  <input id="cname" placeholder="Crawler name" maxlength="30">
  <div class="classlist" style="margin:12px 0">${data.classes.map((c) => `<div class="card ${sel === c.id ? 'sel' : ''}" data-cls="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.short)}</span></div>`).join('')}</div>
  <button class="btn" id="begin" ${sel ? '' : 'disabled'}>Enter the dungeon</button></div>`;
  app.querySelectorAll('[data-cls]').forEach((el) => el.onclick = () => { ui.selClass = el.dataset.cls; const n = document.getElementById('cname').value; renderCreate(); document.getElementById('cname').value = n; });
  document.getElementById('begin').onclick = () => {
    const cls = data.classes.find((c) => c.id === ui.selClass);
    state = newGame({ name: document.getElementById('cname').value, cls, floor: data.floors[1] });
    const log = checkCodeAchievements(state, data);
    addBox(state, 'bronze', 'Welcome Gift');
    ui.feed = [{ k: 'dm', t: `WELCOME, ${state.crawler.name.toUpperCase()}. Class: ${cls.name}. ${cls.hook || ''}\nYou are in ${currentRoom(state, floorData()).name}. ${currentRoom(state, floorData()).blurb}` }, ...log.map((t) => ({ k: 'log', t }))];
    persist(); ui.tab = 'story'; render();
  };
}

function bind() {
  app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { ui.tab = b.dataset.tab; render(); });
  const $ = (id) => document.getElementById(id);
  if ($('go')) {
    $('go').onclick = doTurn;
    $('act').onkeydown = (e) => { if (e.key === 'Enter') doTurn(); };
  }
  if ($('restart')) $('restart').onclick = () => { if (confirm('Start a new crawl? Current save is lost.')) { state = null; ui.selClass = null; render(); } };
  app.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => {
    const r = openBox(state, data, +b.dataset.open);
    if (r) ui.feed.push(...r.log.map((t) => ({ k: 'log', t })));
    ui.feed.push(...checkCodeAchievements(state, data).map((t) => ({ k: 'log', t })));
    persist(); render();
  });
  if ($('saveset')) $('saveset').onclick = () => { store.set('crawl_key', $('key').value.trim()); store.set('crawl_model', $('model').value.trim()); store.set('crawl_prompt', $('prompt').value); $('keyout').textContent = 'Saved.'; };
  if ($('resetp')) $('resetp').onclick = () => { store.set('crawl_prompt', DEFAULT_PROMPT); render(); };
  if ($('check')) $('check').onclick = async () => { try { const d = await checkKey($('key').value.trim()); $('keyout').textContent = `OK. Limit ${d.limit ?? 'none'}, used ${d.usage}`; } catch (e) { $('keyout').textContent = e.message; } };
  const giveLink = async (url) => { $('linkout').value = url; $('keyout').textContent = (await copyText(url)) ? 'Link copied.' : 'Copy it from the box below.'; };
  if ($('setuplink')) $('setuplink').onclick = () => giveLink(`${baseUrl()}#setup=${enc({ key: $('key').value.trim(), model: $('model').value.trim(), prompt: $('prompt').value === DEFAULT_PROMPT ? undefined : $('prompt').value })}`);
  if ($('savelink')) $('savelink').onclick = () => giveLink(`${baseUrl()}#save=${enc(state)}`);
  const doDebug = async () => {
    const rep = debug.report(state, { model: model(), ua: navigator.userAgent });
    const ok = await copyText(rep);
    if ($('dbgout')) $('dbgout').value = rep;
    else alert(ok ? 'Debug report copied.' : 'Copy failed. Open More > Debug.');
    if (ok && $('dbgout')) $('dbgout').placeholder = 'Copied.';
    if (ok && !$('dbgout')) return;
    if ($('keyout')) $('keyout').textContent = ok ? 'Debug report copied.' : 'Copy failed: copy from the box.';
  };
  if ($('dbg')) $('dbg').onclick = doDebug;
  if ($('dbg2')) $('dbg2').onclick = doDebug;
  if ($('dbgclear')) $('dbgclear').onclick = () => { debug.clear(); $('dbgout').value = 'Log cleared.'; };
  if ($('export')) $('export').onclick = () => { $('blob').value = exportSave(state); };
  if ($('import')) $('import').onclick = () => { try { state = importSave($('blob').value); persist(); ui.tab = 'story'; render(); } catch (e) { alert(e.message); } };
}

async function doTurn() {
  const inp = document.getElementById('act');
  const action = inp.value.trim();
  if (!action || ui.busy) return;
  const key = store.get('crawl_key');
  if (!key) { ui.error = 'Add your OpenRouter key in More.'; return render(); }
  ui.busy = true; ui.error = ''; ui.feed.push({ k: 'me', t: '> ' + action }); render();
  try {
    const r = await takeTurn({ state, floor: floorData(), data, action, key, model: model(), prompt: store.get('crawl_prompt', DEFAULT_PROMPT), onDebug: (e) => debug.record(e) });
    ui.feed.push({ k: 'dm', t: r.narration }, ...r.log.map((t) => ({ k: 'log', t })));
    persist();
  } catch (e) { ui.error = e.message; }
  ui.busy = false; render();
}

init();
