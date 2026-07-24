import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Check, Calendar, MapPin, Clock, CreditCard, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookableEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  price: string;
  pricePence?: number;
  sponsor?: string | null;
}

interface BookingModalProps {
  event: BookableEvent | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors";

const GDPR_TEXT = (
  <span className="text-xs text-muted-foreground leading-relaxed">
    I consent to People, Padel, Places (operated by Risk Rising Ltd) processing my data
    to manage my booking. Read our{" "}
    <a
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      Privacy Policy
    </a>
    .
  </span>
);

// ─── Form ─────────────────────────────────────────────────────────────────────

function BookingForm({ event, onSuccess }: { event: BookableEvent; onSuccess: () => void }) {
  const isPaid = (event.pricePence ?? 0) > 0;

  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    company: "",
    gdpr: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof fields, value: string | boolean) {
    setFields((f) => ({ ...f, [key]: value }));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.gdpr) { setError("Please accept the privacy policy to continue."); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE()}/api/events/${event.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fields.fullName,
          email: fields.email,
          company: fields.company || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Booking failed.");

      if (data.url) {
        // Paid → redirect to Stripe Checkout
        window.location.href = data.url;
        return; // keep loading state while redirecting
      }
      // Free → booked directly
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Event summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-1.5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground text-base">{event.title}</p>
        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary/60" /><span>{event.date}</span></div>
        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary/60" /><span>{event.time}</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary/60" /><span>{event.venue} · {event.location}</span></div>
      </div>

      {/* Fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Full name *</label>
          <input
            required
            className={inputCls}
            placeholder="Jane Smith"
            value={fields.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Work email *</label>
          <input
            required
            type="email"
            className={inputCls}
            placeholder="jane@company.com"
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Company</label>
        <input
          className={inputCls}
          placeholder="Acme Corp"
          value={fields.company}
          onChange={(e) => set("company", e.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded accent-primary flex-shrink-0"
          checked={fields.gdpr}
          onChange={(e) => set("gdpr", e.target.checked)}
        />
        {GDPR_TEXT}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Price summary for paid events */}
      {isPaid && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Total</p>
            <p className="text-xs text-muted-foreground">Includes venue, hosting &amp; drinks</p>
          </div>
          <span className="text-xl font-bold text-foreground">{event.price}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !fields.gdpr}
        className="w-full rounded-xl h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{isPaid ? "Redirecting to checkout…" : "Booking your spot…"}</>
        ) : isPaid ? (
          <><CreditCard className="h-4 w-4" />Pay {event.price} &amp; reserve spot <ArrowRight className="h-3.5 w-3.5" /></>
        ) : (
          "Reserve my free spot"
        )}
      </button>

      {isPaid && (
        <p className="text-xs text-center text-muted-foreground">
          Powered by Stripe · Secure payment · Full refund if event cancelled
        </p>
      )}
    </form>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ onClose }: { onClose: () => void }) {
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
        <h3 className="text-xl font-bold text-foreground mb-2">You're in — see you on court.</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Confirmation and full event details are on their way to your inbox. Check your spam if it doesn't arrive in a few minutes.
        </p>
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

// ─── Main modal ───────────────────────────────────────────────────────────────

export function BookingModal({ event, onClose }: BookingModalProps) {
  const [done, setDone] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!event) setTimeout(() => setDone(false), 300);
  }, [event]);

  // Escape key
  useEffect(() => {
    if (!event) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [event, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = event ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [event]);

  return (
    <AnimatePresence>
      {event && (
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
            role="dialog"
            aria-modal="true"
            aria-label={`Reserve spot at ${event.title}`}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-foreground leading-tight">Reserve your spot</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(event.pricePence ?? 0) > 0
                      ? `${event.price} per person · secure payment via Stripe`
                      : "Free to attend · confirm your place below"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
                <AnimatePresence mode="wait">
                  {done ? (
                    <SuccessScreen key="success" onClose={onClose} />
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      <BookingForm event={event} onSuccess={() => setDone(true)} />
                    </motion.div>
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
