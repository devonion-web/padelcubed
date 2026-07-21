/**
 * Handwritten hooks for the events + bookings API endpoints.
 * Follows the same patterns as the orval-generated api.ts.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiEvent {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format: string;
  sponsor: string | null;
  price: string;
  status: string;
  description: string | null;
  maxSpots: number | null;
  eventDate: string | null;
  createdAt: string;
  attendeeCount?: number;
}

export interface Attendee {
  firstName: string;
  company: string | null;
}

export interface BookingInput {
  email: string;
  fullName: string;
  company?: string;
}

export interface CancelInput {
  email: string;
}

export interface ApiBooking {
  id: number;
  eventId: string;
  email: string;
  fullName: string;
  company: string | null;
  status: string;
  bookedAt: string;
}

// ─── GET /events ──────────────────────────────────────────────────────────────

export const getEventsUrl = () => `/api/events`;
export const getEventsQueryKey = () => [getEventsUrl()] as const;

export function useEvents<TData = ApiEvent[], TError = ErrorType<unknown>>(
  options?: {
    query?: Omit<UseQueryOptions<ApiEvent[], TError, TData>, 'queryKey'>;
  },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: getEventsQueryKey(),
    queryFn: ({ signal }) =>
      customFetch<ApiEvent[]>(getEventsUrl(), { signal }),
    ...queryOptions,
  });
}

// ─── GET /events/:id/attendees ────────────────────────────────────────────────

export const getEventAttendeesUrl = (id: string) =>
  `/api/events/${id}/attendees`;
export const getEventAttendeesQueryKey = (id: string) =>
  [getEventAttendeesUrl(id)] as const;

export function useEventAttendees<TData = Attendee[], TError = ErrorType<unknown>>(
  eventId: string,
  options?: {
    query?: Omit<UseQueryOptions<Attendee[], TError, TData>, 'queryKey'>;
  },
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};
  return useQuery({
    queryKey: getEventAttendeesQueryKey(eventId),
    queryFn: ({ signal }) =>
      customFetch<Attendee[]>(getEventAttendeesUrl(eventId), { signal }),
    enabled: Boolean(eventId),
    ...queryOptions,
  });
}

// ─── POST /events/:id/bookings ────────────────────────────────────────────────

const bookEventFn =
  (eventId: string): MutationFunction<ApiBooking, { data: BodyType<BookingInput> }> =>
  ({ data }) =>
    customFetch<ApiBooking>(`/api/events/${eventId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

export type BookEventMutationError = ErrorType<{ error: string }>;

export function useBookEvent<TError = BookEventMutationError, TContext = unknown>(
  eventId: string,
  options?: {
    mutation?: UseMutationOptions<
      ApiBooking,
      TError,
      { data: BodyType<BookingInput> },
      TContext
    >;
  },
): UseMutationResult<ApiBooking, TError, { data: BodyType<BookingInput> }, TContext> {
  return useMutation({
    mutationFn: bookEventFn(eventId),
    ...options?.mutation,
  });
}

// ─── DELETE /events/:id/bookings ──────────────────────────────────────────────

const cancelBookingFn =
  (eventId: string): MutationFunction<{ success: boolean }, { data: BodyType<CancelInput> }> =>
  ({ data }) =>
    customFetch<{ success: boolean }>(`/api/events/${eventId}/bookings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

export type CancelBookingMutationError = ErrorType<{ error: string }>;

export function useCancelBooking<TError = CancelBookingMutationError, TContext = unknown>(
  eventId: string,
  options?: {
    mutation?: UseMutationOptions<
      { success: boolean },
      TError,
      { data: BodyType<CancelInput> },
      TContext
    >;
  },
): UseMutationResult<{ success: boolean }, TError, { data: BodyType<CancelInput> }, TContext> {
  return useMutation({
    mutationFn: cancelBookingFn(eventId),
    ...options?.mutation,
  });
}
