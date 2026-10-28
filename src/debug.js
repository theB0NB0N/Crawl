// Debug log: records each turn so a report can be copied and pasted for troubleshooting.
const KEY = 'crawl_debug';
const MAX = 40;
export const BUILD = '0.1.2';

export function createDebug(store) {
  let entries = [];
  try { entries = JSON.parse(store.get(KEY, '[]')); } catch { entries = []; }
  return {
    entries: () => entries,
    record(e) {
      entries.push({ at: new Date().toISOString(), ...e });
      entries = entries.slice(-MAX);
      store.set(KEY, JSON.stringify(entries));
    },
    note(text) { this.record({ kind: 'note', text }); },
    clear() { entries = []; store.set(KEY, '[]'); },
    report(state, { model, ua = '' } = {}) {
      return buildReport(state, entries, { model, ua });
    },
  };
}

const names = (l) => l.map((i) => i && i.name).filter(Boolean).join(', ') || '-';

export function buildReport(state, entries, { model, ua } = {}) {
  const L = [];
  L.push(`CRAWL DEBUG REPORT (build ${BUILD})`);
  L.push(`model: ${model || '?'}   time: ${new Date().toISOString()}`);
  if (ua) L.push(`ua: ${ua}`);
  if (state) {
    const c = state.crawler;
    L.push('', '== STATE ==');
    L.push(`${c.name} the ${c.cls}, L${c.level} XP ${c.xp}, HP ${c.hp}/${c.hpMax}, MP ${c.mp}/${c.mpMax}${state.dead ? ' DEAD: ' + state.deathCause : ''}`);
    L.push(`stats: ${JSON.stringify(state.stats)}`);
    L.push(`floor ${state.floor.number}, room ${state.map.current}, turn ${state.turn}, turnsLeft ${state.floor.turnsLeft}`);
    L.push(`visited: ${Object.keys(state.map.visited).join(', ')}`);
    L.push(`discovered: ${Object.keys(state.map.discovered).join(', ') || '-'}`);
    L.push(`flags: ${Object.keys(state.flags).join(', ') || '-'}`);
    for (const [tab, list] of Object.entries(state.inventory)) L.push(`${tab}: ${names(list)}`);
    L.push(`trinkets: ${names(state.trinkets)}`);
    L.push(`boxes: ${state.lootBoxes.map((b) => b.tier).join(', ') || '-'}`);
    L.push(`achievements: ${state.achievements.map((a) => a.name).join(', ') || '-'}`);
    L.push(`summary: ${state.summary || '-'}`);
  }
  L.push('', `== LAST ${entries.length} EVENTS (oldest first) ==`);
  for (const e of entries) {
    if (e.kind === 'note') { L.push(`[note ${e.at}] ${e.text}`); continue; }
    L.push(`--- turn ${e.turn} | ${e.at} | ${e.ms ?? '?'}ms ---`);
    L.push(`action: ${e.action}`);
    L.push(`room: ${e.roomBefore} -> ${e.roomAfter}   dice: d20 ${e.dice?.d20?.join(',')} d6 ${e.dice?.d6?.join(',')}`);
    if (e.extra?.length) L.push(`code events: ${e.extra.join(' | ')}`);
    if (e.error) L.push(`ERROR: ${e.error}`);
    if (e.raw !== undefined) L.push(`raw reply: ${JSON.stringify(e.raw)}`);
    if (e.delta !== undefined) L.push(`parsed delta: ${e.delta === null ? 'NONE (state block missing/unparseable)' : JSON.stringify(e.delta)}`);
    if (e.log?.length) L.push(`applied: ${e.log.join(' ; ')}`);
  }
  return L.join('\n');
}
