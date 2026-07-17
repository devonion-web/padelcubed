import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { X } from "lucide-react";

const STORAGE_KEY = "tpe_cookie_notice_dismissed";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not already dismissed
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">No tracking cookies.</span>{" "}
          We use only essential browser storage to make this site work. We don't use analytics,
          ad networks, or any third-party tracking. Read our{" "}
          <Link href="/privacy">
            <span className="text-primary underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity">
              Privacy Policy
            </span>
          </Link>{" "}
          for full details.
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            size="sm"
            onClick={dismiss}
            className="rounded-full px-5 text-sm font-semibold"
          >
            Got it
          </Button>
          <button
            onClick={dismiss}
            aria-label="Dismiss cookie notice"
            className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
