import { useRef } from "react";
import { Link } from "wouter";
import partners from "@/data/partners";

// Utility: fire an outbound-click analytics event
function trackPartnerClick(name: string) {
  try {
    // GA4 / Plausible — swap in your real event call if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.("event", "partner_click", { partner_name: name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).plausible?.("partner_click", { props: { partner: name } });
  } catch {
    // no-op
  }
  console.log("[P³ analytics] partner_click", { partner_name: name });
}

interface PartnerLogoProps {
  name: string;
  logoLight: string;
  url: string;
}

function PartnerLogo({ name, logoLight, url }: PartnerLogoProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${name}`}
      onClick={() => trackPartnerClick(name)}
      className="flex-shrink-0 flex items-center justify-center h-14 px-12 mx-5 rounded-2xl
                 border border-border/50 bg-card/40
                 grayscale opacity-50
                 hover:grayscale-0 hover:opacity-100 hover:border-primary/30 hover:bg-card
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
            <>
              {name.split("·")[0].trim()}
              <span className="text-primary">·</span>
              {name.split("·")[1].trim()}
            </>
          ) : (
            <>{initials.length < 4 ? initials : name}</>
          )}
        </span>
      )}
    </a>
  );
}

export function PartnerCarousel() {
  const carouselPartners = partners.filter((p) => p.showInCarousel);
  const pauseRef = useRef<HTMLDivElement>(null);

  if (carouselPartners.length === 0) {
    return (
      <section className="py-10 border-t border-border/40">
        <p className="text-center text-sm text-muted-foreground">
          Partnership spots open —{" "}
          <Link href="/partner-with-us" className="text-primary hover:underline font-medium">
            Partner with us
          </Link>
          .
        </p>
      </section>
    );
  }

  // Duplicate the list to create a seamless loop
  const items = [...carouselPartners, ...carouselPartners];

  return (
    <>
      {/* Inject keyframe once — only needed if prefers-reduced-motion is NOT set */}
      <style>{`
        @keyframes p3-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .p3-carousel-track {
          animation: p3-marquee 28s linear infinite;
        }
        .p3-carousel-track:hover,
        .p3-carousel-paused .p3-carousel-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .p3-carousel-track {
            animation: none !important;
          }
        }
      `}</style>

      <section className="pt-20 md:pt-24 pb-6 border-t border-border/40 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 mb-10 text-center">
          <span className="text-primary text-xs font-semibold tracking-widest uppercase">
            Our partners
          </span>
        </div>

        {/* Carousel — masked edges */}
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
          {/* Static fallback row for reduced-motion (shown as wrapped flex) */}
          <div className="hidden motion-reduce:flex flex-wrap justify-center gap-4 px-4">
            {carouselPartners.map((p) => (
              <PartnerLogo key={p.id} name={p.name} logoLight={p.logoLight} url={p.url} />
            ))}
          </div>

          {/* Animated row */}
          <div className="motion-reduce:hidden flex">
            <div className="p3-carousel-track flex">
              {items.map((p, i) => (
                <PartnerLogo key={`${p.id}-${i}`} name={p.name} logoLight={p.logoLight} url={p.url} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8">
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
