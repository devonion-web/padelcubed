import { LegalLayout } from "@/components/LegalLayout";
import { Link } from "wouter";

const lnk = (href: string, text: string, external = false) => (
  <a
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className="text-primary underline underline-offset-2"
  >
    {text}
  </a>
);

export default function TermsOfSale() {
  return (
    <LegalLayout title="Terms of Sale &amp; Refund / Cancellation Policy" lastUpdated="27 July 2026">

      <p>
        <strong className="text-foreground">Who you're buying from.</strong>{" "}
        Event tickets for P³ (Padel Cubed) are sold by Dev AI Limited, a company registered in England and
        Wales (company number 15876850), registered office Deb Chartered Accountants, 19 Middlewoods Way,
        Carlton, Barnsley, S71 3HR, United Kingdom. Contact:{" "}
        {lnk("mailto:dev.onion@googlemail.com", "dev.onion@googlemail.com")}.
      </p>

      <p>
        <strong className="text-foreground">Buying a ticket.</strong>{" "}
        A ticket is a licence for one named person to attend the specified P³ event. When you complete
        checkout and payment (via Stripe), a contract is formed and your place is confirmed. Prices are in
        pounds sterling and include any applicable taxes. Payment is taken upfront; your place is secured
        only once payment succeeds. Tickets are personal to you. Events are for attendees aged 18 or over
        (they include alcohol).
      </p>

      <p>
        <strong className="text-foreground">What's included.</strong>{" "}
        Your ticket covers the produced event as described on its page — hosted play (Americano format),
        equipment provided, and refreshments as stated. Specific timings, venue and inclusions are on the
        event listing.
      </p>

      <p>
        <strong className="text-foreground">Refunds and cancellation.</strong>{" "}
        Tickets are non-refundable, because payment secures a limited place and covers the cost of producing
        the event. However, they are transferable: you may pass your place to another eligible (18+) guest,
        or release your place through the app, up to 48 hours before the event. If we cancel or reschedule
        an event, you'll be offered a full refund or a transfer to the new date — your choice. There are no
        refunds for no-shows or late arrivals. Because these are tickets for leisure events on a specific
        date, they are exempt from the 14-day "cooling-off" cancellation right under the Consumer Contracts
        Regulations 2013.
      </p>

      <p>
        <strong className="text-foreground">Changes to events.</strong>{" "}
        Line-ups, format details and timings may change; we'll tell you if anything material changes. Venue
        or date changes trigger the refund/transfer option above.
      </p>

      <p>
        <strong className="text-foreground">Your responsibilities.</strong>{" "}
        Give accurate details at checkout so we can contact you. Arrive fit to play; padel is a physical
        activity — take part within your own limits. Follow the venue's rules and our reasonable
        instructions on the night.
      </p>

      <p>
        <strong className="text-foreground">Liability.</strong>{" "}
        Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or
        anything that can't be limited by law. Otherwise, our liability in connection with a ticket is
        limited to the price paid for it.
      </p>

      <p>
        <strong className="text-foreground">Data.</strong>{" "}
        We handle your data as set out in our{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-2">
          Privacy Notice
        </Link>
        . Payment is processed by Stripe; we never see or store your full card details.
      </p>

      <p>
        <strong className="text-foreground">General.</strong>{" "}
        These terms are governed by the law of England and Wales, and its courts have jurisdiction. If any
        part is unenforceable, the rest still applies. We may update these terms; the version shown at the
        time of your purchase applies to that purchase.
      </p>

    </LegalLayout>
  );
}
