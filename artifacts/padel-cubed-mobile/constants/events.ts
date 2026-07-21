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

export const EVENTS: Event[] = [
  {
    id: 'test-live',
    title: '⚡ TEST — Live Event',
    date: 'Monday 21 July 2026',
    dateShort: '21 Jul',
    time: '10:00 am – 2:00 pm',
    venue: 'Test Venue',
    location: 'London',
    format: 'Americano',
    sponsor: 'Internal',
    price: 'Free',
    status: 'available',
    description: 'Test event for verifying the live admin workflow.',
  },
  {
    id: '1',
    title: 'The City Kickoff',
    date: 'Thursday 6 August 2026',
    dateShort: '6 Aug',
    time: '6:30 pm – 9:30 pm',
    venue: 'Racketeer',
    location: 'Acton, London',
    format: 'Americano',
    sponsor: 'Corlytics',
    price: 'Free',
    status: 'available',
    description: 'Our inaugural event — founders, finance professionals and GRC leaders meet on court. Americano format, drinks, and networking.',
  },
  {
    id: '2',
    title: 'The Finance Edition',
    date: 'Thursday 10 September 2026',
    dateShort: '10 Sep',
    time: '6:30 pm – 9:30 pm',
    venue: 'Surbiton Racquet Club',
    location: 'Surbiton, Surrey',
    format: 'Americano',
    sponsor: 'Finativ',
    price: 'Free',
    status: 'available',
    description: 'A dedicated evening for the financial services community. Mix of senior finance leaders, VCs and RegTech founders.',
  },
  {
    id: '3',
    title: 'The GRC Exchange',
    date: 'Thursday 8 October 2026',
    dateShort: '8 Oct',
    time: '6:30 pm – 9:30 pm',
    venue: 'Racketeer',
    location: 'Acton, London',
    format: 'Americano',
    sponsor: 'GRC Edge',
    price: 'Free',
    status: 'available',
    description: 'Governance, Risk and Compliance leaders gather for an evening of play, peer exchange and post-match discussion.',
  },
  {
    id: '4',
    title: 'The October Smash',
    date: 'Thursday 29 October 2026',
    dateShort: '29 Oct',
    time: '6:30 pm – 9:30 pm',
    venue: 'Padium',
    location: 'London',
    format: 'Americano',
    sponsor: 'Apollo 1971',
    price: 'Free',
    status: 'soon',
    description: 'A high-energy mid-autumn session at one of London\'s premier padel venues. Limited spaces.',
  },
  {
    id: '5',
    title: 'The Year Closer',
    date: 'Thursday 3 December 2026',
    dateShort: '3 Dec',
    time: '6:30 pm – 9:30 pm',
    venue: 'Racketeer',
    location: 'Acton, London',
    format: 'Americano',
    sponsor: 'byrne·dean',
    price: 'Free',
    status: 'soon',
    description: 'Close out 2026 on court with the P³ community. Our biggest event of the year — expect a full house.',
  },
];
