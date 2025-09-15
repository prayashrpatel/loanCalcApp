const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
