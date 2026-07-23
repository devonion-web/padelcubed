/**
 * Admin API hooks — all calls use Authorization: Bearer <token>.
 * adminPassword query params have been replaced with JWT bearer auth.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType, BodyType } from "./custom-fetch";
import type { ApiEvent, ApiBooking } from "./events";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveStatus = "live" | "upcoming" | "ended";

export interface AdminEvent extends ApiEvent {
  bookedCount: number;
  checkedInCount: number;
  walkinCount: number;
  liveStatus: LiveStatus;
  courtsCount?: number | null;
  roundDurationMinutes?: number | null;
  totalEventMinutes?: number | null;
}

export interface AdminBooking extends ApiBooking {
  checkedInAt: string | null;
}

export interface CheckInInput {
  bookingId: number;
}

export interface AdminUserInfo {
  id: number;
  email: string;
  name: string;
  role: "superadmin" | "admin";
}

export interface TournamentConfig {
  courtsCount: number;
  roundDurationMinutes: number;
  totalEventMinutes: number;
}

export interface EventInput {
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format?: string;
  sponsor?: string | null;
  price?: string;
  status?: "available" | "limited" | "soon";
  description?: string | null;
  maxSpots?: number;
  courtsCount?: number;
  roundDurationMinutes?: number;
  totalEventMinutes?: number;
  eventDate?: string | null;
  published?: boolean;
}

export interface CreateEventInput extends EventInput {
  id: string;
}

// ─── Shared auth header helper ────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ─── GET /admin/events ────────────────────────────────────────────────────────

export const getAdminEventsQueryKey = (token: string) =>
  ["/api/admin/events", token] as const;

export function useAdminEvents<TData = AdminEvent[], TError = ErrorType<unknown>>(
  token: string,
  options?: { query?: Omit<UseQueryOptions<AdminEvent[], TError, TData>, "queryKey"> },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: getAdminEventsQueryKey(token),
    queryFn: ({ signal }) =>
      customFetch<AdminEvent[]>("/api/admin/events", {
        signal,
        headers: authHeaders(token),
      }),
    enabled: Boolean(token),
    ...queryOptions,
  });
}

// ─── GET /admin/events/:id ────────────────────────────────────────────────────

export const getAdminEventQueryKey = (id: string, token: string) =>
  ["/api/admin/events", id, token] as const;

export function useAdminEvent<TData = AdminEvent, TError = ErrorType<unknown>>(
  eventId: string,
  token: string,
  options?: { query?: Omit<UseQueryOptions<AdminEvent, TError, TData>, "queryKey"> },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: getAdminEventQueryKey(eventId, token),
    queryFn: ({ signal }) =>
      customFetch<AdminEvent>(`/api/admin/events/${eventId}`, {
        signal,
        headers: authHeaders(token),
      }),
    enabled: Boolean(eventId) && Boolean(token),
    ...queryOptions,
  });
}

// ─── POST /admin/events ───────────────────────────────────────────────────────

export function useAdminCreateEvent<TError = ErrorType<unknown>, TContext = unknown>(
  token: string,
  options?: {
    mutation?: UseMutationOptions<AdminEvent, TError, BodyType<CreateEventInput>, TContext>;
  },
): UseMutationResult<AdminEvent, TError, BodyType<CreateEventInput>, TContext> {
  return useMutation({
    mutationFn: (data) =>
      customFetch<AdminEvent>("/api/admin/events", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

// ─── PUT /admin/events/:id ────────────────────────────────────────────────────

export function useAdminUpdateEvent<TError = ErrorType<unknown>, TContext = unknown>(
  eventId: string,
  token: string,
  options?: {
    mutation?: UseMutationOptions<AdminEvent, TError, BodyType<EventInput>, TContext>;
  },
): UseMutationResult<AdminEvent, TError, BodyType<EventInput>, TContext> {
  return useMutation({
    mutationFn: (data) =>
      customFetch<AdminEvent>(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

// ─── GET /admin/events/:id/bookings ──────────────────────────────────────────

export const getAdminEventBookingsQueryKey = (id: string, token: string) =>
  ["/api/admin/events", id, "bookings", token] as const;

export function useAdminEventBookings<TData = AdminBooking[], TError = ErrorType<unknown>>(
  eventId: string,
  token: string,
  options?: { query?: Omit<UseQueryOptions<AdminBooking[], TError, TData>, "queryKey"> },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: getAdminEventBookingsQueryKey(eventId, token),
    queryFn: ({ signal }) =>
      customFetch<AdminBooking[]>(`/api/admin/events/${eventId}/bookings`, {
        signal,
        headers: authHeaders(token),
      }),
    enabled: Boolean(eventId) && Boolean(token),
    ...queryOptions,
  });
}

// ─── POST /admin/events/:id/checkin ──────────────────────────────────────────

const checkInFn =
  (
    eventId: string,
    token: string,
  ): MutationFunction<AdminBooking, { data: BodyType<CheckInInput> }> =>
  ({ data }) =>
    customFetch<AdminBooking>(`/api/admin/events/${eventId}/checkin`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });

export function useCheckIn<TError = ErrorType<{ error: string }>, TContext = unknown>(
  eventId: string,
  token: string,
  options?: {
    mutation?: UseMutationOptions<
      AdminBooking,
      TError,
      { data: BodyType<CheckInInput> },
      TContext
    >;
  },
): UseMutationResult<AdminBooking, TError, { data: BodyType<CheckInInput> }, TContext> {
  return useMutation({
    mutationFn: checkInFn(eventId, token),
    ...options?.mutation,
  });
}

// ─── DELETE /admin/events/:id/checkin ────────────────────────────────────────

const undoCheckInFn =
  (
    eventId: string,
    token: string,
  ): MutationFunction<AdminBooking, { data: BodyType<CheckInInput> }> =>
  ({ data }) =>
    customFetch<AdminBooking>(`/api/admin/events/${eventId}/checkin`, {
      method: "DELETE",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });

export function useUndoCheckIn<TError = ErrorType<{ error: string }>, TContext = unknown>(
  eventId: string,
  token: string,
  options?: {
    mutation?: UseMutationOptions<
      AdminBooking,
      TError,
      { data: BodyType<CheckInInput> },
      TContext
    >;
  },
): UseMutationResult<AdminBooking, TError, { data: BodyType<CheckInInput> }, TContext> {
  return useMutation({
    mutationFn: undoCheckInFn(eventId, token),
    ...options?.mutation,
  });
}
