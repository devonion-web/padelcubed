/**
 * Legacy static event list — kept only as a fallback type reference.
 * The mobile app fetches live event data from the API via useEvents().
 * Do NOT add test or placeholder events here.
 */
export interface Event {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format: string;
  sponsor: string;
  price: string;
  status: 'available' | 'limited' | 'soon';
  description: string;
}

export const EVENTS: Event[] = [];
