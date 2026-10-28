// Achievements: code-checked ones are awarded here; DM-judged ones come in via delta.
import { addXp } from './state.js';

export function findAch(data, key) {
  const k = String(key).toLowerCase();
  return data.achievements.achievements.find((a) => a.id === k || a.name.toLowerCase() === k);
}

export function award(state, data, ach, rewardOverride) {
  if (state.achievements.some((a) => a.id === ach.id)) return [];
  const r = data.achievements.rewards[rewardOverride || ach.reward] || { xp: 5 };
  state.achievements.push({ id: ach.id, name: ach.name, turn: state.turn });
  const log = [`ACHIEVEMENT: ${ach.name} - ${ach.quip}`];
  log.push(...addXp(state, r.xp || 0));
  if (r.box) { state.lootBoxes.push({ tier: r.box, from: ach.name }); log.push(`Loot box earned: ${r.box}`); }
  return log;
}

const count = (inv) => Object.values(inv).reduce((s, l) => s + l.length, 0);

const CHECKS = {
  registered: () => true,
  'level-two': (s) => s.crawler.level >= 2,
  'level-five': (s) => s.crawler.level >= 5,
  'close-call': (s) => s.crawler.hp > 0 && s.crawler.hp <= 2,
  'hoarder-of-garbage': (s) => s.inventory.junk.length >= 10,
  'box-addict': (s) => s.counters.boxesOpened >= 5,
  'fully-loaded': (s) => s.trinkets.every(Boolean),
  'slow-and-steady': (s) => s.floor.turnsSpent >= 150,
  'running-late': (s) => s.floor.turnsLeft <= 50 && s.floor.turnsLeft > 0,
  'next-floor-please': (s) => s.floor.number >= 2,
  'walking-pharmacy': (s) => s.inventory.consumables.length >= 5,
  'window-shopping': (s) => count(s.inventory) >= 15,
};

// Runs every code-checked achievement; returns log lines.
export function checkCodeAchievements(state, data) {
  const log = [];
  for (const a of data.achievements.achievements) {
    if (a.check !== 'code') continue;
    const fn = CHECKS[a.id];
    if (fn && fn(state)) log.push(...award(state, data, a));
  }
  return log;
}
