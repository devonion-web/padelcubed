import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type GameFormat = 'americano' | 'mexicano' | 'round_robin' | 'knockout';

export interface AmericanoPlayer {
  id: number;
  sessionId: number;
  name: string;
  email: string | null;
  bookingId: number | null;
  walkinId: number | null;
  totalPoints: number;
  roundsPlayed: number;
  wins: number;
  eliminated: boolean;
}

export interface AmericanoRound {
  id: number;
  sessionId: number;
  roundNumber: number;
  startedAt: string | null;
  endedAt: string | null;
}

export interface AmericanoCourt {
  id: number;
  roundId: number;
  courtNumber: number;
  player1Id: number;
  player2Id: number;
  player3Id: number;
  player4Id: number;
  teamAScore: number | null;
  teamBScore: number | null;
}

export interface AmericanoSession {
  id: number;
  eventId: string;
  format: GameFormat;
  courtsCount: number;
  roundDurationMinutes: number;
  status: string;
  currentRound: number;
}

export interface AmericanoState {
  session: AmericanoSession;
  players: AmericanoPlayer[];
  currentRound: AmericanoRound | null;
  currentCourts: AmericanoCourt[];
  totalRounds: number;
}

export interface StartSessionInput {
  format: GameFormat;
  courtsCount: number;
  roundDurationMinutes: number;
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

export const getAmericanoQueryKey = (eventId: string) => ['americano', eventId] as const;

export function useAmericanoState(eventId: string, token: string) {
  return useQuery<AmericanoState>({
    queryKey: getAmericanoQueryKey(eventId),
    queryFn: () => apiFetch<AmericanoState>(`/api/admin/events/${eventId}/americano`, token),
    retry: false,
    refetchInterval: 8_000,
  });
}

export function useStartSession(eventId: string, token: string) {
  const qc = useQueryClient();
  return useMutation<AmericanoState, Error, StartSessionInput>({
    mutationFn: (input) =>
      apiFetch<AmericanoState>(`/api/admin/events/${eventId}/americano`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => qc.setQueryData(getAmericanoQueryKey(eventId), data),
  });
}

/** Keep legacy alias for any code still using useStartAmericano */
export function useStartAmericano(eventId: string, token: string) {
  return useStartSession(eventId, token);
}

export function useStartRound(token: string) {
  return useMutation<AmericanoRound, Error, { roundId: number; eventId: string }>({
    mutationFn: ({ roundId }) =>
      apiFetch<AmericanoRound>(`/api/admin/americano/rounds/${roundId}/start`, token, { method: 'PUT' }),
  });
}

export function useNextRound(eventId: string, token: string) {
  const qc = useQueryClient();
  return useMutation<AmericanoState, Error>({
    mutationFn: () =>
      apiFetch<AmericanoState>(`/api/admin/events/${eventId}/americano/rounds`, token, { method: 'POST' }),
    onSuccess: (data) => qc.setQueryData(getAmericanoQueryKey(eventId), data),
  });
}

export function useEnterScore(token: string) {
  const qc = useQueryClient();
  return useMutation<AmericanoState, Error, { courtId: number; teamAScore: number; teamBScore: number; eventId: string }>({
    mutationFn: ({ courtId, teamAScore, teamBScore }) =>
      apiFetch<AmericanoState>(`/api/admin/americano/courts/${courtId}/score`, token, {
        method: 'POST',
        body: JSON.stringify({ teamAScore, teamBScore }),
      }),
    onSuccess: (data, { eventId }) => qc.setQueryData(getAmericanoQueryKey(eventId), data),
  });
}

export function useEndSession(eventId: string, token: string) {
  const qc = useQueryClient();
  return useMutation<AmericanoState, Error>({
    mutationFn: () =>
      apiFetch<AmericanoState>(`/api/admin/events/${eventId}/americano/end`, token, { method: 'PUT' }),
    onSuccess: (data) => qc.setQueryData(getAmericanoQueryKey(eventId), data),
  });
}

export function useLeaderboard(eventId: string, token: string) {
  return useQuery<{ session: AmericanoSession; players: AmericanoPlayer[] }>({
    queryKey: ['leaderboard', eventId],
    queryFn: () => apiFetch(`/api/admin/events/${eventId}/leaderboard`, token),
    refetchInterval: 10_000,
  });
}
