import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Users, Briefcase, X } from "lucide-react";

interface IntentModalProps {
  open: boolean;
  onClose: () => void;
  onIndividual: () => void;
}

export function IntentModal({ open, onClose, onIndividual }: IntentModalProps) {
  const [, navigate] = useLocation();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleIndividual() {
    onClose();
    onIndividual();
  }

  function handleCorporate() {
    onClose();
    navigate("/host-an-event");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="What are you looking for?"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-xl bg-card border border-border rounded-3xl shadow-2xl p-6 md:p-8">

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">What are you looking for?</h2>
                  <p className="text-sm text-muted-foreground mt-1">We'll point you in the right direction.</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-full h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0 mt-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Individual */}
                <button
                  onClick={handleIndividual}
                  className="group text-left rounded-2xl border border-border bg-background/60 hover:border-primary/50 hover:bg-primary/5 p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    Join the community
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I'm an individual — register my interest in playing at P³ events.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Register your interest →
                  </span>
                </button>

                {/* Corporate */}
                <button
                  onClick={handleCorporate}
                  className="group text-left rounded-2xl border border-border bg-background/60 hover:border-primary/50 hover:bg-primary/5 p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    Host an event
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I represent a company — enquire about a team day, client entertainment or corporate event.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Enquire now →
                  </span>
                </button>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
