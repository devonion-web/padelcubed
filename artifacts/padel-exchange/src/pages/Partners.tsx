import { ExternalLink } from "lucide-react";
import partners from "@/data/partners";
import { Link } from "wouter";

function trackPartnerClick(name: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.("event", "partner_click", { partner_name: name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).plausible?.("partner_click", { props: { partner: name } });
  } catch {
    // no-op
  }
  console.log("[P³ analytics] partner_click", { partner_name: name });
}

const tierLabel: Record<string, string> = {
  founding: "Founding Partner",
  premium:  "Premium Partner",
  standard: "Partner",
};

const tierOrder: Record<string, number> = { founding: 0, premium: 1, standard: 2 };

export default function Partners() {
  const sorted = [...partners].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <a href="/" className="pc-logo" aria-label="P Cubed — People, Padel, Places">
            <span className="pc-mark" aria-hidden="true">P<sup>3</sup></span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="/#events" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Events</a>
            <Link href="/partners" className="text-sm font-medium text-foreground">Partners</Link>
            <a href="/#ambassadors" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Ambassadors</a>
          </nav>
          <Link
            href="/partner-with-us"
            className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Partner with us
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-16">
            <span className="text-primary text-sm font-semibold tracking-widest uppercase block mb-4">Our partners</span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
              The brands behind P³
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              People, Padel, Places is backed by companies that believe the best networks are built on court, not in conference rooms. Every partner helps keep our events world-class — and our entry prices far below market rate.
            </p>
          </div>

          {/* Partner grid */}
          {sorted.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-16 text-center">
              <p className="text-muted-foreground mb-4">Partnership spots are open.</p>
              <Link href="/partner-with-us" className="text-primary font-semibold hover:underline">
                Become our first partner →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sorted.map((p) => {
                const initials = p.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                return (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackPartnerClick(p.name)}
                    className="group flex flex-col rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  >
                    {/* Accent bar — colour by tier */}
                    <div className={`h-1 w-full ${p.tier === "founding" ? "bg-gradient-to-r from-primary via-primary/80 to-primary/20" : "bg-gradient-to-r from-border via-border/60 to-transparent"}`} />

                    <div className="flex flex-col flex-1 p-7 gap-5">
                      {/* Logo / initials */}
                      <div className="flex items-center justify-between">
                        {p.logoLight ? (
                          <img
                            src={`${import.meta.env.BASE_URL}${p.logoLight}`}
                            alt={p.name}
                            className="h-8 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                          />
                        ) : (
                          <div className="h-10 px-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary tracking-tight">{initials}</span>
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border">
                          {tierLabel[p.tier]}
                        </span>
                      </div>

                      {/* Name + category */}
                      <div>
                        <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{p.name}</h3>
                        <p className="text-xs font-medium text-primary/70 uppercase tracking-wider">{p.category}</p>
                      </div>

                      {/* Blurb */}
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{p.blurb}</p>

                      {/* Visit link */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
                        Visit {p.name}
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </a>
                );
              })}

              {/* "Become a partner" CTA card */}
              <Link
                href="/partner-with-us"
                className="group flex flex-col rounded-3xl border border-dashed border-border hover:border-primary/40 bg-transparent hover:bg-card/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex flex-col flex-1 p-7 items-center justify-center gap-4 text-center min-h-[200px]">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/50 flex items-center justify-center transition-colors">
                    <span className="text-muted-foreground group-hover:text-primary text-xl transition-colors">+</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Partner with us</p>
                    <p className="text-xs text-muted-foreground">Join the brands backing P³</p>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <a href="/" className="pc-logo pc-on-light" aria-label="P Cubed home">
            <span className="pc-mark" aria-hidden="true">P<sup>3</sup></span>
          </a>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/#events" className="hover:text-foreground transition-colors">Events</a>
            <Link href="/partners" className="hover:text-foreground transition-colors">Partners</Link>
            <Link href="/partner-with-us" className="hover:text-foreground transition-colors">Partner with us</Link>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
          <p className="text-xs opacity-50">&copy; {new Date().getFullYear()} People, Padel, Places</p>
        </div>
      </footer>
    </div>
  );
}
