// Tolerant parser for the DM reply: narration + <state>{...}</state>.

export function stripThink(text) {
  return String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').trim();
}

export function parseReply(raw) {
  const text = stripThink(raw);
  const m = text.match(/<state>([\s\S]*?)(?:<\/state>|$)/i);
  let narration = text;
  let delta = null;
  if (m) {
    narration = text.slice(0, m.index).trim();
    delta = tryJson(m[1]);
  } else {
    // No tag: look for a trailing JSON object that looks like a delta.
    const i = text.lastIndexOf('{');
    if (i >= 0) {
      const d = tryJson(text.slice(i));
      if (d && typeof d === 'object') { delta = d; narration = text.slice(0, i).trim(); }
    }
  }
  narration = narration.replace(/```[a-z]*\s*$/i, '').trim();
  return { narration, delta };
}

function tryJson(s) {
  let t = String(s).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { /* try loose repair */ }
  try { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); } catch { return null; }
}
