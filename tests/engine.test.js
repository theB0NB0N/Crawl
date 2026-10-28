import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadData } from '../src/data.js';
import { newGame } from '../src/state.js';
import { parseReply } from '../src/parser.js';
import { applyDelta, takeTurn, tickTimer } from '../src/engine.js';
import { openBox, addBox } from '../src/loot.js';
import { checkCodeAchievements } from '../src/achievements.js';
import { mapView, canMove, moveTo } from '../src/map.js';

const data = await loadData(async (n) => JSON.parse(readFileSync(new URL(`../data/${n}.json`, import.meta.url))));
const floor = data.floors[1];
const mk = () => newGame({ name: 'T', cls: data.classes[0], floor });

test('parser handles tags, fences, think blocks, missing close', () => {
  assert.deepEqual(parseReply('Hi <state>{"hp":-1}</state>').delta, { hp: -1 });
  assert.deepEqual(parseReply('<think>x</think>Hi\n<state>```json\n{"xp":5,}\n```').delta, { xp: 5 });
  assert.equal(parseReply('Just text').delta, null);
});

test('delta is clamped and no one-shots from full HP', () => {
  const s = mk(); const hpMax = s.crawler.hpMax;
  applyDelta(s, floor, data, { hp: -99 });
  assert.ok(s.crawler.hp >= hpMax - 5 && !s.dead);
});

test('movement obeys exits and gates', () => {
  const s = mk();
  assert.equal(moveTo(s, floor, 'stairs-room').ok, false);
  assert.equal(moveTo(s, floor, 'cafeteria').ok, true);
  assert.equal(canMove(s, floor, 'intake-hall').ok, true);
});

test('fog of war hides unvisited names', () => {
  const v = mapView(mk(), floor);
  assert.ok(v.nodes.some((n) => n.label === '?'));
  assert.ok(v.nodes.some((n) => n.current));
});

test('boxes open and achievements award', () => {
  const s = mk(); addBox(s, 'gold', 't');
  const r = openBox(s, data, 0); assert.ok(r.item.name);
  assert.equal(s.counters.boxesOpened, 1);
  checkCodeAchievements(s, data);
  assert.ok(s.achievements.some((a) => a.id === 'registered'));
});

test('timer kills outside the stairs room', () => {
  const s = mk(); s.floor.turnsLeft = 1; tickTimer(s, floor);
  assert.equal(s.dead, true);
});

test('takeTurn makes exactly one call', async () => {
  const s = mk(); let calls = 0;
  const r = await takeTurn({ state: s, floor, data, action: 'look', key: 'k', model: 'm', prompt: 'p',
    call: async () => { calls++; return 'You look.\n<state>{"xp":5}</state>'; } });
  assert.equal(calls, 1); assert.ok(s.crawler.xp >= 5); assert.equal(r.narration, 'You look.');
});

test('movement words move the player in code', async () => {
  const s = mk();
  await takeTurn({ state: s, floor, data, action: 'head to the cafeteria', key: 'k', model: 'm', prompt: 'p', call: async () => 'Ew.\n<state>{}</state>' });
  assert.equal(s.map.current, 'cafeteria');
});

test('non-movement text does not move', async () => {
  const s = mk();
  await takeTurn({ state: s, floor, data, action: 'inspect the welcome desk', key: 'k', model: 'm', prompt: 'p', call: async () => 'Meh.\n<state>{}</state>' });
  assert.equal(s.map.current, 'intake-hall');
});

test('failed call rolls the turn back', async () => {
  const s = mk(); const before = s.floor.turnsLeft;
  await assert.rejects(takeTurn({ state: s, floor, data, action: 'go to the cafeteria', key: 'k', model: 'm', prompt: 'p', call: async () => { throw new Error('boom'); } }));
  assert.equal(s.floor.turnsLeft, before); assert.equal(s.map.current, 'intake-hall'); assert.equal(s.turn, 0);
});

test('debug report captures turns and errors, never the key', async () => {
  const { createDebug } = await import('../src/debug.js');
  const { makeStorage } = await import('../src/state.js');
  const dbg = createDebug(makeStorage());
  const s = mk();
  await takeTurn({ state: s, floor, data, action: 'go to the cafeteria', key: 'SECRETKEY', model: 'm', prompt: 'p', onDebug: (e) => dbg.record(e), call: async () => 'Ew.' });
  await assert.rejects(takeTurn({ state: s, floor, data, action: 'look', key: 'SECRETKEY', model: 'm', prompt: 'p', onDebug: (e) => dbg.record(e), call: async () => { throw new Error('boom'); } }));
  const rep = dbg.report(s, { model: 'm' });
  assert.match(rep, /intake-hall -> cafeteria/);
  assert.match(rep, /NONE \(state block missing/);
  assert.match(rep, /ERROR: boom/);
  assert.ok(!rep.includes('SECRETKEY'));
});

test('invented flags are ignored, real ones accepted', () => {
  const s = mk();
  applyDelta(s, floor, data, { flags: { 'asked-goblin-for-help': true, 'supply-cage-key': true } });
  assert.deepEqual(Object.keys(s.flags), ['supply-cage-key']);
});

test('vague items rejected, bank items upgraded, unknown items get default effect', () => {
  const s = mk();
  applyDelta(s, floor, data, { add_items: [{ name: 'Trinket', tab: 'trinket' }, { name: 'Rusty Nail', tab: 'junk' }, { name: 'Goblin Dental Plan', tab: 'junk' }] });
  const names = s.inventory.junk.map((i) => i.name);
  assert.ok(!s.trinkets.some(Boolean));
  assert.ok(names.includes('Rusty Nail') && names.includes('Goblin Dental Plan'));
  assert.match(s.inventory.junk.find((i) => i.name === 'Rusty Nail').desc, /lock/i);
});

test('leaked reasoning rolls the turn back instead of showing it', async () => {
  const s = mk();
  const leak = 'The player wants to take the rag. I need to narrate this. The pre-rolled dice: d20: 8, 19, 14';
  await assert.rejects(takeTurn({ state: s, floor, data, action: 'look', key: 'k', model: 'm', prompt: 'p', call: async () => leak }), /leaked its reasoning/);
  assert.equal(s.turn, 0);
});

test('normal narration without a state block is still shown', async () => {
  const s = mk();
  const r = await takeTurn({ state: s, floor, data, action: 'look', key: 'k', model: 'm', prompt: 'p', call: async () => 'The desk is broken. So are you.' });
  assert.match(r.narration, /desk is broken/);
});

test('free model list sorts non-reasoning first', async () => {
  const { listFreeModels } = await import('../src/openrouter.js');
  const fake = async () => ({ ok: true, json: async () => ({ data: [
    { id: 'a/think:free', pricing: { prompt: '0', completion: '0' }, context_length: 100000, supported_parameters: ['reasoning'] },
    { id: 'b/plain:free', pricing: { prompt: '0', completion: '0' }, context_length: 32000, supported_parameters: [] },
    { id: 'c/paid', pricing: { prompt: '0.1', completion: '0.1' }, context_length: 1 },
  ] }) });
  const ms = await listFreeModels('k', fake);
  assert.deepEqual(ms.map((m) => m.id), ['b/plain:free', 'a/think:free']);
});
