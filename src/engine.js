// Turn engine: validates the DM delta, runs timer/map rules, makes exactly one API call.
import { addXp, damage, addItem, removeItemByName, noteTags } from './state.js';
import { moveTo, canMove, discoverExit, currentRoom, roomById, matchExit } from './map.js';
import { checkCodeAchievements, findAch, award } from './achievements.js';
import { addBox, TIERS } from './loot.js';
import { parseReply } from './parser.js';
import { buildMessages, rollPool } from './prompt.js';
import { callModel } from './openrouter.js';
import { defaultRng } from './dice.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(+n) ? +n : 0)));

export function applyDelta(state, floor, data, delta) {
  const log = [];
  if (!delta || typeof delta !== 'object') return log;
  const c = state.crawler;
  if (delta.hp) {
    let hp = clamp(delta.hp, -50, 50);
    if (hp < 0) {
      hp = Math.max(hp, -5 * (state.turn <= 20 ? 1 : 3));        // early-game damage cap 5, later 15
      if (c.hp === c.hpMax) hp = Math.max(hp, -(c.hpMax - 1));   // no one-shots from full
    }
    c.hp = Math.min(c.hpMax, c.hp);
    log.push(`HP ${hp > 0 ? '+' : ''}${hp}`);
    log.push(...damage(state, hp));
  }
  if (delta.mp) { c.mp = clamp(c.mp + clamp(delta.mp, -30, 30), 0, c.mpMax); }
  if (delta.xp) log.push(...addXp(state, clamp(delta.xp, 0, 200)));
  for (const it of (Array.isArray(delta.add_items) ? delta.add_items : []).slice(0, 5)) {
    if (!it || !it.name) continue;
    const where = addItem(state, { name: it.name, tab: String(it.tab || 'junk').toLowerCase(), effect: it.effect, tags: [] });
    log.push(`+ ${it.name} -> ${where}`);
  }
  for (const n of (Array.isArray(delta.remove_items) ? delta.remove_items : []).slice(0, 5)) {
    if (removeItemByName(state, n)) log.push(`- ${n}`);
  }
  for (const [k, v] of Object.entries(delta.flags && typeof delta.flags === 'object' ? delta.flags : {}).slice(0, 8)) {
    if (/^[a-z0-9-]{1,40}$/.test(k)) { if (v) state.flags[k] = true; else delete state.flags[k]; }
  }
  for (const id of (Array.isArray(delta.discover) ? delta.discover : []).slice(0, 3)) {
    if (discoverExit(state, floor, id)) log.push(`Discovered a way to ${roomById(floor, id).name}`);
  }
  if (delta.room && typeof delta.room === 'string') {
    const r = moveTo(state, floor, delta.room);
    if (r.ok) log.push(`-> ${currentRoom(state, floor).name}`);
  }
  for (const a of (Array.isArray(delta.achievements) ? delta.achievements : []).slice(0, 3)) {
    const ach = findAch(data, a);
    if (ach && ach.check === 'dm') log.push(...award(state, data, ach));
  }
  for (const t of (Array.isArray(delta.loot_boxes) ? delta.loot_boxes : []).slice(0, 2)) {
    if (TIERS.includes(t) && t !== 'legendary') { addBox(state, t, 'DM'); log.push(`Loot box: ${t}`); }
  }
  if (typeof delta.summary === 'string' && delta.summary.trim()) state.summary = delta.summary.trim().slice(0, 800);
  return log;
}

// Fires timer events as turns tick. Returns { events, log }.
export function tickTimer(state, floor) {
  const events = [], log = [];
  state.floor.turnsLeft = Math.max(0, state.floor.turnsLeft - 1);
  state.floor.turnsSpent += 1;
  for (const ev of floor.timerEvents) {
    if (state.floor.turnsLeft <= ev.turnsLeft && !state.floor.firedEvents.includes(ev.turnsLeft)) {
      state.floor.firedEvents.push(ev.turnsLeft);
      events.push(ev.event);
      log.push(`TIMER: ${ev.event}`);
      if (ev.turnsLeft === 0 && state.map.current !== 'stairs-room') {
        state.dead = true; state.deathCause = 'The floor collapsed. Paperwork pending.';
        log.push('YOU DIED: the floor collapsed.');
      }
    }
  }
  return { events, log };
}

export async function takeTurn({ state, floor, data, action, key, model, prompt, rng = defaultRng, call = callModel }) {
  if (state.dead) throw new Error('You are dead. Start a new crawl.');
  const snap = structuredClone(state);
  try {
    const dice = rollPool(rng);
    const log = [];
    const extra = [];
    // Movement is decided in code, not by the model.
    const exit = matchExit(state, floor, action);
    if (exit) {
      if (exit.status.ok) {
        moveTo(state, floor, exit.to);
        const r = currentRoom(state, floor);
        extra.push(`The crawler just moved into ${r.name}. Describe arriving there (${r.blurb}).`);
        log.push(`-> ${r.name}`);
      } else {
        extra.push(`The way to ${exit.name} is blocked (${exit.status.reason}). The crawler did NOT move. Narrate why.`);
      }
    }
    const { events, log: tlog } = tickTimer(state, floor);
    log.push(...tlog);
    state.turn += 1;
    let narration = '';
    if (!state.dead) {
      const messages = buildMessages({ prompt, state, floor, action, dice, events: [...extra, ...events] });
      const raw = await call({ key, model, messages }); // the one API call
      const parsed = parseReply(raw);
      narration = parsed.narration || '(The System stares at you in silence.)';
      const delta = parsed.delta && exit ? { ...parsed.delta, room: undefined } : parsed.delta;
      log.push(...applyDelta(state, floor, data, delta));
      state.history.push({ role: 'user', content: action }, { role: 'assistant', content: narration });
      state.history = state.history.slice(-12);
    } else {
      narration = state.deathCause;
    }
    log.push(...checkCodeAchievements(state, data));
    return { narration, log, dice, needsSummary: state.turn % 10 === 0 };
  } catch (e) {
    // A failed turn costs nothing: restore everything.
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, snap);
    throw e;
  }
}
