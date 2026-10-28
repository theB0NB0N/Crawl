// Loads static game data. In the browser uses fetch; in node tests pass a loader.
const FILES = ['classes', 'achievements', 'items', 'floor-1'];

export async function loadData(loader) {
  const load = loader || (async (name) => (await fetch(`data/${name}.json`)).json());
  const out = {};
  for (const f of FILES) out[f] = await load(f);
  return {
    classes: out.classes,
    achievements: out.achievements,
    items: out.items,
    floors: { 1: out['floor-1'] },
  };
}
