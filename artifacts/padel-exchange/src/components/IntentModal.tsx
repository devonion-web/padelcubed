import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Users, Briefcase, Handshake, ChevronLeft, Loader2, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Intent  = "join" | "host" | "partner";
type Step    = "pick" | "form" | "success";

interface JoinFields    { fullName: string; email: string; company: string; jobTitle: string; padelLevel: string; gdpr: boolean; }
interface HostFields    { contactName: string; company: string; workEmail: string; eventType: string; headcount: string; gdpr: boolean; }
interface PartnerFields { contactName: string; company: string; workEmail: string; partnershipType: string; message: string; gdpr: boolean; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const INTENTS: { id: Intent; icon: React.ElementType; label: string; sublabel: string; cta: string; desc: string }[] = [
  {
    id: "join",
    icon: Users,
    label: "Join the community",
    sublabel: "Individual",
    cta: "Register your interest →",
    desc: "Play at P³ events as an individual member.",
  },
  {
    id: "host",
    icon: Briefcase,
    label: "Host an event",
    sublabel: "Company",
    cta: "Enquire now →",
    desc: "Book a team day, client event or corporate outing.",
  },
  {
    id: "partner",
    icon: Handshake,
    label: "Partner with us",
    sublabel: "Sponsor / Advertiser",
    cta: "Get in touch →",
    desc: "Sponsor, co-brand or advertise alongside P³.",
  },
];

const PADEL_LEVELS = ["Never played", "Beginner", "Intermediate", "Advanced"] as const;
const EVENT_TYPES  = ["Team day", "Client entertainment", "Product launch / Activation", "Conference social", "Other"] as const;
const HEADCOUNTS   = ["Under 10", "10–20", "20–40", "40+"] as const;
const PARTNER_TYPES = ["Sponsor an event", "Co-brand with P³", "Become a venue partner", "Media / advertising", "Other"] as const;

const GDPR_TEXT = (
  <span className="text-xs text-muted-foreground leading-relaxed">
    I consent to People, Padel, Places (operated by Risk Rising Ltd) processing my data to respond to this enquiry.
    Read our{" "}
    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      Privacy Policy
    </a>
    .
  </span>
);

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors";
const selectCls = inputCls + " cursor-pointer";

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ intent, onClose }: { intent: Intent; onClose: () => void }) {
  const messages: Record<Intent, { heading: string; body: string }> = {
    join:    { heading: "You're on the list — welcome.", body: "We'll be in touch with details about the next event. Keep an eye on your inbox." },
    host:    { heading: "Enquiry received.", body: "We'll come back to you within two working days to discuss your event." },
    partner: { heading: "Thanks for reaching out.", body: "Someone from the P³ team will be in touch shortly." },
  };
  const { heading, body } = messages[intent];
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-8 px-4 gap-4"
    >
      <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
        <Check className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">{heading}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{body}</p>
      </div>
      <button
        onClick={onClose}
        className="mt-2 rounded-full px-8 h-10 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Done
      </button>
    </motion.div>
  );
}

// ─── Join form ────────────────────────────────────────────────────────────────
function JoinForm({ onSuccess }: { onSuccess: () => void }) {
  const [f, setF] = useState<JoinFields>({ fullName: "", email: "", company: "", jobTitle: "", padelLevel: "", gdpr: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.gdpr) { setError("Please accept the privacy policy."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE()}/api/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: f.fullName,
          email: f.email,
          company: f.company || undefined,
          jobTitle: f.jobTitle || undefined,
          padelLevel: f.padelLevel || undefined,
          gdprConsent: f.gdpr,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.error ?? "Submission failed."); }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name *">
          <input required className={inputCls} placeholder="Jane Smith" value={f.fullName} onChange={e => setF({ ...f, fullName: e.target.value })} />
        </Field>
        <Field label="Work email *">
          <input required type="email" className={inputCls} placeholder="jane@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Company">
          <input className={inputCls} placeholder="Acme Corp" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
        </Field>
        <Field label="Job title">
          <input className={inputCls} placeholder="Founder / Head of Risk" value={f.jobTitle} onChange={e => setF({ ...f, jobTitle: e.target.value })} />
        </Field>
      </div>
      <Field label="Padel level">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PADEL_LEVELS.map(level => (
            <button
              key={level} type="button"
              onClick={() => setF({ ...f, padelLevel: level })}
              className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors text-center ${f.padelLevel === level ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
            >
              {level}
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary flex-shrink-0" checked={f.gdpr} onChange={e => setF({ ...f, gdpr: e.target.checked })} />
        {GDPR_TEXT}
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit" disabled={loading || !f.gdpr}
        className="w-full rounded-xl h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : "Register my interest"}
      </button>
    </form>
  );
}

// ─── Host an event form ───────────────────────────────────────────────────────
function HostForm({ onSuccess }: { onSuccess: () => void }) {
  const [f, setF] = useState<HostFields>({ contactName: "", company: "", workEmail: "", eventType: "", headcount: "", gdpr: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.gdpr) { setError("Please accept the privacy policy."); return; }
    if (!f.eventType) { setError("Please select an event type."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE()}/api/corporate-enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: f.contactName,
          company: f.company,
          workEmail: f.workEmail,
          eventType: f.eventType,
          headcount: f.headcount ? parseInt(f.headcount.replace(/\D.*/, ""), 10) : undefined,
          gdprConsent: f.gdpr,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.error ?? "Submission failed."); }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name *">
          <input required className={inputCls} placeholder="James Brown" value={f.contactName} onChange={e => setF({ ...f, contactName: e.target.value })} />
        </Field>
        <Field label="Company *">
          <input required className={inputCls} placeholder="Acme Corp" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
        </Field>
      </div>
      <Field label="Work email *">
        <input required type="email" className={inputCls} placeholder="james@company.com" value={f.workEmail} onChange={e => setF({ ...f, workEmail: e.target.value })} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Event type *">
          <select required className={selectCls} value={f.eventType} onChange={e => setF({ ...f, eventType: e.target.value })}>
            <option value="">Select…</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Approx headcount">
          <select className={selectCls} value={f.headcount} onChange={e => setF({ ...f, headcount: e.target.value })}>
            <option value="">Select…</option>
            {HEADCOUNTS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary flex-shrink-0" checked={f.gdpr} onChange={e => setF({ ...f, gdpr: e.target.checked })} />
        {GDPR_TEXT}
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit" disabled={loading || !f.gdpr}
        className="w-full rounded-xl h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : "Send enquiry"}
      </button>
    </form>
  );
}

// ─── Partner with us form ─────────────────────────────────────────────────────
function PartnerForm({ onSuccess }: { onSuccess: () => void }) {
  const [f, setF] = useState<PartnerFields>({ contactName: "", company: "", workEmail: "", partnershipType: "", message: "", gdpr: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.gdpr) { setError("Please accept the privacy policy."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE()}/api/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: f.contactName,
          email: f.workEmail,
          company: f.company || undefined,
          jobTitle: f.partnershipType ? `Partner enquiry — ${f.partnershipType}` : "Partner enquiry",
          gdprConsent: f.gdpr,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.error ?? "Submission failed."); }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name *">
          <input required className={inputCls} placeholder="Sarah Jones" value={f.contactName} onChange={e => setF({ ...f, contactName: e.target.value })} />
        </Field>
        <Field label="Company *">
          <input required className={inputCls} placeholder="Acme Corp" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
        </Field>
      </div>
      <Field label="Work email *">
        <input required type="email" className={inputCls} placeholder="sarah@company.com" value={f.workEmail} onChange={e => setF({ ...f, workEmail: e.target.value })} />
      </Field>
      <Field label="Area of interest">
        <select className={selectCls} value={f.partnershipType} onChange={e => setF({ ...f, partnershipType: e.target.value })}>
          <option value="">Select…</option>
          {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Brief message">
        <textarea
          className={inputCls + " resize-none"}
          rows={3}
          placeholder="Tell us a bit about what you have in mind…"
          value={f.message}
          onChange={e => setF({ ...f, message: e.target.value })}
        />
      </Field>
      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-primary flex-shrink-0" checked={f.gdpr} onChange={e => setF({ ...f, gdpr: e.target.checked })} />
        {GDPR_TEXT}
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit" disabled={loading || !f.gdpr}
        className="w-full rounded-xl h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : "Send enquiry"}
      </button>
    </form>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface IntentModalProps {
  open: boolean;
  onClose: () => void;
}

export function IntentModal({ open, onClose }: IntentModalProps) {
  const [step, setStep]     = useState<Step>("pick");
  const [intent, setIntent] = useState<Intent | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) { setTimeout(() => { setStep("pick"); setIntent(null); }, 300); }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function pick(id: Intent) { setIntent(id); setStep("form"); }
  function back() { setStep("pick"); }
  function success() { setStep("success"); }

  const current = INTENTS.find(i => i.id === intent);

  const formStepHeadings: Record<Intent, { title: string; sub: string }> = {
    join:    { title: "Join the community",  sub: "Tell us a bit about yourself and we'll be in touch about upcoming events." },
    host:    { title: "Host an event",       sub: "Give us the basics and we'll come back to you within two working days." },
    partner: { title: "Partner with us",     sub: "Let us know what you have in mind and we'll be in touch shortly." },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog" aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`pointer-events-auto w-full bg-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${step === "pick" ? "max-w-2xl" : "max-w-lg"}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  {step === "form" && (
                    <button
                      onClick={back}
                      aria-label="Back"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div>
                    {step === "pick" && (
                      <>
                        <h2 className="text-lg font-bold text-foreground leading-tight">What are you looking for?</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">We'll point you in the right direction.</p>
                      </>
                    )}
                    {step === "form" && intent && (
                      <>
                        <h2 className="text-lg font-bold text-foreground leading-tight">{formStepHeadings[intent].title}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{formStepHeadings[intent].sub}</p>
                      </>
                    )}
                    {step === "success" && (
                      <h2 className="text-lg font-bold text-foreground leading-tight">All done</h2>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose} aria-label="Close"
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[75vh]">
                <AnimatePresence mode="wait">

                  {/* ── Step 1: Pick intent ──────────────────────────────────── */}
                  {step === "pick" && (
                    <motion.div
                      key="pick"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="grid sm:grid-cols-3 gap-3"
                    >
                      {INTENTS.map(({ id, icon: Icon, label, sublabel, cta, desc }) => (
                        <button
                          key={id}
                          onClick={() => pick(id)}
                          className="group text-left rounded-2xl border border-border bg-background/60 hover:border-primary/50 hover:bg-primary/5 p-5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card flex flex-col"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-3 flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground block mb-1">{sublabel}</span>
                          <h3 className="text-sm font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">{label}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed flex-grow">{desc}</p>
                          <span className="text-xs font-semibold text-primary mt-3 block">{cta}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* ── Step 2: Form ─────────────────────────────────────────── */}
                  {step === "form" && intent && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18 }}
                    >
                      {/* Intent badge */}
                      {current && (
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                            <current.icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-primary">{current.sublabel}</span>
                        </div>
                      )}
                      {intent === "join"    && <JoinForm    onSuccess={success} />}
                      {intent === "host"    && <HostForm    onSuccess={success} />}
                      {intent === "partner" && <PartnerForm onSuccess={success} />}
                    </motion.div>
                  )}

                  {/* ── Step 3: Success ──────────────────────────────────────── */}
                  {step === "success" && intent && (
                    <SuccessScreen key="success" intent={intent} onClose={onClose} />
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
