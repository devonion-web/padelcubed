import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Zap } from "lucide-react";

interface ApiEvent {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format: string;
  price: string;
  pricePence: number;
  status: string;
  description: string | null;
  maxSpots: number | null;
  attendeeCount?: number;
}

// Display metadata keyed by venue name — no hardcoded event IDs.
// Add an entry here when a new venue is introduced.
const VENUE_META: Record<string, {
  badge: string;
  badgeClass: string;
  photo: string;
}> = {
  "Racketeer": {
    badge: "Members Event",
    badgeClass: "bg-white/15 border-white/20 text-white",
    photo: "venues/racketeer-hero.jpg",
  },
  "Surbiton Racquet Club": {
    badge: "Pre-Launch Event",
    badgeClass: "bg-white/15 border-white/20 text-white",
    photo: "venues/surbiton-hero.jpg",
  },
  "Padium": {
    badge: "Launch Event",
    badgeClass: "bg-primary/90 border-primary/60 text-white",
    photo: "venues/padium-hero.webp",
  },
};

const DEFAULT_META = {
  badge: "Upcoming Event",
  badgeClass: "bg-white/15 border-white/20 text-white",
  photo: "venues/padium-hero.webp",
};

interface EventsProps {
  onRegister: () => void;
  onBook: (event: ApiEvent) => void;
}

export function EventsSection({ onRegister, onBook }: EventsProps) {
  const { data: allEvents = [], isLoading } = useQuery<ApiEvent[]>({
    queryKey: ["/api/events"],
    queryFn: () =>
      fetch(`${import.meta.env.BASE_URL}api/events`)
        .then((r) => r.json()),
    staleTime: 60_000,
  });

  // Show the next two upcoming events (API already returns events ordered by
  // eventDate asc, so the first two are always the soonest).
  const events = allEvents.slice(0, 2);

  return (
    <section id="events" className="border-t border-border/40 py-14 md:py-20">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-2">
              Upcoming events
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Our events
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm md:text-right leading-relaxed">
            Play, connect, and belong — from a warm-up in Surbiton to the full
            P³ launch at Padium, Canary Wharf.
          </p>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-3xl bg-card/40 animate-pulse h-[420px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => {
              const meta = VENUE_META[event.venue] ?? DEFAULT_META;
              const spotsLeft =
                event.maxSpots != null && event.attendeeCount != null
                  ? event.maxSpots - event.attendeeCount
                  : null;
              const isSoon = event.status === "soon";
              const isFree = event.pricePence === 0;

              return (
                <div
                  key={event.id}
                  className="group relative rounded-3xl overflow-hidden min-h-[420px] flex flex-col justify-end"
                >
                  {/* Background photo */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${import.meta.env.BASE_URL}${meta.photo})`,
                    }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />

                  {/* Content */}
                  <div className="relative z-10 p-7 md:p-9 flex flex-col gap-4">
                    {/* Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 self-start text-xs font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm ${meta.badgeClass}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" />
                      {meta.badge}
                    </span>

                    {/* Title */}
                    <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {event.title}
                    </h3>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/70">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
                        {event.venue} · {event.location}
                      </span>
                      {spotsLeft !== null && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
                          {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </div>

                    {/* Pills */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">
                        <Zap className="h-3 w-3" />
                        {event.format}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">
                        {isFree ? "Free to members" : event.price}
                      </span>
                    </div>

                    {/* Divider + CTA */}
                    <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm text-white/55 max-w-xs leading-snug">
                        {event.description ??
                          "Curated play, real connections, a premium venue."}
                      </p>

                      {isSoon ? (
                        <button
                          type="button"
                          onClick={onRegister}
                          className="flex-shrink-0 text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-primary/30"
                        >
                          Register interest →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBook(event)}
                          className="flex-shrink-0 text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-primary/30"
                        >
                          Book a spot →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
