// Loot boxes: tier -> weighted category -> tag-weighted item from the bank.
import { weightedPick, pickRandom, defaultRng } from './dice.js';
import { addItem, noteTags } from './state.js';

export const TIERS = ['bronze', 'silver', 'gold', 'legendary'];
const MAX_RARITY = { bronze: 1, silver: 2, gold: 3, legendary: 4 };
const MIN_RARITY = { bronze: 1, silver: 1, gold: 2, legendary: 3 };
const CATEGORY_WEIGHTS = {
  bronze:    { junk: 40, consumable: 30, trinket: 15, gear: 10, scroll: 5 },
  silver:    { junk: 15, consumable: 30, trinket: 20, gear: 20, scroll: 15 },
  gold:      { junk: 5, consumable: 20, trinket: 25, gear: 30, scroll: 20 },
  legendary: { junk: 0, consumable: 10, trinket: 25, gear: 40, scroll: 25 },
};

export function pickItem(items, tier, recentTags = [], rng = defaultRng) {
  const cats = CATEGORY_WEIGHTS[tier];
  const lo = MIN_RARITY[tier], hi = MAX_RARITY[tier];
  for (let tries = 0; tries < 6; tries++) {
    const tab = weightedPick(Object.entries(cats).map(([value, weight]) => ({ value, weight })), rng);
    const pool = items.items.filter((i) => i.tab === tab && i.rarity >= lo && i.rarity <= hi);
    if (!pool.length) continue;
    const weighted = pool.map((i) => ({
      value: i,
      weight: 1 + 3 * i.tags.filter((t) => recentTags.includes(t)).length,
    }));
    return weightedPick(weighted, rng);
  }
  return pickRandom(items.items.filter((i) => i.rarity <= hi), rng);
}

// Returns { item, where, log } or null if no box of that tier.
export function openBox(state, data, index, rng = defaultRng) {
  const box = state.lootBoxes[index];
  if (!box) return null;
  state.lootBoxes.splice(index, 1);
  state.counters.boxesOpened += 1;
  const base = pickItem(data.items, box.tier, state.recentTags, rng);
  const item = { ...base };
  // Modifier on higher tiers, sometimes.
  if (box.tier !== 'bronze' && rng() < 0.4) {
    const mods = data.items.modifiers.filter((m) => m.minRarity <= MAX_RARITY[box.tier]);
    const mod = pickRandom(mods, rng);
    if (mod) { item.name = `${mod.name} ${item.name}`; item.effect = `${item.effect}. ${mod.effect}`; }
  }
  const where = addItem(state, item);
  noteTags(state, item.tags || []);
  return { item, where, log: [`${box.tier.toUpperCase()} BOX: ${item.name} -> ${where}. "${item.quip}"`] };
}

export function addBox(state, tier, from = '') {
  if (!TIERS.includes(tier)) return false;
  state.lootBoxes.push({ tier, from });
  return true;
}
