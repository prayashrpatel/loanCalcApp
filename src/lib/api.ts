export type Http = <T>(input: string, init?: RequestInit) => Promise<T>;

const BASE = (import.meta as any).env?.VITE_API_URL || '';

export const http: Http = async (path, init) => {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
};
