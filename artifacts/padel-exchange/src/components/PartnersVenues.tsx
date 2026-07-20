import { useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, MapPin, ExternalLink } from "lucide-react";
import partners from "@/data/partners";
import venues from "@/data/venues";

// ─── Analytics ────────────────────────────────────────────────────────────────
function trackPartnerClick(name: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.("event", "partner_click", { partner_name: name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).plausible?.("partner_click", { props: { partner: name } });
  } catch { /* no-op */ }
}

// ─── Partner logo tile ────────────────────────────────────────────────────────
function PartnerLogo({ name, logoLight, url }: { name: string; logoLight: string; url: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${name}`}
      onClick={() => trackPartnerClick(name)}
      className="flex-shrink-0 flex items-center justify-center h-14 px-12 mx-5 rounded-2xl
                 border border-border/50 bg-card/40
                 hover:border-primary/30 hover:bg-card
                 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
    >
      {logoLight ? (
        <img
          src={`${import.meta.env.BASE_URL}${logoLight}`}
          alt={name}
          className="h-8 w-auto object-contain"
          style={{ mixBlendMode: "screen" }}
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap select-none">
          {name.includes("·") ? (
            <>{name.split("·")[0].trim()}<span className="text-primary">·</span>{name.split("·")[1].trim()}</>
          ) : (
            <>{initials.length < 4 ? initials : name}</>
          )}
        </span>
      )}
    </a>
  );
}

// ─── Venue card placeholders ───────────────────────────────────────────────────
const PLACEHOLDERS: Record<string, string> = {
  racketeer: "from-[#1a3a5c] to-[#0d2035]",
  surbiton:  "from-[#1a4a2e] to-[#0d2a18]",
  padium:    "from-[#2a1a4a] to-[#160d2a]",
};

// ─── PARTNERS (marquee) ───────────────────────────────────────────────────────
export function PartnersSection() {
  const carouselPartners = partners.filter((p) => p.showInCarousel);
  const items = [...carouselPartners, ...carouselPartners];
  const pauseRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <style>{`
        @keyframes p3-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .p3-carousel-track { animation: p3-marquee 28s linear infinite; }
        .p3-carousel-track:hover,
        .p3-carousel-paused .p3-carousel-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .p3-carousel-track { animation: none !important; }
        }
      `}</style>

      <section className="pt-20 md:pt-24 pb-6 border-t border-border/40 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 mb-4 text-center">
          <span className="text-primary text-xs font-semibold tracking-widest uppercase">
            Our partners
          </span>
        </div>

        <div
          ref={pauseRef}
          className="relative"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
          onMouseEnter={() => pauseRef.current?.classList.add("p3-carousel-paused")}
          onMouseLeave={() => pauseRef.current?.classList.remove("p3-carousel-paused")}
        >
          <div className="hidden motion-reduce:flex flex-wrap justify-center gap-4 px-4">
            {carouselPartners.map((p) => (
              <PartnerLogo key={p.id} name={p.name} logoLight={p.logoLight} url={p.url} />
            ))}
          </div>
          <div className="motion-reduce:hidden flex">
            <div className="p3-carousel-track flex">
              {items.map((p, i) => (
                <PartnerLogo key={`${p.id}-${i}`} name={p.name} logoLight={p.logoLight} url={p.url} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Link
            href="/partner-with-us"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Partner with us
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}

// ─── VENUES (scrollable cards) ────────────────────────────────────────────────
export function VenuesSection() {
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
      <div className="container mx-auto px-4 md:px-8 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="w-[72px]" />
          <div className="text-center">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-2">
              Where we play
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Our venues</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-[72px] justify-end">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:border-primary/50
                         disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:border-primary/50
                         disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

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
            <div className="relative h-44 overflow-hidden">
              {venue.photo ? (
                <img
                  src={`${import.meta.env.BASE_URL}${venue.photo}`}
                  alt={venue.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDERS[venue.id] ?? "from-card to-background"} flex items-center justify-center p-8`}>
                  {venue.logo ? (
                    <img
                      src={`${import.meta.env.BASE_URL}${venue.logo}`}
                      alt={`${venue.name} logo`}
                      className="w-full max-w-[180px] h-auto object-contain"
                      style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
                      loading="lazy"
                    />
                  ) : (
                    <svg viewBox="0 0 160 100" className="w-40 opacity-10" fill="none" stroke="white" strokeWidth="1.5">
                      <rect x="10" y="10" width="140" height="80" />
                      <line x1="80" y1="10" x2="80" y2="90" />
                      <line x1="10" y1="50" x2="160" y2="50" />
                      <rect x="30" y="25" width="100" height="50" />
                    </svg>
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              <span className="absolute top-3 right-3 text-xs font-semibold bg-primary/20 border border-primary/30 text-primary px-2.5 py-1 rounded-full backdrop-blur-sm">
                {venue.courts} courts
              </span>
            </div>
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
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{venue.blurb}</p>
            </div>
          </a>
        ))}

        <div className="flex-shrink-0 w-72 md:w-80 rounded-2xl border border-dashed border-border/50 bg-card/20
                        flex flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="text-3xl">🏟️</span>
          <p className="text-sm font-semibold text-foreground">More venues coming</p>
          <p className="text-xs text-muted-foreground">We're expanding across London and beyond.</p>
        </div>

        <div className="flex-shrink-0 w-4 md:w-8" />
      </div>
    </section>
  );
}

// Keep the combined export for backwards compatibility
export function PartnersVenues() {
  return <><PartnersSection /><VenuesSection /></>;
}
