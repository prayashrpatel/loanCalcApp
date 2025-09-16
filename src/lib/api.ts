// src/lib/api.ts
export type Http = <T>(input: string, init?: RequestInit) => Promise<T>;

const API_BASE = import.meta.env.VITE_API_BASE ?? ''; // "" locally, absolute URL in prod

export const http: Http = async (path, init) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};
