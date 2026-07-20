import { useEffect, useRef, useState } from "react";
import adverts, { type Advert } from "@/data/adverts";

const ROTATION_INTERVAL_MS = 8000;

// Utility: analytics helpers
function trackImpression(advertiser: string, slot: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.("event", "advert_impression", { advertiser, slot });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).plausible?.("advert_impression", { props: { advertiser, slot } });
  } catch {
    // no-op
  }
  console.log("[P³ analytics] advert_impression", { advertiser, slot });
}

function trackClick(advertiser: string, slot: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.("event", "advert_click", { advertiser, slot });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).plausible?.("advert_click", { props: { advertiser, slot } });
  } catch {
    // no-op
  }
  console.log("[P³ analytics] advert_click", { advertiser, slot });
}

function isActive(ad: Advert): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(ad.start);
  const end = new Date(ad.end);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

interface AdCreativeProps {
  ad: Advert;
  slot: string;
}

function AdCreative({ ad, slot }: AdCreativeProps) {
  const hasCreative = Boolean(ad.creativeLight);

  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Advertisement: ${ad.advertiser}${ad.headline ? ` — ${ad.headline}` : ""}`}
      onClick={() => trackClick(ad.advertiser, slot)}
      className="group flex items-center gap-5 w-full hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background rounded-2xl"
    >
      {/* Creative / logo */}
      {hasCreative ? (
        <div className="flex-shrink-0 h-12 w-24 flex items-center justify-center">
          <img
            src={`${import.meta.env.BASE_URL}${ad.creativeLight}`}
            alt={ad.advertiser}
            className="h-10 w-auto max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 h-12 px-5 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-sm font-bold text-primary tracking-tight">{ad.advertiser}</span>
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        {ad.headline && (
          <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors truncate">
            {ad.headline}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{ad.advertiser}</p>
      </div>

      {/* Arrow */}
      <span
        aria-hidden="true"
        className="flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-sm"
      >
        →
      </span>
    </a>
  );
}

interface AdSlotProps {
  slot: "home-banner" | "events-inline";
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  const active = adverts.filter((a) => a.slot === slot && isActive(a));
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const impressionFired = useRef<Set<string>>(new Set());

  // Rotate through multiple active adverts
  useEffect(() => {
    if (active.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % active.length);
        setVisible(true);
      }, 300);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active.length]);

  // Fire impression once per ad per mount
  useEffect(() => {
    if (active.length === 0) return;
    const ad = active[index];
    const key = `${ad.id}-${slot}`;
    if (!impressionFired.current.has(key)) {
      impressionFired.current.add(key);
      trackImpression(ad.advertiser, slot);
    }
  }, [index, active, slot]);

  // Render nothing if no active adverts — collapses the space cleanly
  if (active.length === 0) return null;

  const ad = active[index];

  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/50 px-5 py-4 flex flex-col gap-3 ${className}`}
      style={{ transition: "opacity 0.3s ease", opacity: visible ? 1 : 0 }}
      role="region"
      aria-label="Sponsored content"
    >
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          In partnership with
        </span>
        {active.length > 1 && (
          <span className="text-[10px] text-muted-foreground/40">
            {index + 1} / {active.length}
          </span>
        )}
      </div>

      <AdCreative ad={ad} slot={slot} />
    </div>
  );
}
