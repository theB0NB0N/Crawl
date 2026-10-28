// Game state: creation, XP and levels, inventory, save/load.
import { statMod } from './dice.js';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'crawl_save_v2';
export const TRINKET_SLOTS = 5;
export const TABS = ['gear', 'consumables', 'junk', 'quest'];
export const xpToNext = (level) => level * 100;

export function newGame({ name, cls, floor }) {
  const stats = { STR: 10, DEX: 10, CON: 10, INT: 10, CHA: 10 };
  stats[cls.primary] += 2;
  const hpMax = 20 + 2 * statMod(stats.CON);
  const mpMax = 10 + 2 * statMod(stats.INT);
  return {
    v: SAVE_VERSION,
    crawler: {
      name: (name || 'Crawler').trim().slice(0, 30) || 'Crawler',
      race: 'Human',
      clsId: cls.id,
      cls: cls.name,
      level: 1, xp: 0,
      hp: hpMax, hpMax, mp: mpMax, mpMax,
      unspentPoints: 0,
    },
    stats,
    skills: [],
    inventory: { gear: [], consumables: [], junk: [], quest: [] },
    trinkets: Array(TRINKET_SLOTS).fill(null),
    achievements: [],
    lootBoxes: [],
    counters: { boxesOpened: 0 },
    flags: {},
    recentTags: [],
    floor: { number: floor.floor, name: floor.name, turnsLeft: floor.timer, turnsSpent: 0, firedEvents: [] },
    map: { current: floor.start, visited: { [floor.start]: true }, discovered: {} },
    summary: '',
    history: [],
    turn: 0,
    dead: false,
    deathCause: '',
  };
}

// Adds XP and resolves level-ups. Returns a list of log lines.
export function addXp(state, amount) {
  const c = state.crawler;
  const log = [];
  if (!amount) return log;
  c.xp += amount;
  log.push(`XP +${amount}`);
  while (c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level += 1;
    c.hpMax += 5; c.mpMax += 2;
    c.hp = c.hpMax; c.mp = c.mpMax;
    c.unspentPoints += 3;
    log.push(`LEVEL UP -> ${c.level} (+3 stat points)`);
  }
  return log;
}

export function damage(state, amount) {
  const c = state.crawler;
  c.hp = Math.max(0, Math.min(c.hpMax, c.hp + amount));
  if (c.hp <= 0 && !state.dead) { state.dead = true; return ['YOU DIED']; }
  return [];
}

// item: { id?, name, tab, slot?, desc?, effect?, tags? }. Returns where it went.
export function addItem(state, item) {
  const entry = {
    id: item.id || null,
    name: String(item.name).slice(0, 80),
    desc: String(item.effect || item.desc || '').slice(0, 200),
    quip: item.quip ? String(item.quip).slice(0, 120) : '',
    tags: item.tags || [],
    rarity: item.rarity || 1,
    slot: item.slot || null,
  };
  let tab = item.tab;
  if (tab === 'trinket') {
    const i = state.trinkets.findIndex((t) => t === null);
    if (i >= 0) { state.trinkets[i] = entry; return `trinket slot ${i + 1}`; }
    state.inventory.junk.push(entry);
    return 'junk (trinket slots full)';
  }
  if (tab === 'weapon' || tab === 'armor') tab = 'gear';
  if (tab === 'scroll' || tab === 'consumable') tab = 'consumables';
  if (!TABS.includes(tab)) tab = 'junk';
  state.inventory[tab].push(entry);
  return tab;
}

export function removeItemByName(state, name) {
  const want = String(name).toLowerCase();
  for (const tab of TABS) {
    const i = state.inventory[tab].findIndex((x) => x.name.toLowerCase() === want);
    if (i >= 0) { state.inventory[tab].splice(i, 1); return true; }
  }
  const t = state.trinkets.findIndex((x) => x && x.name.toLowerCase() === want);
  if (t >= 0) { state.trinkets[t] = null; return true; }
  return false;
}

export function noteTags(state, tags) {
  const merged = [...tags, ...state.recentTags];
  state.recentTags = [...new Set(merged)].slice(0, 12);
}

// ---- save / load ----
export function makeStorage(backend) {
  const mem = new Map();
  const b = backend || {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, v); },
  };
  return {
    get(k, d = '') { try { const v = b.getItem(k); return v === null || v === undefined ? d : v; } catch { return d; } },
    set(k, v) { try { b.setItem(k, v); return true; } catch { return false; } },
  };
}

export function saveGame(store, state) { return store.set(SAVE_KEY, JSON.stringify(state)); }

export function loadGame(store) {
  const raw = store.get(SAVE_KEY, '');
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && s.v === SAVE_VERSION ? s : null;
  } catch { return null; }
}

export function exportSave(state) { return JSON.stringify(state, null, 2); }
export function importSave(json) {
  const s = JSON.parse(json);
  if (!s || s.v !== SAVE_VERSION || !s.crawler || !s.floor) throw new Error('Not a valid Crawl save.');
  return s;
}
