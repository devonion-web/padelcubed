import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, Globe, Star } from "lucide-react";
import { useSubmitRegistration } from "@workspace/api-client-react";

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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

const partnerOptions = [
  {
    id: "event",
    icon: Calendar,
    title: "Event Sponsorship",
    badge: "Per event",
    description:
      "Back a specific event in the P³ calendar. Your brand on court, on every communication, and on the event page. Includes player tickets, an Exchange slot during the event, and a sponsor badge across the site.",
    detail: "By arrangement",
    colour: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    id: "web",
    icon: Globe,
    title: "Website Advertising",
    badge: "Monthly / quarterly",
    description:
      "An always-on brand placement on the P³ site, reaching a focused audience of City professionals. Premium framed cards — not banners. Great for padel equipment, apparel, hospitality and lifestyle brands.",
    detail: "By arrangement",
    colour: "from-primary/10 via-primary/5 to-transparent",
  },
  {
    id: "founding",
    icon: Star,
    title: "Founding Partner",
    badge: "Season-long",
    description:
      "The headline partnership — top billing in the partner carousel, your name on every event, inclusion in all member communications, and a dedicated feature on the site. Reserved for one partner per season.",
    detail: "By arrangement",
    colour: "from-primary/25 via-primary/10 to-transparent",
  },
];

const audienceStats = [
  { value: "350+", label: "Members" },
  { value: "5",    label: "Events per season" },
  { value: "100%", label: "Senior professionals" },
  { value: "City", label: "of London focus" },
];

const interestOptions = [
  "Event Sponsorship",
  "Website Advertising",
  "Founding Partnership",
  "Not sure — tell me more",
];

export default function PartnerWithUs() {
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: "", company: "", email: "", interest: "", message: "", gdpr: false,
  });
  const [submitted, setSubmitted] = useState(false);

  // Reuse the existing registrations endpoint as an enquiry vehicle
  const { mutate, isPending } = useSubmitRegistration({
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Enquiry sent!", description: "We'll be in touch within two working days." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please email info@padelcubed.co.uk directly.", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gdpr) return;
    mutate({
      name: form.name,
      email: form.email,
      company: form.company,
      role: "Partner enquiry",
      industry: form.interest || "Partnership",
      seniority: "N/A",
      padelLevel: "N/A",
      interests: [form.interest],
      gdprConsent: form.gdpr,
      linkedinUrl: "",
      phoneNumber: "",
      message: form.message,
    } as Parameters<typeof mutate>[0]);
  }

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <a href="/" className="pc-logo" aria-label="P Cubed — People, Padel, Places">
            <span className="pc-mark" aria-hidden="true">P<sup>3</sup></span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="/#events" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Events</a>
            <Link href="/partners" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Partners</Link>
            <a href="/#ambassadors" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Ambassadors</a>
            <Link href="/host-an-event" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Host an event</Link>
          </nav>
          <Button onClick={scrollToForm} className="rounded-full px-6 text-sm font-semibold">
            Enquire
          </Button>
        </div>
      </header>

      <main className="pt-28">
        {/* Hero */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-primary/6 rounded-full blur-[160px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <FadeIn>
              <span className="text-primary text-sm font-semibold tracking-widest uppercase block mb-4">
                Partner with us
              </span>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl leading-tight">
                Reach London's most connected padel community
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
                Three ways to get your brand in front of 350+ senior finance, GRC, and technology professionals — every time they pick up a racket.
              </p>
              <Button onClick={scrollToForm} size="lg" className="rounded-full px-8 text-base font-semibold">
                Get in touch →
              </Button>
            </FadeIn>
          </div>
        </section>

        {/* Audience snapshot */}
        <section className="py-12 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {audienceStats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card/40 p-6 text-center">
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Three partnership options */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-8">
            <FadeIn className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Three ways to partner</h2>
              <p className="text-muted-foreground text-lg">Every partnership is by arrangement — no rate card, just a conversation.</p>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-6">
              {partnerOptions.map((opt, i) => {
                const Icon = opt.icon;
                return (
                  <FadeIn key={opt.id} delay={i * 0.1}>
                    <div className={`group flex flex-col h-full rounded-3xl border border-border bg-gradient-to-br ${opt.colour} bg-card/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                      <div className="flex flex-col flex-1 p-8 gap-5">
                        <div className="flex items-center justify-between">
                          <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border">
                            {opt.badge}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-3 leading-tight">{opt.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{opt.description}</p>
                        </div>
                        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">{opt.detail}</span>
                          <button
                            onClick={scrollToForm}
                            className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                          >
                            Enquire →
                          </button>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* Enquiry form */}
        <section ref={formRef} id="enquire" className="py-16 md:py-24 border-t border-border/40">
          <div className="container mx-auto px-4 md:px-8 max-w-2xl">
            <FadeIn className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Get in touch</h2>
              <p className="text-muted-foreground">
                Fill in the form below and we'll reply within two working days.
                No automated sales sequences — just a genuine conversation.
              </p>
            </FadeIn>

            {submitted ? (
              <FadeIn>
                <div className="rounded-3xl border border-primary/30 bg-primary/5 p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                    <span className="text-2xl text-primary">✓</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Enquiry received</h3>
                  <p className="text-muted-foreground mb-6">We'll be in touch within two working days.</p>
                  <a href="/" className="text-primary font-semibold hover:underline">← Back to the site</a>
                </div>
              </FadeIn>
            ) : (
              <FadeIn>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="partner-name" className="text-sm font-medium text-foreground">
                        Your name <span className="text-primary">*</span>
                      </label>
                      <input
                        id="partner-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Alex Smith"
                        className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="partner-company" className="text-sm font-medium text-foreground">
                        Company <span className="text-primary">*</span>
                      </label>
                      <input
                        id="partner-company"
                        type="text"
                        required
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        placeholder="Acme Ltd"
                        className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="partner-email" className="text-sm font-medium text-foreground">
                      Work email <span className="text-primary">*</span>
                    </label>
                    <input
                      id="partner-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="alex@company.com"
                      className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="partner-interest" className="text-sm font-medium text-foreground">
                      I'm interested in…
                    </label>
                    <select
                      id="partner-interest"
                      value={form.interest}
                      onChange={(e) => setForm({ ...form, interest: e.target.value })}
                      className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all appearance-none"
                    >
                      <option value="">Select an option</option>
                      {interestOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="partner-message" className="text-sm font-medium text-foreground">
                      Message
                    </label>
                    <textarea
                      id="partner-message"
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your brand and what you're hoping to achieve…"
                      className="w-full rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all resize-none"
                    />
                  </div>

                  {/* GDPR consent */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      required
                      checked={form.gdpr}
                      onChange={(e) => setForm({ ...form, gdpr: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary focus:ring-2 focus:ring-primary/60 flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I consent to People, Padel, Places storing my enquiry details and contacting me about partnership opportunities.
                      We will never share your data with third parties.{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    disabled={isPending || !form.gdpr}
                    size="lg"
                    className="rounded-full px-8 text-base font-semibold self-start"
                  >
                    {isPending ? "Sending…" : "Send enquiry →"}
                  </Button>
                </form>
              </FadeIn>
            )}
          </div>
        </section>
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
