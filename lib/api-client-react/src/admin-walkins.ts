import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAmericanoQueryKey } from './admin-americano.js';

export interface Walkin {
  id: number;
  eventId: string;
  name: string;
  email: string;
  paid: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const BASE = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const getWalkinsQueryKey = (eventId: string) => ['walkins', eventId] as const;

export function useWalkins(eventId: string, token: string) {
  return useQuery<Walkin[]>({
    queryKey: getWalkinsQueryKey(eventId),
    queryFn: () => apiFetch<Walkin[]>(`/api/admin/events/${eventId}/walkins`, token),
    refetchInterval: 10_000,
  });
}

export function useAddWalkin(eventId: string, token: string) {
  const qc = useQueryClient();
  return useMutation<Walkin, Error, { name: string; email: string; paid: boolean; checkedIn: boolean }>({
    mutationFn: (body) =>
      apiFetch<Walkin>(`/api/admin/events/${eventId}/walkins`, token, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getWalkinsQueryKey(eventId) });
      qc.invalidateQueries({ queryKey: getAmericanoQueryKey(eventId) });
    },
  });
}

export function useUpdateWalkinPaid(token: string) {
  const qc = useQueryClient();
  return useMutation<Walkin, Error, { id: number; paid: boolean; eventId: string }>({
    mutationFn: ({ id, paid }) =>
      apiFetch<Walkin>(`/api/admin/walkins/${id}/paid`, token, {
        method: 'PATCH',
        body: JSON.stringify({ paid }),
      }),
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: getWalkinsQueryKey(eventId) }),
  });
}
