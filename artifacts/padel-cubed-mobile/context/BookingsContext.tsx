import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMyBookings } from '@workspace/api-client-react';

// v2 — adds bookingId field
const STORAGE_KEY = '@pcubed_bookings_v2';

interface BookingEntry {
  booked: boolean;
  bookingId?: number;       // server-assigned id — used to generate QR ticket
  notificationId?: string;
}

interface BookingsContextType {
  isBooked: (eventId: string) => boolean;
  getBookingId: (eventId: string) => number | undefined;
  bookedEventIds: string[];
  book: (eventId: string, bookingId?: number, notificationId?: string) => Promise<void>;
  cancel: (eventId: string) => Promise<string | undefined>;
  syncFromServer: (email: string) => Promise<void>;
  isLoading: boolean;
}

const BookingsContext = createContext<BookingsContextType>({
  isBooked: () => false,
  getBookingId: () => undefined,
  bookedEventIds: [],
  book: async () => {},
  cancel: async () => undefined,
  syncFromServer: async () => {},
  isLoading: true,
});

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Record<string, BookingEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setBookings(JSON.parse(raw) as Record<string, BookingEntry>);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback(
    async (next: Record<string, BookingEntry>) => {
      setBookings(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [],
  );

  const isBooked = useCallback(
    (eventId: string) => !!bookings[eventId]?.booked,
    [bookings],
  );

  const getBookingId = useCallback(
    (eventId: string) => bookings[eventId]?.bookingId,
    [bookings],
  );

  const bookedEventIds = React.useMemo(
    () => Object.entries(bookings).filter(([, v]) => v.booked).map(([k]) => k),
    [bookings],
  );

  const syncFromServer = useCallback(async (email: string): Promise<void> => {
    if (!email) return;
    try {
      const serverBookings = await fetchMyBookings(email);
      setBookings((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const b of serverBookings) {
          // Only add if not already tracked locally (preserve existing local bookingId)
          if (!next[b.eventId]?.booked) {
            next[b.eventId] = { booked: true, bookingId: b.id };
            changed = true;
          }
        }
        if (changed) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return changed ? next : prev;
      });
    } catch {
      // Network error — silently ignore, local data remains valid
    }
  }, []);

  const book = useCallback(
    async (eventId: string, bookingId?: number, notificationId?: string) => {
      await persist({
        ...bookings,
        [eventId]: { booked: true, bookingId, notificationId },
      });
    },
    [bookings, persist],
  );

  const cancel = useCallback(
    async (eventId: string): Promise<string | undefined> => {
      const notifId = bookings[eventId]?.notificationId;
      await persist({ ...bookings, [eventId]: { booked: false } });
      return notifId;
    },
    [bookings, persist],
  );

  return (
    <BookingsContext.Provider
      value={{ isBooked, getBookingId, bookedEventIds, book, cancel, syncFromServer, isLoading }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export const useBookings = () => useContext(BookingsContext);
