/**
 * Handwritten hooks for the admin events + check-in API endpoints.
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

export interface AdminEvent extends ApiEvent {
  bookedCount: number;
  checkedInCount: number;
}

export interface AdminBooking extends ApiBooking {
  checkedInAt: string | null;
}

export interface CheckInInput {
  bookingId: number;
  adminPassword: string;
}

// ─── GET /admin/events ────────────────────────────────────────────────────────

export const getAdminEventsUrl = (adminPassword: string) =>
  `/api/admin/events?adminPassword=${encodeURIComponent(adminPassword)}`;

export const getAdminEventsQueryKey = (adminPassword: string) =>
  ["/api/admin/events", adminPassword] as const;

export function useAdminEvents<TData = AdminEvent[], TError = ErrorType<unknown>>(
  adminPassword: string,
  options?: { query?: UseQueryOptions<AdminEvent[], TError, TData> },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: queryOptions?.queryKey ?? getAdminEventsQueryKey(adminPassword),
    queryFn: ({ signal }) =>
      customFetch<AdminEvent[]>(getAdminEventsUrl(adminPassword), { signal }),
    enabled: Boolean(adminPassword),
    ...queryOptions,
  });
}

// ─── GET /admin/events/:id/bookings ──────────────────────────────────────────

export const getAdminEventBookingsUrl = (id: string, adminPassword: string) =>
  `/api/admin/events/${id}/bookings?adminPassword=${encodeURIComponent(adminPassword)}`;

export const getAdminEventBookingsQueryKey = (id: string, adminPassword: string) =>
  ["/api/admin/events", id, "bookings", adminPassword] as const;

export function useAdminEventBookings<TData = AdminBooking[], TError = ErrorType<unknown>>(
  eventId: string,
  adminPassword: string,
  options?: { query?: UseQueryOptions<AdminBooking[], TError, TData> },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey:
      queryOptions?.queryKey ??
      getAdminEventBookingsQueryKey(eventId, adminPassword),
    queryFn: ({ signal }) =>
      customFetch<AdminBooking[]>(
        getAdminEventBookingsUrl(eventId, adminPassword),
        { signal },
      ),
    enabled: Boolean(eventId) && Boolean(adminPassword),
    ...queryOptions,
  });
}

// ─── POST /admin/events/:id/checkin ──────────────────────────────────────────

const checkInFn =
  (eventId: string): MutationFunction<AdminBooking, { data: BodyType<CheckInInput> }> =>
  ({ data }) =>
    customFetch<AdminBooking>(`/api/admin/events/${eventId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

export function useCheckIn<TError = ErrorType<{ error: string }>, TContext = unknown>(
  eventId: string,
  options?: {
    mutation?: UseMutationOptions<
      AdminBooking,
      TError,
      { data: BodyType<CheckInInput> },
      TContext
    >;
  },
): UseMutationResult<AdminBooking, TError, { data: BodyType<CheckInInput> }, TContext> {
  return useMutation({ mutationFn: checkInFn(eventId), ...options?.mutation });
}

// ─── DELETE /admin/events/:id/checkin ────────────────────────────────────────

const undoCheckInFn =
  (eventId: string): MutationFunction<AdminBooking, { data: BodyType<CheckInInput> }> =>
  ({ data }) =>
    customFetch<AdminBooking>(`/api/admin/events/${eventId}/checkin`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

export function useUndoCheckIn<TError = ErrorType<{ error: string }>, TContext = unknown>(
  eventId: string,
  options?: {
    mutation?: UseMutationOptions<
      AdminBooking,
      TError,
      { data: BodyType<CheckInInput> },
      TContext
    >;
  },
): UseMutationResult<AdminBooking, TError, { data: BodyType<CheckInInput> }, TContext> {
  return useMutation({ mutationFn: undoCheckInFn(eventId), ...options?.mutation });
}
