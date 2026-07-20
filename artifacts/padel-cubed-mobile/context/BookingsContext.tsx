import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pcubed_bookings_v1';

interface BookingEntry {
  booked: boolean;
  notificationId?: string;
}

interface BookingsContextType {
  isBooked: (eventId: string) => boolean;
  book: (eventId: string, notificationId?: string) => Promise<void>;
  cancel: (eventId: string) => Promise<string | undefined>;
  isLoading: boolean;
}

const BookingsContext = createContext<BookingsContextType>({
  isBooked: () => false,
  book: async () => {},
  cancel: async () => undefined,
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

  const book = useCallback(
    async (eventId: string, notificationId?: string) => {
      await persist({ ...bookings, [eventId]: { booked: true, notificationId } });
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
    <BookingsContext.Provider value={{ isBooked, book, cancel, isLoading }}>
      {children}
    </BookingsContext.Provider>
  );
}

export const useBookings = () => useContext(BookingsContext);
