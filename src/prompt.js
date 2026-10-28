// DM prompt and per-turn message building.
import { currentRoom, visibleExits, roomById } from './map.js';
import { rollDie, statMod } from './dice.js';

export const DEFAULT_PROMPT = `You are THE SYSTEM, the snarky, bureaucratic AI game master of a deadly dungeon crawl TV show. The player is a human Crawler, alone.

VOICE: dry, sarcastic, quick. Corporate cruelty with dark humor. Second person present tense.
PACING: SHORT turns, under 120 words. One beat per turn. Fights are narrated, not played blow by blow. A failed check does NOT always mean damage: sometimes it means a cost, a complication, or lost time. Mention the audience/fans only occasionally.
DICE: the app pre-rolls dice. Use ONLY the PRE-ROLLED values given. Never invent rolls. d20 + stat modifier vs difficulty 10 easy, 13 normal, 16 hard. 20 is a great success, 1 is a bad one.
WORLD: stay inside the current room and its listed exits. You may not invent new exits. Do not move the player unless the action clearly goes through a listed exit.
STATE: the app owns numbers. You propose changes in a delta block; keep them small and fair.

OUTPUT FORMAT, always:
1) The narration.
2) Then exactly one block: <state>{...}</state> with only the fields that changed:
 hp (delta, e.g. -3), mp (delta), xp (delta 0-25), add_items [{name, tab (gear|consumable|junk|trinket|quest), effect}], remove_items [names], achievements [ids or names], loot_boxes [tier], room (id of a listed exit you moved the player to), discover [room ids of secret exits found], flags {name:true}, summary (only when asked).
Example: <state>{"hp":-2,"xp":5,"flags":{"has-badge":true}}</state>
RULES: never kill the player in a single turn from full health. Always include the state block, even if empty: <state>{}</state>.`;

export function rollPool(rng) {
  return { d20: [rollDie(20, rng), rollDie(20, rng), rollDie(20, rng)], d6: [rollDie(6, rng), rollDie(6, rng)] };
}

export function sceneBlock(state, floor) {
  const room = currentRoom(state, floor);
  const exits = visibleExits(state, floor)
    .map((e) => `${e.to} (${e.name}, ${e.kind}${e.status.ok ? '' : ', blocked: ' + e.status.reason})`)
    .join('; ');
  const enemies = (room.encounters || []).join(', ') || 'none';
  const c = state.crawler;
  return [
    `FLOOR ${state.floor.number} "${state.floor.name}", turns left ${state.floor.turnsLeft}`,
    `ROOM ${room.id}: ${room.name}. ${room.blurb}`,
    `ENCOUNTERS: ${enemies}`,
    `EXITS: ${exits}`,
    `CRAWLER: ${c.name}, ${c.cls} L${c.level}, HP ${c.hp}/${c.hpMax}, MP ${c.mp}/${c.mpMax}, stats ` +
      Object.entries(state.stats).map(([k, v]) => `${k} ${v}(${statMod(v) >= 0 ? '+' : ''}${statMod(v)})`).join(' '),
    `FLAGS: ${Object.keys(state.flags).join(', ') || 'none'}`,
    `ITEMS: ${[...Object.values(state.inventory).flat(), ...state.trinkets.filter(Boolean)].map((i) => i.name).join(', ') || 'none'}`,
    `STORY SO FAR: ${state.summary || '(just started)'}`,
  ].join('\n');
}

export function buildMessages({ prompt, state, floor, action, dice, events = [] }) {
  const msgs = [{ role: 'system', content: prompt }];
  msgs.push({ role: 'system', content: sceneBlock(state, floor) });
  for (const h of state.history.slice(-6)) msgs.push(h);
  const ev = events.length ? `\nSYSTEM EVENTS THIS TURN: ${events.join(' | ')}` : '';
  msgs.push({
    role: 'user',
    content: `${action}\n\nPRE-ROLLED d20: ${dice.d20.join(', ')}; d6: ${dice.d6.join(', ')}${ev}\n[System reminder: under 120 words. Use the PRE-ROLLED dice. You MUST end with the <state>{...}</state> block.]`,
  });
  return msgs;
}

export { roomById };
