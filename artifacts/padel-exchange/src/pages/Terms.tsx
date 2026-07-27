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

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" lastUpdated="27 July 2026">

      <p>
        <strong className="text-foreground">About us.</strong>{" "}
        P³ (Padel Cubed) is operated by Dev AI Limited, registered in England and Wales (company number
        15876850), registered office Deb Chartered Accountants, 19 Middlewoods Way, Carlton, Barnsley,
        S71 3HR, United Kingdom. These Terms govern your use of the P³ website and app. By creating an
        account or registering your interest, you accept these terms. Contact:{" "}
        {lnk("mailto:dev.onion@googlemail.com", "dev.onion@googlemail.com")}.
      </p>

      <p>
        <strong className="text-foreground">Eligibility.</strong>{" "}
        You must be 18 or over to create an account, register, or attend a P³ event (our events include
        alcohol and are aimed at professionals). By using the service you confirm you're 18 or over.
      </p>

      <p>
        <strong className="text-foreground">Your account.</strong>{" "}
        Give accurate information and keep it up to date. You're responsible for activity under your
        account; keep your sign-in secure. If you sign in with LinkedIn, we use your LinkedIn name and
        email only to set up and identify your account — we never post anything. You can delete your
        account and data at any time in the app.
      </p>

      <p>
        <strong className="text-foreground">Acceptable use.</strong>{" "}
        Don't misuse the service: no unlawful use, no attempts to break, probe or overload the service or
        its security, no scraping or harvesting others' data, no impersonation, and nothing that harms other
        members or the community. We may suspend or remove accounts that break these rules.
      </p>

      <p>
        <strong className="text-foreground">Events, bookings and payment.</strong>{" "}
        Booking and paying for events is governed by our{" "}
        <Link href="/terms-of-sale" className="text-primary underline underline-offset-2">
          Terms of Sale
        </Link>
        , including the refund and cancellation policy. Events are produced social sport events; take part
        within your own physical limits and follow venue rules and our reasonable instructions.
      </p>

      <p>
        <strong className="text-foreground">Our content and brand.</strong>{" "}
        The P³ name, logo, content and materials are owned by or licensed to Dev AI Limited. Don't copy,
        reuse, or pass them off as your own without permission.
      </p>

      <p>
        <strong className="text-foreground">Your data.</strong>{" "}
        We handle personal data as described in our{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-2">
          Privacy Notice
        </Link>{" "}
        — including the consents you choose at sign-up, and your right to opt out or delete your data at
        any time. We never sell your data.
      </p>

      <p>
        <strong className="text-foreground">Availability and changes.</strong>{" "}
        We aim to keep the service running but don't guarantee it's always available or error-free. We may
        change or withdraw features, and may update these terms; if we make material changes we'll take
        reasonable steps to let you know, and continued use means you accept the updated terms.
      </p>

      <p>
        <strong className="text-foreground">Liability.</strong>{" "}
        Nothing here limits liability for death or personal injury caused by negligence, fraud, or anything
        that can't be limited by law. Otherwise, to the extent permitted by law, we're not liable for
        indirect or unforeseeable loss, and our total liability connected to your use of the service is
        limited as set out in the Terms of Sale for event purchases.
      </p>

      <p>
        <strong className="text-foreground">Governing law.</strong>{" "}
        These terms are governed by the law of England and Wales, and its courts have jurisdiction.
      </p>

    </LegalLayout>
  );
}
