import { LegalLayout } from "@/components/LegalLayout";

const lnk = (href: string, text: string, external = false) => (
  <a
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className="text-primary underline underline-offset-2"
  >
    {text}
  </a>
);

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Notice" lastUpdated="27 July 2026">

      <p>
        <strong className="text-foreground">Who we are.</strong>{" "}
        P³ (Padel Cubed) is operated by Dev AI Limited ("we", "us", "our"), a company registered in England
        and Wales (company number 15876850), registered office Deb Chartered Accountants, 19 Middlewoods Way,
        Carlton, Barnsley, S71 3HR, United Kingdom. Dev AI Limited is the data controller for the personal
        data described here. For anything to do with your data — a copy of it, a correction, deletion, or a
        complaint — email{" "}
        {lnk("mailto:dev.onion@googlemail.com", "dev.onion@googlemail.com")}.
      </p>

      <p>
        <strong className="text-foreground">What we collect.</strong>{" "}
        When you register: your name and email (required); optionally your company, job title/function,
        industry, seniority, padel ability, interests and LinkedIn profile. When you sign in with LinkedIn:
        a stable LinkedIn identifier plus your name and email. When you book and pay: booking details and
        payment confirmation (card payments are handled by Stripe; we never see or store your full card
        details). Automatically: the marketing source of your visit (UTM tags) and basic technical/log data
        needed to run and secure the service.
      </p>

      <p>
        <strong className="text-foreground">Your consent choices.</strong>{" "}
        At sign-up we ask for three separate, independent consents, and you can change any at any time:
        Events (store your details and contact you about events — needed to take part); Marketing (newsletter
        and non-event updates — optional); Sponsor cohorts (share your details with a relevant sponsor where
        you've opted in — optional). If you registered before we separated these, we recorded your events
        consent only, and will ask afresh before using your data for marketing or sponsor sharing.
      </p>

      <p>
        <strong className="text-foreground">Why we use your data, and our legal basis.</strong>{" "}
        Running events (bookings, confirmations, reminders, hosting): to perform our agreement with you and
        our legitimate interest in running the community. Marketing: only with your consent. Segmentation and
        sponsor cohorts: legitimate interest for anonymised information; your consent for any identifiable
        sharing. Payment and financial records: to perform our agreement and meet our legal obligations.
        Security, fraud prevention and analytics: our legitimate interests, balanced against your rights.
      </p>

      <p>
        <strong className="text-foreground">Sponsors — what they see.</strong>{" "}
        Our events are supported by cross-sector sponsors. By default, sponsors only ever see anonymised,
        aggregate information about a cohort (e.g. "around 30 GRC leaders"), which does not identify you.
        We share your identifiable details with a sponsor only where you have given explicit sponsor consent.
        We never sell your data, and no single sponsor owns or controls the community.
      </p>

      <p>
        <strong className="text-foreground">Who we share data with.</strong>{" "}
        A small set of trusted providers who process data on our behalf, under contract and only on our
        instructions: payment (Stripe), email delivery, our automation/data hub, website and database hosting,
        and LinkedIn for sign-in. Our current list is available on request. Some providers operate outside
        the UK; where they do, we rely on UK-approved transfer safeguards (such as the UK International Data
        Transfer Agreement or the UK Addendum to the EU Standard Contractual Clauses).
      </p>

      <p>
        <strong className="text-foreground">How long we keep it.</strong>{" "}
        While you're an active member and for about three years after your last activity, after which we
        delete or anonymise it. If you delete your account, we anonymise your personal data promptly and
        keep only what we're legally required to (a minimal record that consent was given or withdrawn, and
        payment records we must retain by law).
      </p>

      <p>
        <strong className="text-foreground">Your rights.</strong>{" "}
        You can access, correct, delete, restrict or object to how we use your data, ask for portability,
        and withdraw any consent at any time. Delete your account and data yourself in the app, or email{" "}
        {lnk("mailto:dev.onion@googlemail.com", "dev.onion@googlemail.com")}; we'll respond within one
        month. If you're unhappy with how we've handled your data, you can complain to the Information
        Commissioner's Office (ICO) at{" "}
        {lnk("https://ico.org.uk", "ico.org.uk", true)} — though we'd appreciate the chance to put it
        right first.
      </p>

      <p>
        <strong className="text-foreground">Cookies.</strong>{" "}
        We use essential cookies to keep you signed in and secure, and we read marketing-source (UTM) tags
        to understand which channels bring people in. We don't use advertising or tracking cookies.
      </p>

      <p>
        <strong className="text-foreground">Changes.</strong>{" "}
        We'll update this notice as the community grows and post the date of the latest version at the top.
      </p>

    </LegalLayout>
  );
}
