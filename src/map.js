// Fog-of-war map logic for one floor. Pure functions over (state, floor).

export const roomById = (floor, id) => floor.rooms.find((r) => r.id === id);

export function currentRoom(state, floor) { return roomById(floor, state.map.current); }

// Whether an exit can be used right now, and why not.
export function exitStatus(state, floor, fromId, exit) {
  const target = roomById(floor, exit.to);
  if (!target) return { ok: false, reason: 'missing' };
  if (exit.kind === 'normal') return { ok: true };
  if (exit.kind === 'locked') {
    return state.flags[exit.req] ? { ok: true } : { ok: false, reason: `locked (needs ${exit.req})` };
  }
  if (exit.kind === 'secret' || exit.kind === 'vent') {
    return state.map.discovered[`${fromId}>${exit.to}`] ? { ok: true } : { ok: false, reason: 'undiscovered' };
  }
  if (exit.kind === 'gate') {
    const opts = String(exit.req || '').split('|');
    return opts.some((o) => state.flags[o]) ? { ok: true } : { ok: false, reason: 'gate is closed' };
  }
  return { ok: true };
}

// Exits the player (and the DM) may know about: secrets stay hidden until discovered.
export function visibleExits(state, floor) {
  const room = currentRoom(state, floor);
  return room.exits
    .filter((e) => !(e.kind === 'secret' || e.kind === 'vent') || state.map.discovered[`${room.id}>${e.to}`])
    .map((e) => ({ ...e, name: roomById(floor, e.to).name, status: exitStatus(state, floor, room.id, e) }));
}

export function canMove(state, floor, toId) {
  const room = currentRoom(state, floor);
  const exit = room.exits.find((e) => e.to === toId);
  if (!exit) return { ok: false, reason: 'no exit there' };
  return exitStatus(state, floor, room.id, exit);
}

export function moveTo(state, floor, toId) {
  const check = canMove(state, floor, toId);
  if (!check.ok) return check;
  state.map.current = toId;
  state.map.visited[toId] = true;
  return { ok: true };
}

export function discoverExit(state, floor, toId) {
  const room = currentRoom(state, floor);
  const exit = room.exits.find((e) => e.to === toId && (e.kind === 'secret' || e.kind === 'vent'));
  if (!exit) return false;
  state.map.discovered[`${room.id}>${toId}`] = true;
  return true;
}

// Everything the map screen should draw: visited rooms plus fogged neighbors.
export function mapView(state, floor) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const known = new Set(Object.keys(state.map.visited));
  for (const id of Object.keys(state.map.visited)) {
    const room = roomById(floor, id);
    for (const e of room.exits) {
      const hidden = (e.kind === 'secret' || e.kind === 'vent') && !state.map.discovered[`${id}>${e.to}`];
      if (!hidden) known.add(e.to);
    }
  }
  for (const id of known) {
    const r = roomById(floor, id);
    const visited = !!state.map.visited[id];
    nodes.push({ id, x: r.x, y: r.y, visited, current: id === state.map.current, label: visited ? r.name : '?', type: r.type });
  }
  for (const id of Object.keys(state.map.visited)) {
    const room = roomById(floor, id);
    for (const e of room.exits) {
      const hidden = (e.kind === 'secret' || e.kind === 'vent') && !state.map.discovered[`${id}>${e.to}`];
      if (hidden) continue;
      const key = [id, e.to].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: id, to: e.to, kind: e.kind });
    }
  }
  return { nodes, edges };
}

// Detects "go to the cafeteria" style actions and returns the matching exit, if any.
const MOVE_WORDS = /\b(go|head|enter|walk|run|move|step|visit|leave|climb|crawl|sneak|check out|into|toward|towards|exit|dash|slip)\b/i;
const STOP = new Set(['the', 'of', 'and', 'room', 'hall']);

export function matchExit(state, floor, action) {
  if (!MOVE_WORDS.test(action)) return null;
  const text = action.toLowerCase();
  let best = null, bestScore = 0;
  for (const e of visibleExits(state, floor)) {
    const words = `${e.name} ${e.to.replace(/-/g, ' ')}`.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3 && !STOP.has(w));
    const score = new Set(words.filter((w) => text.includes(w.replace(/s$/, '')))).size;
    if (score > bestScore) { best = e; bestScore = score; }
  }
  return best;
}

// The only flags a floor understands: keys that open locked exits and gates.
export function allowedFlags(floor) {
  const set = new Set();
  for (const r of floor.rooms) for (const e of r.exits) {
    if ((e.kind === 'locked' || e.kind === 'gate') && e.req) String(e.req).split('|').forEach((f) => set.add(f));
  }
  return [...set];
}
