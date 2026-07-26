import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { IntentModal } from "@/components/IntentModal";
import { BookingModal } from "@/components/BookingModal";
import { PartnersSection, VenuesSection } from "@/components/PartnersVenues";
import { AdSlot } from "@/components/AdSlot";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import {
  CheckCircle2,
  Users,
  MessageSquare,
  Calendar,
  Shield,
  Zap,
  ChevronRight,
  Building2,
  BadgePercent,
  Trophy,
  Linkedin,
  MapPin,
  Clock,
  Ticket,
} from "lucide-react";

// ─── Event type ───────────────────────────────────────────────────────────────
interface ApiEvent {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format: string;
  sponsor: string | null;
  price: string;
  pricePence?: number;
  status: string;
  description: string | null;
  maxSpots: number | null;
  eventDate: string | null;
  published: boolean;
  attendeeCount?: number;
}

// ─── Founders data ────────────────────────────────────────────────────────────
// To add or remove founders, edit this array only. Each entry maps to one card.
// Bio guidance — three short threads in the brand voice (confident, warm, British English):
//   1. Work   — who they are / what they do (one line).
//   2. Padel  — their passion for the game.
//   3. Connection — what they value about meeting people.
// Add real headshots by dropping a file into artifacts/padel-exchange/public/founders/
// (e.g. dev.jpg) and setting photo: "founders/dev.jpg". Leave photo: "" to show initials.
const founders = [
  {
    name: "Dev O'Nion",
    initials: "DO",
    role: "Director, Risk Rising",
    photo: "founders/dev.jpg",
    linkedin: "https://www.linkedin.com/in/devairr",
    bio: "The spark behind the Exchange. Dev builds technology that moves GRC forward — and started this community because the best introductions happen mid-rally, not across a boardroom.",
  },
  {
    name: "Rash Phullar",
    initials: "RP",
    role: "Chief Strategic Growth Officer, Corlytics",
    photo: "founders/rash.jpg",
    linkedin: "https://www.linkedin.com/in/rash-phullar-12628847/",
    bio: "Growth strategist by day, relentless competitor on court. Rash helps fast-scaling companies find their edge, and brings the same energy to every rally.",
  },
  {
    name: "Jahangez Chaudhery",
    initials: "JC",
    role: "Executive Underwriter, Apollo 1971",
    photo: "founders/jahangez.jpg",
    linkedin: "https://www.linkedin.com/in/jahangez-chaudhery-7793312a/",
    bio: "A specialty insurance mind with a serious appetite for a game. Jahangez underwrites risk at Lloyd's — then happily takes plenty of it at the net.",
  },
  {
    name: "James Pickles",
    initials: "JP",
    role: "Performance & Wellbeing Consultant, byrne·dean",
    photo: "founders/james.jpg",
    linkedin: "https://www.linkedin.com/in/jamespicklescoaching/",
    bio: "Award-winning performance coach, speaker, dad of two and unashamed padel enthusiast. James keeps high-performing teams — and this community — healthy, happy and firing.",
  },
  {
    name: "Christian Roelofs",
    initials: "CR",
    role: "CEO, Finativ",
    photo: "founders/christian.jpg",
    linkedin: "https://www.linkedin.com/in/christianroelofs/",
    bio: "Finance specialist with a builder's instinct. Christian advises on corporate finance, transformation and ESG — and reckons a good doubles partnership tells you everything about someone.",
  },
  {
    name: "Lee Edge",
    initials: "LE",
    role: "Principal, GRC Edge",
    photo: "founders/lee.jpg",
    linkedin: "https://www.linkedin.com/in/lee-edge/",
    bio: "GRC, cyber and AI governance are Lee's world — helping organisations navigate complexity without losing their nerve. On court, he brings the same calm under pressure.",
  },
];

function FounderCard({ founder }: { founder: typeof founders[number] }) {
  const [imgError, setImgError] = useState(false);
  const showInitials = !founder.photo || imgError;

  return (
    <div className="group relative flex flex-col items-center text-center p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
      {/* LinkedIn badge — top-right corner */}
      {founder.linkedin && (
        <a
          href={founder.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${founder.name} on LinkedIn`}
          className="absolute top-5 right-5 text-muted-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded transition-colors"
        >
          <Linkedin className="h-4 w-4" />
        </a>
      )}

      {/* Photo / initials avatar */}
      <div className="mb-6 relative">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300">
          {showInitials ? (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-2xl tracking-tight select-none">
                {founder.initials}
              </span>
            </div>
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}${founder.photo}`}
              alt={founder.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover grayscale"
            />
          )}
        </div>
      </div>

      {/* Name & role */}
      <h3 className="text-lg font-bold text-foreground mb-1 leading-tight">{founder.name}</h3>
      <p className="text-xs font-medium text-primary/80 mb-4 leading-snug max-w-[200px]">{founder.role}</p>

      {/* Bio */}
      <p className="text-sm text-muted-foreground leading-relaxed">{founder.bio}</p>
    </div>
  );
}

import heroImage from "@/assets/hero-court.jpg";

// AI-generated padel action photos (in /public/padel/)
const padelPhotos = [
  { src: import.meta.env.BASE_URL + "padel/social-game.jpg",      alt: "Professionals playing padel doubles" },
  { src: import.meta.env.BASE_URL + "padel/action-smash.jpg",     alt: "Padel player making a smash" },
  { src: import.meta.env.BASE_URL + "padel/celebrate.jpg",        alt: "Players celebrating at the net" },
  { src: import.meta.env.BASE_URL + "padel/aerial-court.jpg",     alt: "Aerial view of padel court" },
  { src: import.meta.env.BASE_URL + "padel/post-match-social.jpg",alt: "Post-match social and networking" },
  { src: import.meta.env.BASE_URL + "padel/racket-ball.jpg",      alt: "Padel racket and ball close-up" },
  { src: import.meta.env.BASE_URL + "padel/hero-video-poster.jpg",alt: "Padel doubles match in progress" },
];

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen]   = useState(false);
  const [liPrefill, setLiPrefill]   = useState<{ name: string; email: string; linkedinVerified: boolean } | null>(null);
  const [bookingEvent, setBookingEvent] = useState<ApiEvent | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const openModal = () => setModalOpen(true);

  // Detect ?booking=success return from Stripe, or ?li_ok=1 return from LinkedIn OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Capture UTM params into sessionStorage for attribution (read by JoinForm at submit)
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const utms: Record<string, string> = {};
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) utms[key.replace("_", "")] = val; // e.g. utmSource, utmMedium
    }
    // Map to camelCase keys expected by the API
    const utmMap: Record<string, string> = {
      utm_source: "utmSource", utm_medium: "utmMedium",
      utm_campaign: "utmCampaign", utm_content: "utmContent", utm_term: "utmTerm",
    };
    const utmPayload: Record<string, string> = {};
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) utmPayload[utmMap[key]] = val;
    }
    if (Object.keys(utmPayload).length > 0) {
      try { sessionStorage.setItem("p3_utms", JSON.stringify(utmPayload)); } catch { /**/ }
    }

    if (params.get("booking") === "success") {
      setBookingSuccess(true);
      window.history.replaceState({}, "", window.location.pathname + "#events");
      return;
    }

    if (params.get("li_ok") === "1") {
      setLiPrefill({
        name:             params.get("li_name")  ?? "",
        email:            params.get("li_email") ?? "",
        linkedinVerified: true,
      });
      setModalOpen(true);
      // Remove params from URL without reload
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (params.get("li_err")) {
      // LinkedIn returned an error — silently let the user try again manually
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ─── Events from API — hidden until launch; re-enable when events go live ──
  // const { data: events = [] } = useQuery<ApiEvent[]>({
  //   queryKey: ["/api/events"],
  //   queryFn: () => fetch("/api/events").then((r) => r.json()),
  //   staleTime: 60_000,
  // });

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <a href="/" className="pc-logo" aria-label="P Cubed — People, Padel, Places">
            <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" aria-hidden="true" className="pc-mark-img" width="46" height="46" />
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {/* Shop nav link — hidden until launch:
            <Link href="/shop" className="...">Shop</Link>
            */}
            <a href="#launch" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Launch Event
            </a>
            <Link href="/host-an-event" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Host an event
            </Link>
          </nav>
          <Button onClick={openModal} className="rounded-full px-6 text-sm font-semibold">
            Apply
          </Button>
        </div>
      </header>

      <main>
        {/* Partners — sits directly under the nav */}
        <PartnersSection />

        {/* Hero Section */}
        <section className="relative flex items-start pt-20">
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Ken Burns animated hero image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45"
              style={{
                backgroundImage: `url(${import.meta.env.BASE_URL}padel/hero-video-poster.jpg)`,
                animation: "kenBurns 24s ease-in-out infinite alternate",
                willChange: "transform",
              }}
            />
            {/* Fallback in case generated image hasn't loaded yet */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-background/10 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-8 pt-1 md:pt-2 pb-12">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="flex justify-center mb-8">
                  <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                    Join 120+ professionals already on the list
                  </div>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground leading-[1.05] mb-4">
                  People,{" "}
                  <span className="text-muted-foreground">Padel,{" "}</span>
                  <span className="text-primary/80">Places.</span>
                </h1>
                <p className="text-xl md:text-2xl text-foreground/70 font-medium max-w-2xl mb-10 leading-relaxed">
                  Curated padel events for senior professionals and founders — premium venues, top-level play, real connections.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button size="lg" onClick={openModal} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto group">
                    Register your interest
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={scrollToHow} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto bg-transparent border-muted-foreground/30 hover:bg-white/5">
                    How it works
                  </Button>
                </div>
                <p className="text-sm text-foreground/50 mt-3 text-center">Get in touch — no commitment required.</p>
              </motion.div>
            </div>
          </div>

        </section>

        {/* Venues — directly below hero */}
        <VenuesSection />

        {/* ── Launch Event Teaser ──────────────────────────────────────────────── */}
        <section className="border-t border-border/40 py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="flex items-center gap-3 mb-8">
                <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary uppercase tracking-widest">Coming October 2025</span>
              </div>

              <div className="relative rounded-3xl overflow-hidden min-h-[340px] md:min-h-[420px] flex flex-col justify-end">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${import.meta.env.BASE_URL}padel/social-game.jpg)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/45 to-black/10" />

                <div className="relative z-10 p-7 md:p-10 flex flex-col gap-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20 self-start">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Launch Event — registrations opening soon
                  </span>

                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    P³ London Launch
                  </h2>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary/80" />
                      October 2025 · Date TBC
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary/80" />
                      London · Venue TBC
                    </span>
                  </div>

                  <div className="pt-5 border-t border-white/20 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-white/60 max-w-md">
                      Our first event — curated play, real connections, a premium London venue. Register now to be first in line when spots open.
                    </p>
                    <button
                      type="button"
                      onClick={openModal}
                      className="flex-shrink-0 text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-primary/30"
                    >
                      Register interest →
                    </button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Photo Strip — infinite auto-scrolling marquee */}
        <div className="overflow-hidden border-y border-border/40 bg-background py-0 select-none" aria-hidden="true">
          <div
            className="flex gap-3 w-max"
            style={{ animation: "marquee 40s linear infinite" }}
          >
            {/* Duplicate for seamless loop */}
            {[...padelPhotos, ...padelPhotos].map((photo, i) => (
              <div
                key={i}
                className="flex-shrink-0 h-52 w-80 rounded-xl overflow-hidden relative"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="h-full w-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Ethos Section — "What it is" */}
        <section className="py-12 md:py-16 border-t border-border/50 relative overflow-hidden">
          {/* Subtle aerial court image background */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.06]"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}padel/aerial-court.jpg)` }}
          />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <FadeIn>
                <p className="text-3xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
                  People, Padel, Places runs curated social padel events for founders and senior professionals. Using rotating formats like the Americano, you play with and against everyone in the room over 1.5–3 hours — so a single evening turns into a dozen real connections.
                </p>
                <p className="mt-8 text-xl md:text-2xl text-muted-foreground leading-relaxed">
                  It's an exchange: of ideas, perspectives, introductions, energy and a good game. All levels welcome — starting in London and growing across the UK.
                </p>
                <div className="mt-12 h-1 w-24 bg-primary mx-auto rounded-full" />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="py-12 md:py-16 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Why join</h2>
                <p className="text-lg text-muted-foreground max-w-2xl">Produced social events designed to make real connections — not another awkward room with name badges and canapés.</p>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: Users,
                  title: "Play with everyone",
                  desc: "Americano-style rotation means new partners every round. Arrive solo, leave having met the room."
                },
                {
                  icon: Calendar,
                  title: "Produced events, not court hire",
                  desc: "Hosted by an MC, 1.5–3 hours, format, leaderboard and drinks. You're booking an experience, not a court."
                },
                {
                  icon: MessageSquare,
                  title: "Exchange, don't pitch",
                  desc: "A built-in moment to trade ideas, views and introductions — no slide decks required."
                },
                {
                  icon: CheckCircle2,
                  title: "All levels welcome",
                  desc: "Never played? Neither had half the room. Kit provided. We make sure everyone gets a fair, enjoyable game."
                },
                {
                  icon: Shield,
                  title: "Curated & subsidised",
                  desc: "Padel is an expensive sport. Sponsor backing means you access top-tier venues at a fraction of the walk-in rate — you pay for a produced event, not court hire."
                },
                {
                  icon: Zap,
                  title: "Fitness + connection",
                  desc: "Get off the desk and meet great people in one evening. Building a company is sedentary enough."
                }
              ].map((card, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="group h-full p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                      <card.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">{card.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Access Section */}
        <section className="py-12 md:py-16 relative overflow-hidden border-t border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-5xl mx-auto">
              <FadeIn>
                <div className="mb-4">
                  <span className="text-primary text-sm font-semibold tracking-widest uppercase">Why this matters</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 max-w-3xl">
                  Padel is one of the UK's fastest-growing sports. It's also one of the most expensive.
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed mb-16">
                  Premium court time at the best venues in London can cost £60–£100 an hour. Add a quality experience on top — an MC, a format, a leaderboard, drinks — and you're looking at serious money. People, Padel, Places changes that through sponsor backing. You get access to the best facilities at a fraction of the real cost, and sponsors get access to a room full of exactly the right people.
                </p>
              </FadeIn>

              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    icon: Building2,
                    title: "The best venues",
                    desc: "We work with the top padel clubs in the UK — the courts you've heard of but wouldn't normally book solo. Starting in London, expanding nationally."
                  },
                  {
                    icon: BadgePercent,
                    title: "More than a game.",
                    desc: "One ticket, the whole night — hosted play, a live leaderboard, prizes and drinks. Our partners help us put it on, so it stays a proper experience and keeps everyone on court."
                  },
                  {
                    icon: Trophy,
                    title: "A real experience",
                    desc: "Not a shared booking with strangers. A produced evening: MC, Americano format, live leaderboard, prizes and drinks — at a venue worth going to."
                  }
                ].map((card, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="group p-8 rounded-3xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300">
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                        <card.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-foreground">{card.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What Happens at an Event */}
        <section className="py-12 md:py-16 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <FadeIn>
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">What happens at an event</h2>
                <p className="text-lg text-muted-foreground max-w-2xl">From arrival to the final drink — here's how a typical evening runs.</p>
              </div>
            </FadeIn>

            <div className="max-w-3xl">
              {[
                {
                  num: "1",
                  title: "Welcome",
                  desc: "Arrival, name badges (name + company), and a quick intro from your host. No awkward standing around."
                },
                {
                  num: "2",
                  title: "Warm-up",
                  desc: "A few minutes to find your feet — all levels, no judgement. We ease everyone in together."
                },
                {
                  num: "3",
                  title: "The Americano",
                  desc: "Rotating rounds — you partner and play against different people each time. Points build to a live leaderboard on the night."
                },
                {
                  num: "4",
                  title: "People, Padel, Places",
                  desc: "A short moment for ideas and introductions. At some events, a guest insight from someone in the room."
                },
                {
                  num: "5",
                  title: "Drinks & prizes",
                  desc: "Leaderboard, a winner, a photo, and time to connect properly. The game did the introductions — now just enjoy the conversation."
                }
              ].map((step, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="flex gap-6 md:gap-8 pb-10 last:pb-0 relative">
                    {/* Vertical line connector */}
                    {i < 4 && (
                      <div className="absolute left-[22px] top-12 bottom-0 w-[2px] bg-border" />
                    )}
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm z-10">
                      {step.num}
                    </div>
                    <div className="pt-2 pb-2">
                      <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.5}>
              <p className="mt-12 text-muted-foreground text-base italic max-w-xl border-l-2 border-primary/40 pl-4">
                Events run 1.5 to 3 hours. Come on your own or bring a colleague — the format does the introductions for you.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-12 md:py-16 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16">How it works</h2>
            </FadeIn>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Get in touch", desc: "Drop us a message — we'll come back to you quickly." },
                { step: "02", title: "We match you", desc: "We match you to events that fit your level and interests." },
                { step: "03", title: "Reserve your spot", desc: "A small upfront payment secures your place — you're booking a produced event, not a court." },
                { step: "04", title: "Turn up & connect", desc: "Play with everyone, trade ideas, leave with new connections." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1} className="relative">
                  {i < 3 && <div className="hidden md:block absolute top-8 left-16 right-0 h-[1px] bg-border" />}
                  <div className="relative z-10 flex flex-col items-start">
                    <div className="text-5xl font-bold text-primary mb-6 font-mono">{item.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who" className="py-12 md:py-16 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Who is this for?</h2>
                <p className="text-xl md:text-2xl font-medium leading-relaxed opacity-90">
                  Founders, operators, and senior leaders who want to expand their network outside their immediate industry bubble — while breaking a sweat. Starting in London and growing across the UK, People, Padel, Places is open to anyone who values real connection over forced small talk.
                </p>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── Launch Event Section ─────────────────────────────────────────────── */}
        <section id="launch" className="py-12 md:py-20 border-t border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[140px] translate-x-1/3 -translate-y-1/4 pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-semibold text-primary tracking-wide">Launch Event · October 2025</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  P³ London Launch
                </h2>

                <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
                  Our first event is coming this October — a premium London venue, curated play, a live leaderboard, and an evening built for real connections. Date and venue to be announced.
                </p>

                <p className="text-sm text-muted-foreground mb-10">
                  Register your interest now. You'll be first to know when spots open.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    onClick={openModal}
                    size="lg"
                    className="rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/20 w-full sm:w-auto"
                  >
                    Register interest
                  </Button>
                  <a
                    href="mailto:info@padelcubed.co.uk"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Questions? Email us →
                  </a>
                </div>

                <div className="mt-16 pt-10 border-t border-border/50 grid grid-cols-3 gap-6 text-center">
                  {[
                    { label: "Format", value: "Americano" },
                    { label: "Location", value: "London" },
                    { label: "Date", value: "October 2025" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-lg font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Founders Section */}
        <section id="ambassadors" className="py-12 md:py-16 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="mb-16 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">The ambassadors</h2>
                <p className="text-lg text-muted-foreground">
                  Six people who'd rather make the introduction on court than across a boardroom. This is who you're playing with.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {founders.map((founder, i) => (
                <FadeIn key={founder.name} delay={i * 0.08}>
                  <FounderCard founder={founder} />
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.3}>
              <div className="mt-16 text-center">
                <p className="text-muted-foreground mb-6">Want to be part of it?</p>
                <Button size="lg" onClick={openModal} className="rounded-full px-8 h-14 text-base font-semibold group">
                  Register your interest
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── Corporate / Host an event — secondary CTA ───────────────────── */}
        <section className="py-14 md:py-20 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8 text-center">
            <FadeIn>
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-4">Corporate &amp; private events</span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Bring P³ to your team or clients
              </h2>
              <p className="text-muted-foreground text-base max-w-xl mx-auto mb-8">
                We produce the whole event — format, MC, scoring, kit and photos. You take the credit.
              </p>
              <Link
                href="/host-an-event"
                className="inline-flex items-center gap-2 h-11 px-7 rounded-full border border-border text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-card transition-all"
              >
                Find out more →
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-12 md:py-16 border-t border-border/50 bg-card/20">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <FadeIn>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">Frequently asked questions</h2>
              </FadeIn>

              <FadeIn delay={0.2}>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-0" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Is it just single games of padel?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      No — these are structured social events. Using formats like the Americano you rotate partners and play with everyone, over 1.5–3 hours, hosted by an MC. It's much more than a game of padel.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-solo" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Can I come on my own?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Absolutely — the format is designed for it. You'll be playing with different people all evening, so arriving solo is entirely normal. Most people do.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-1" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Do I need to be good at padel?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Not at all. We have members who play competitively and members who have never stepped on a court. We organise events based on skill level so everyone gets a fair, enjoyable game.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">What is the cost?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Registering your interest is free. You only pay when you reserve a spot at an event. Costs are kept competitive thanks to sponsor support — you're paying for a produced social event, not just court hire.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Where do events take place?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      We use premium padel venues — London first, with more UK cities coming soon. Venue details are provided when you're matched to an event.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">Who exactly is in the community?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Venture-backed founders, agency owners, managing directors, partners, and C-suite executives. We actively balance the community across tech, finance, professional services and creative industries.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5" className="border-border">
                    <AccordionTrigger className="text-lg hover:text-primary transition-colors">How is my data used?</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">
                      Strictly for organising events and community communication. We never sell data to third parties. We hate spam as much as you do.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* home-banner ad slot — only renders when a live advert is scheduled */}
        <div className="container mx-auto px-4 md:px-8 pb-10">
          <AdSlot slot="home-banner" className="max-w-2xl mx-auto" />
        </div>

        {/* Social follow section */}
        <section className="border-t border-border bg-card">
          <div className="container mx-auto px-4 md:px-8 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Stay in the loop</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Event announcements, behind-the-scenes, and community moments — follow us to keep up.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
              <a
                href="https://www.instagram.com/padelcubed"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-4 rounded-2xl border border-border bg-background hover:bg-muted/40 transition-colors px-6 py-5 group"
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Instagram</p>
                  <p className="text-sm text-muted-foreground">@padelcubed</p>
                </div>
                <svg className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
              </a>
              <a
                href="https://www.linkedin.com/company/people-padel-places/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-4 rounded-2xl border border-border bg-background hover:bg-muted/40 transition-colors px-6 py-5 group"
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-[#0A66C2]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">LinkedIn</p>
                  <p className="text-sm text-muted-foreground">People, Padel, Places</p>
                </div>
                <svg className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <a href="/" className="pc-logo pc-on-light mb-2 inline-flex" aria-label="P Cubed — People, Padel, Places">
                <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" aria-hidden="true" className="pc-mark-img" width="46" height="46" />
                <span className="pc-word" aria-hidden="true">
                  <span className="pc-line"><b>P</b>eople<i>.</i></span>
                  <span className="pc-line"><b>P</b>adel<i>.</i></span>
                  <span className="pc-line"><b>P</b>laces<i>.</i></span>
                </span>
              </a>
              <p className="text-muted-foreground text-sm">The best padel, best people, best places.</p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm font-medium">
              <a href="#launch" className="text-muted-foreground hover:text-foreground transition-colors">Launch Event</a>
              <a href="#ambassadors" className="text-muted-foreground hover:text-foreground transition-colors">Ambassadors</a>
              <Link href="/host-an-event" className="text-muted-foreground hover:text-foreground transition-colors">Host an event</Link>
              <a href="mailto:info@padelcubed.co.uk" className="text-muted-foreground hover:text-foreground transition-colors">Email us</a>
              <a href="https://www.instagram.com/padelcubed" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Instagram</a>
              <a href="https://www.linkedin.com/company/people-padel-places/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
              <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} People, Padel, Places. All rights reserved.</p>
            <p className="text-xs opacity-50">Starting in London · Growing across the UK</p>
          </div>
        </div>
      </footer>

      <IntentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setLiPrefill(null); }}
        prefill={liPrefill ?? undefined}
      />

      <BookingModal
        event={bookingEvent}
        onClose={() => setBookingEvent(null)}
      />

      {/* Stripe return success toast */}
      {bookingSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-card border border-primary/30 shadow-xl rounded-2xl px-5 py-3.5 max-w-sm w-full mx-4"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">You're in — see you on court.</p>
            <p className="text-xs text-muted-foreground">Confirmation is on its way to your inbox.</p>
          </div>
          <button
            onClick={() => setBookingSuccess(false)}
            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}
