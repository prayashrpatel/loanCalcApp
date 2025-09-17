// src/lib/api.ts

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

/** Generic JSON fetcher */
export async function http<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
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

/** Convenience wrapper for /api/score */
export function postScore(body: {
  ltv: number;
  dti: number;
  apr: number;           // decimal (e.g., 0.065)
  termMonths: number;
  income: number;
}) {
  return http<{ pd: number; confidence: number; modelVersion: string }>('/api/score', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
