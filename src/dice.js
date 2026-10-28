// Dice and random helpers. All randomness lives in code, never in the model.

export function defaultRng() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
}

export function rollDie(sides, rng = defaultRng) {
  return Math.floor(rng() * sides) + 1;
}

export const statMod = (value) => Math.floor((value - 10) / 2);

// entries: [{ value, weight }]. Returns one value, or undefined if nothing has weight.
export function weightedPick(entries, rng = defaultRng) {
  const total = entries.reduce((s, e) => s + Math.max(0, e.weight), 0);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const e of entries) {
    r -= Math.max(0, e.weight);
    if (r < 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

export function pickRandom(list, rng = defaultRng) {
  if (!list.length) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(list, rng = defaultRng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
