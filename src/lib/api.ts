// src/lib/api.ts

// strip any trailing slashes from the base
export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:3000').replace(/\/+$/, '');

// Generic JSON fetcher
export async function http<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  // ensure exactly one slash between base and path
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in (data as any) && (data as any).error) ||
      `${res.status} ${res.statusText}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export function postScore(body: {
  ltv: number;
  dti: number;
  apr: number;        // decimal (0.065)
  termMonths: number;
  income: number;
}) {
  return http<{ pd: number; confidence: number; modelVersion: string }>('/api/score', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
