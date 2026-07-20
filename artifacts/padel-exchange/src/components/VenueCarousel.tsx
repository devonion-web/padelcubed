import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, ExternalLink } from "lucide-react";
import venues from "@/data/venues";

// Gradient placeholders keyed by venue id
const PLACEHOLDERS: Record<string, string> = {
  racketeer: "from-[#1a3a5c] to-[#0d2035]",
  surbiton:  "from-[#1a4a2e] to-[#0d2a18]",
  padium:    "from-[#2a1a4a] to-[#160d2a]",
};

export function VenueCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scroll(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  }

  return (
    <section className="py-12 md:py-16 border-t border-border/50 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-2">
              Where we play
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Our venues
            </h2>
          </div>

          {/* Arrow controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:border-primary/50
                         disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:border-primary/50
                         disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="flex gap-5 overflow-x-auto scroll-smooth px-4 md:px-8
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {venues.map((venue) => (
          <a
            key={venue.id}
            href={venue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden border border-border/50
                       bg-card hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Photo / placeholder */}
            <div className="relative h-44 overflow-hidden">
              {venue.photo ? (
                <img
                  src={`${import.meta.env.BASE_URL}${venue.photo}`}
                  alt={venue.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${PLACEHOLDERS[venue.id] ?? "from-card to-background"} 
                              flex items-center justify-center`}
                >
                  {/* Court line graphic */}
                  <svg viewBox="0 0 160 100" className="w-40 opacity-10" fill="none" stroke="white" strokeWidth="1.5">
                    <rect x="10" y="10" width="140" height="80" />
                    <line x1="80" y1="10" x2="80" y2="90" />
                    <line x1="10" y1="50" x2="160" y2="50" />
                    <rect x="30" y="25" width="100" height="50" />
                  </svg>
                </div>
              )}
              {/* Gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              {/* Court count badge */}
              <span className="absolute top-3 right-3 text-xs font-semibold bg-primary/20 border border-primary/30 text-primary px-2.5 py-1 rounded-full backdrop-blur-sm">
                {venue.courts} courts
              </span>
            </div>

            {/* Card body */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {venue.name}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 flex-shrink-0 mt-0.5 transition-colors" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                {venue.location}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {venue.blurb}
              </p>
            </div>
          </a>
        ))}

        {/* "More coming" placeholder card */}
        <div className="flex-shrink-0 w-72 md:w-80 rounded-2xl border border-dashed border-border/50 bg-card/20
                        flex flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="text-3xl">🏟️</span>
          <p className="text-sm font-semibold text-foreground">More venues coming</p>
          <p className="text-xs text-muted-foreground">We're expanding across London and beyond.</p>
        </div>

        {/* Right padding spacer */}
        <div className="flex-shrink-0 w-4 md:w-8" />
      </div>
    </section>
  );
}
