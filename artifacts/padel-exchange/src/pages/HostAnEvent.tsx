import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, Rocket, Mic2,
  CheckCircle2, Calendar, Phone, Mail,
  Star, Zap, Heart,
} from "lucide-react";

function FadeIn({
  children, delay = 0, className = "",
}: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const formats = [
  {
    id: "team-day",
    icon: Users,
    title: "Team Day",
    description:
      "Bond your team off-site, away from screens. Americano format means everyone plays with everyone — competitive, sociable, and genuinely fun regardless of level.",
    colour: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    id: "client",
    icon: Briefcase,
    title: "Client Entertainment",
    description:
      "A padel event beats a box at a stadium because it's participatory. Clients play, laugh, and compete — and they remember you for it.",
    colour: "from-primary/15 via-primary/8 to-transparent",
  },
  {
    id: "launch",
    icon: Rocket,
    title: "Product Launch / Activation",
    description:
      "A live leaderboard, branded courts and kit, a captive senior audience — an activation format that actually gets talked about.",
    colour: "from-primary/10 via-primary/5 to-transparent",
  },
  {
    id: "conference",
    icon: Mic2,
    title: "Conference Social",
    description:
      "The after-session event people actually want to attend. We run the whole thing so you focus on your conference.",
    colour: "from-primary/20 via-primary/10 to-transparent",
  },
];

const included = [
  "Format design (Americano or custom)",
  "Live scoring & leaderboard screen",
  "Hosted MC for the day",
  "Court booking & logistics",
  "Post-event photos package",
  "P³ trophy & podium moment",
];

const upsells = [
  "Custom branded shirts for all players",
  "Professional photography & video reel",
  "Catering & bar package",
  "Custom court branding & signage",
  "Prize package (kit, vouchers, experiences)",
  "An 'Exchange' speaker slot (10 min)",
];

const trustPoints = [
  {
    icon: Star,
    title: "A proven format",
    body: "Americano padel is the most social format in the sport — everyone plays with everyone, regardless of level. We've run it with founders, GRC teams and finance execs. It works every time.",
  },
  {
    icon: Zap,
    title: "A fully produced experience",
    body: "We handle every detail: venue, logistics, scoring, MC, kit and photos. You arrive, you take the credit. No half-done corporate sports day.",
  },
  {
    icon: Heart,
    title: "A warm way to build relationships",
    body: "Padel is inherently social. No pitch, no slides — just genuine competition and conversation. The relationships that come out of a P³ event stick.",
  },
];

const budgetOptions = [
  "Under £2,000",
  "£2,000 – £5,000",
  "£5,000 – £10,000",
  "£10,000+",
  "Not sure yet",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HostAnEvent() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    company: "",
    contactName: "",
    workEmail: "",
    phone: "",
    eventType: "",
    headcount: "",
    timeframe: "",
    budgetRange: "",
    message: "",
    gdpr: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  function field(key: keyof typeof form) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gdpr) return;
    setLoading(true);

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/corporate-enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          contactName: form.contactName,
          workEmail: form.workEmail,
          phone: form.phone || undefined,
          eventType: form.eventType,
          headcount: form.headcount ? Number(form.headcount) : undefined,
          timeframe: form.timeframe || undefined,
          budgetRange: form.budgetRange || undefined,
          message: form.message || undefined,
          gdprConsent: form.gdpr,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Submission failed");
      }

      setSubmitted(true);
      toast({ title: "Enquiry received", description: "We'll be in touch within one working day." });
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please email info@padelcubed.co.uk directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all";
  const labelCls = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <a href="/" className="pc-logo" aria-label="P Cubed — People, Padel, Places">
            <span className="pc-mark" aria-hidden="true">P<sup>3</sup></span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="/#events" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Events</a>
            <Link href="/partners" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Partners</Link>
            <a href="/#ambassadors" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Ambassadors</a>
            <Link href="/host-an-event" className="text-sm font-medium text-foreground transition-colors">Host an event</Link>
          </nav>
          <Button onClick={scrollToForm} className="rounded-full px-6 text-sm font-semibold">
            Get in touch
          </Button>
        </div>
      </header>

      <main className="pt-28">

        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/6 rounded-full blur-[180px] translate-x-1/2 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[140px] -translate-x-1/3 translate-y-1/2 pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-4xl">
            <FadeIn>
              <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold tracking-widest uppercase bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
                Corporate &amp; private events
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
                Host a P³ event
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
                We produce the padel event — you take the credit. Team days, client entertainment, launches and offsites.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={scrollToForm} size="lg" className="rounded-full px-8 text-base font-semibold">
                  Enquire now →
                </Button>
                <a
                  href="https://cal.com/pcubed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-8 rounded-full border border-border text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-card transition-all"
                >
                  <Calendar className="h-4 w-4 text-primary" />
                  Book a 15-min call
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── 2. What it is ───────────────────────────────────────────────── */}
        <section className="py-14 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <FadeIn>
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-4">What it is</span>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                P³ designs and runs your entire event from start to finish. We handle the format — Americano and bespoke variations — a hosted MC to keep energy high, live scoring and a leaderboard everyone watches, branding throughout, kit, drinks and a photos package you can actually use. You show up and take the credit. We take care of everything else.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ── 3. Formats ──────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn className="mb-12">
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-3">Event formats</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built for every occasion</h2>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {formats.map((fmt, i) => {
                const Icon = fmt.icon;
                return (
                  <FadeIn key={fmt.id} delay={i * 0.08}>
                    <div className={`flex flex-col h-full rounded-3xl border border-border bg-gradient-to-br ${fmt.colour} bg-card/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                      <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                      <div className="flex flex-col flex-1 p-7 gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground leading-tight">{fmt.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{fmt.description}</p>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. What's included + upsells ────────────────────────────────── */}
        <section className="py-16 md:py-24 border-t border-border/40 bg-card/20">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn className="mb-12">
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-3">Every event</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What's included</h2>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-10">
              <FadeIn>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Standard package
                </h3>
                <ul className="space-y-3">
                  {included.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" /> Optional upgrades
                </h3>
                <ul className="space-y-3">
                  {upsells.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── 5. Why P³ ───────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn className="mb-12">
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-3">Why P³</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why companies choose us</h2>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-6">
              {trustPoints.map((tp, i) => {
                const Icon = tp.icon;
                return (
                  <FadeIn key={tp.title} delay={i * 0.1}>
                    <div className="rounded-3xl border border-border bg-card/40 p-8 h-full hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                      <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-5">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">{tp.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tp.body}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 6. Enquiry form ─────────────────────────────────────────────── */}
        <section ref={formRef} className="py-16 md:py-24 border-t border-border/40 bg-card/20">
          <div className="container mx-auto px-4 md:px-8 max-w-2xl">
            <FadeIn className="mb-10">
              <span className="text-primary text-xs font-semibold tracking-widest uppercase block mb-3">Get in touch</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Enquire about your event</h2>
              <p className="text-muted-foreground">No commitment. We'll scope the event and come back within one working day.</p>
            </FadeIn>

            {/* Call CTA */}
            <FadeIn delay={0.05} className="mb-8">
              <a
                href="https://cal.com/pcubed"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 p-5 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Prefer to talk? Book a 15-min call →
                  </p>
                  <p className="text-xs text-muted-foreground">Pick a slot that works for you — no waiting on email.</p>
                </div>
              </a>
            </FadeIn>

            {submitted ? (
              <FadeIn>
                <div className="rounded-3xl border border-primary/30 bg-primary/5 p-10 text-center">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-3">Thanks — we'll be in touch</h3>
                  <p className="text-muted-foreground">
                    We'll be in touch within one working day to scope your event. If you'd rather talk now,{" "}
                    <a href="https://cal.com/pcubed" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                      book a call here
                    </a>.
                  </p>
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.1}>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Company + Contact name */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="hae-company" className={labelCls}>Company <span className="text-primary">*</span></label>
                      <input id="hae-company" type="text" required placeholder="Acme Ltd" className={inputCls} {...field("company")} />
                    </div>
                    <div>
                      <label htmlFor="hae-name" className={labelCls}>Contact name <span className="text-primary">*</span></label>
                      <input id="hae-name" type="text" required placeholder="Jane Smith" className={inputCls} {...field("contactName")} />
                    </div>
                  </div>

                  {/* Work email + Phone */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="hae-email" className={labelCls}>Work email <span className="text-primary">*</span></label>
                      <input id="hae-email" type="email" required placeholder="jane@acme.com" className={inputCls} {...field("workEmail")} />
                    </div>
                    <div>
                      <label htmlFor="hae-phone" className={labelCls}>Phone <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                      <input id="hae-phone" type="tel" placeholder="+44 7700 900000" className={inputCls} {...field("phone")} />
                    </div>
                  </div>

                  {/* Event type */}
                  <div>
                    <label htmlFor="hae-type" className={labelCls}>Event type <span className="text-primary">*</span></label>
                    <select id="hae-type" required className={inputCls} {...field("eventType")}>
                      <option value="">Select an event type…</option>
                      <option>Team day</option>
                      <option>Client entertainment</option>
                      <option>Product launch / Activation</option>
                      <option>Conference social</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* Headcount + Timeframe */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="hae-headcount" className={labelCls}>Approx. headcount <span className="text-primary">*</span></label>
                      <input id="hae-headcount" type="number" min="4" required placeholder="e.g. 20" className={inputCls} {...field("headcount")} />
                    </div>
                    <div>
                      <label htmlFor="hae-timeframe" className={labelCls}>Preferred date or timeframe <span className="text-primary">*</span></label>
                      <input id="hae-timeframe" type="text" required placeholder="e.g. September 2026" className={inputCls} {...field("timeframe")} />
                    </div>
                  </div>

                  {/* Budget range */}
                  <div>
                    <label htmlFor="hae-budget" className={labelCls}>Budget range <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                    <select id="hae-budget" className={inputCls} {...field("budgetRange")}>
                      <option value="">Prefer not to say</option>
                      {budgetOptions.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="hae-message" className={labelCls}>Anything else we should know? <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                    <textarea
                      id="hae-message"
                      rows={4}
                      placeholder="Tell us about the occasion, any specific requirements, or questions you have…"
                      className={`${inputCls} resize-none`}
                      {...field("message")}
                    />
                  </div>

                  {/* GDPR */}
                  <div className="flex items-start gap-3 pt-1">
                    <input
                      id="hae-gdpr"
                      type="checkbox"
                      required
                      checked={form.gdpr}
                      onChange={(e) => setForm((f) => ({ ...f, gdpr: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-border text-primary accent-primary flex-shrink-0 cursor-pointer"
                    />
                    <label htmlFor="hae-gdpr" className="text-sm text-muted-foreground cursor-pointer">
                      I agree to be contacted about my event enquiry.{" "}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  {/* Submit */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={loading || !form.gdpr}
                      className="rounded-full px-8 text-sm font-semibold flex-1 sm:flex-none"
                    >
                      {loading ? "Sending…" : "Send enquiry"}
                    </Button>
                    <a
                      href="https://cal.com/pcubed"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full border border-border text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-card transition-all"
                    >
                      <Mail className="h-4 w-4 text-primary" />
                      Book a call instead
                    </a>
                  </div>
                </form>
              </FadeIn>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <a href="/" className="pc-logo pc-on-light mb-2 inline-flex" aria-label="P Cubed — People, Padel, Places">
                <span className="pc-mark" aria-hidden="true">P<sup>3</sup></span>
                <span className="pc-word" aria-hidden="true">
                  <span className="pc-line"><b>P</b>eople<i>.</i></span>
                  <span className="pc-line"><b>P</b>adel<i>.</i></span>
                  <span className="pc-line"><b>P</b>laces<i>.</i></span>
                </span>
              </a>
              <p className="text-muted-foreground text-sm">The best padel, best people, best places.</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm font-medium">
              <a href="/#events" className="text-muted-foreground hover:text-foreground transition-colors">Events</a>
              <a href="/#ambassadors" className="text-muted-foreground hover:text-foreground transition-colors">Ambassadors</a>
              <Link href="/partners" className="text-muted-foreground hover:text-foreground transition-colors">Partners</Link>
              <Link href="/partner-with-us" className="text-muted-foreground hover:text-foreground transition-colors">Partner with us</Link>
              <Link href="/host-an-event" className="text-muted-foreground hover:text-foreground transition-colors">Host an event</Link>
              <a href="mailto:info@padelcubed.co.uk" className="text-muted-foreground hover:text-foreground transition-colors">Email us</a>
              <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; {new Date().getFullYear()} People, Padel, Places. All rights reserved.</p>
            <p className="text-xs opacity-50">Starting in London · Growing across the UK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
