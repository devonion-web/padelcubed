import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { RegistrationForm } from "@/components/RegistrationForm";
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
} from "lucide-react";

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
    linkedin: "",
    bio: "Growth strategist by day, relentless competitor on court. Rash helps fast-scaling companies find their edge, and brings the same energy to every rally.",
  },
  {
    name: "Jahangez Chaudhery",
    initials: "JC",
    role: "Executive Underwriter, Apollo 1971",
    photo: "founders/jahangez.jpg",
    linkedin: "",
    bio: "A specialty insurance mind with a serious appetite for a game. Jahangez underwrites risk at Lloyd's — then happily takes plenty of it at the net.",
  },
  {
    name: "James Pickles",
    initials: "JP",
    role: "Performance & Wellbeing Consultant, byrne·dean",
    photo: "founders/james.jpg",
    linkedin: "",
    bio: "Award-winning performance coach, speaker, dad of two and unashamed padel enthusiast. James keeps high-performing teams — and this community — healthy, happy and firing.",
  },
  {
    name: "Christian Roelofs",
    initials: "CR",
    role: "CEO, Finativ",
    photo: "founders/christian.jpg",
    linkedin: "",
    bio: "Finance specialist with a builder's instinct. Christian advises on corporate finance, transformation and ESG — and reckons a good doubles partnership tells you everything about someone.",
  },
  {
    name: "Lee Edge",
    initials: "LE",
    role: "Principal, GRC Edge",
    photo: "founders/lee.jpg",
    linkedin: "",
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
              src={`/${founder.photo}`}
              alt={founder.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
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
  const scrollToForm = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="font-sans font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full" />
            The Padel Exchange
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={scrollToHow} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </button>
            <a href="#who" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Who it's for
            </a>
            <a href="#founders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              The Founders
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <Button onClick={scrollToForm} className="rounded-full px-6 text-sm font-semibold">
            Apply
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[100dvh] flex items-center pt-20">
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-8 pt-12 md:pt-24 pb-20">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                  Join 120+ founders already on the list
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground leading-[1.05] mb-6">
                  Trade ideas, energy <br className="hidden md:block" />
                  <span className="text-muted-foreground">and the occasional smash.</span>
                </h1>
                <p className="text-lg md:text-xl text-primary font-semibold max-w-2xl mb-4 leading-relaxed">
                  Social padel events where you play with everyone — trade ideas, energy and the occasional smash.
                </p>
                <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mb-10 leading-relaxed">
                  A founders' padel community. Because the best networking doesn't happen at a networking event.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button size="lg" onClick={scrollToForm} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto group">
                    Register your interest
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={scrollToHow} className="rounded-full px-8 h-14 text-base font-semibold w-full sm:w-auto bg-transparent border-muted-foreground/30 hover:bg-white/5">
                    How it works
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
            <div className="h-12 w-[1px] bg-gradient-to-b from-muted-foreground/50 to-transparent" />
          </motion.div>
        </section>

        {/* Ethos Section — "What it is" */}
        <section className="py-24 md:py-32 border-t border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <FadeIn>
                <p className="text-3xl md:text-5xl font-medium tracking-tight leading-tight text-foreground">
                  The Padel Exchange runs curated social padel events for founders and senior professionals. Using rotating formats like the Americano, you play with and against everyone in the room over 1.5–3 hours — so a single evening turns into a dozen real connections.
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
        <section className="py-24 md:py-32 bg-card/30 border-y border-border/50">
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
        <section className="py-24 md:py-32 relative overflow-hidden border-t border-border/50">
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
                  Premium court time at the best venues in London can cost £60–£100 an hour. Add a quality experience on top — an MC, a format, a leaderboard, drinks — and you're looking at serious money. The Padel Exchange changes that through sponsor backing. You get access to the best facilities at a fraction of the real cost, and sponsors get access to a room full of exactly the right people.
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
                    title: "Sponsor-backed pricing",
                    desc: "Sponsors cover the cost gap. You pay for a produced social event — not court hire at rack rate. Great padel, fair price, no compromise on quality."
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
        <section className="py-24 md:py-32 relative overflow-hidden">
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
                  title: "The Exchange",
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
        <section id="how-it-works" className="py-24 md:py-32 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16">How it works</h2>
            </FadeIn>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Register your interest", desc: "Fill out the short form below — takes 30 seconds." },
                { step: "02", title: "We match you", desc: "We match you to events that fit your level and interests." },
                { step: "03", title: "Reserve your spot", desc: "A small upfront payment secures your place — you're booking a produced event, not a court." },
                { step: "04", title: "Turn up & connect", desc: "Play with everyone, trade ideas, leave with new connections." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1} className="relative">
                  {i < 3 && <div className="hidden md:block absolute top-8 left-16 right-0 h-[1px] bg-border" />}
                  <div className="relative z-10 flex flex-col items-start">
                    <div className="text-5xl font-bold text-muted/50 mb-6 font-mono">{item.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who" className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Who is this for?</h2>
                <p className="text-xl md:text-2xl font-medium leading-relaxed opacity-90">
                  Founders, operators, and senior leaders who want to expand their network outside their immediate industry bubble — while breaking a sweat. Starting in London and growing across the UK, The Padel Exchange is open to anyone who values real connection over forced small talk.
                </p>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Founders Section */}
        <section id="founders" className="py-24 md:py-32 bg-card/30 border-y border-border/50">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="mb-16 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">The founders</h2>
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
                <Button size="lg" onClick={() => document.getElementById("register")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full px-8 h-14 text-base font-semibold group">
                  Register your interest
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Form Section */}
        <section id="register" className="py-24 md:py-32 relative">
          <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto">
              <FadeIn>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Register your interest</h2>
                  <p className="text-lg text-muted-foreground">
                    Join the list. We'll match you to events that fit your level and interests — starting in London, more UK cities soon.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <RegistrationForm />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 md:py-32 border-t border-border/50 bg-card/20">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-primary rounded-full" />
                The Padel Exchange
              </div>
              <p className="text-muted-foreground text-sm">Trade ideas, energy and the occasional smash.</p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm font-medium">
              <a href="#founders" className="text-muted-foreground hover:text-foreground transition-colors">The Founders</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Email us</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} The Padel Exchange. All rights reserved.</p>
            <p className="text-xs opacity-50">Starting in London · Growing across the UK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
