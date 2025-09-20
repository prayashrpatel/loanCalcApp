export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '');

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data?.error as string) || `${res.status} ${res.statusText}`);
  return data as T;
}
