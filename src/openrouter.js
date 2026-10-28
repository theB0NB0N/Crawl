// OpenRouter client. One call per turn.
const BASE = 'https://openrouter.ai/api/v1';

export function friendlyError(status, body) {
  if (status === 401) return 'OpenRouter rejected the key (401). Check it in Settings.';
  if (status === 402) return 'OpenRouter says the balance is negative (402). Free models need a balance of 0 or more.';
  if (status === 429) return 'Rate limited (429): 20 requests/min, 50/day on free. Wait a bit.';
  if (status >= 500) return `OpenRouter server error (${status}). Try again.`;
  return `Request failed (${status}) ${String(body || '').slice(0, 120)}`;
}

export async function callModel({ key, model, messages, fetchImpl = fetch, timeoutMs = 60000, maxTokens = 500 }) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${BASE}/chat/completions`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Crawl' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.9 }),
      });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status >= 500 && attempt === 0) { lastErr = new Error(friendlyError(res.status, body)); continue; }
        throw new Error(friendlyError(res.status, body));
      }
      const j = await res.json();
      const text = j?.choices?.[0]?.message?.content;
      if (!text) throw new Error('The model returned an empty reply. Try again.');
      return text;
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') lastErr = new Error('The model took too long (60s).');
      else if (e instanceof TypeError) lastErr = new Error('Network error reaching OpenRouter.');
      else throw e;
      if (attempt === 1) throw lastErr;
    }
  }
  throw lastErr;
}

export async function checkKey(key, fetchImpl = fetch) {
  const res = await fetchImpl(`${BASE}/key`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(friendlyError(res.status));
  return (await res.json()).data;
}
