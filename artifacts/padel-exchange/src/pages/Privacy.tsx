import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2 cursor-pointer">
              <div className="w-6 h-6 bg-primary rounded-full" />
              People, Padel, Places
            </div>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-full gap-2 bg-transparent">
              <ChevronLeft className="h-4 w-4" />
              Back to site
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-16 md:py-24 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm">Last updated: 17 July 2026</p>
        </div>

        <Section title="1. Who we are">
          <p>
            People, Padel, Places is operated by Risk Rising Ltd ("we", "us", "our"). For the purposes of
            UK data protection law, we are the <strong className="text-foreground">data controller</strong> in respect of
            personal data collected through this website.
          </p>
          <p>
            If you have any questions about this policy or how we handle your personal data, please
            contact us at:{" "}
            <a href="mailto:privacy@thepadelexchange.com" className="text-primary underline underline-offset-2">
              privacy@thepadelexchange.com
            </a>
          </p>
        </Section>

        <Section title="2. What personal data we collect">
          <p>When you register your interest through our website, we collect the following:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Full name <span className="text-foreground/60">(required)</span></li>
            <li>Email address <span className="text-foreground/60">(required)</span></li>
            <li>Company name <span className="text-foreground/60">(optional)</span></li>
            <li>Job title / role <span className="text-foreground/60">(optional)</span></li>
            <li>Industry <span className="text-foreground/60">(optional)</span></li>
            <li>Function <span className="text-foreground/60">(optional)</span></li>
            <li>Seniority level <span className="text-foreground/60">(optional)</span></li>
            <li>Padel experience level <span className="text-foreground/60">(optional)</span></li>
            <li>Interests / what you're looking for <span className="text-foreground/60">(optional)</span></li>
            <li>LinkedIn profile URL <span className="text-foreground/60">(optional)</span></li>
            <li>Your consent record, including the date and time it was given</li>
          </ul>
          <p>We do not collect any special category data (e.g. health, race, religion, biometrics).</p>
        </Section>

        <Section title="3. Legal basis for processing">
          <p>
            We process your personal data on the basis of your <strong className="text-foreground">explicit consent</strong> under
            Article 6(1)(a) of the UK General Data Protection Regulation (UK GDPR). You provide this consent by
            ticking the consent checkbox on our registration form before submitting your details.
          </p>
          <p>
            You have the right to withdraw your consent at any time. Withdrawal does not affect the
            lawfulness of processing carried out before you withdrew consent. To withdraw, email us at{" "}
            <a href="mailto:privacy@thepadelexchange.com" className="text-primary underline underline-offset-2">
              privacy@thepadelexchange.com
            </a>{" "}
            and we will delete your data within 30 days.
          </p>
        </Section>

        <Section title="4. How we use your data">
          <p>We use the personal data you provide solely to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Match you to events that fit your experience level and interests</li>
            <li>Contact you about upcoming events and reserve your spot</li>
            <li>Manage community membership and curate the group</li>
            <li>Send you relevant community updates (you can opt out at any time)</li>
          </ul>
          <p>
            We will <strong className="text-foreground">never</strong> use your data for automated decision-making
            or profiling that produces legal or similarly significant effects on you.
          </p>
          <p>
            We will <strong className="text-foreground">never</strong> sell, rent or share your personal data with
            third parties for their own marketing purposes.
          </p>
        </Section>

        <Section title="5. How long we keep your data">
          <p>
            We retain your registration data for as long as you remain an active member of People, Padel, Places
            community, or until you ask us to delete it — whichever comes first.
          </p>
          <p>
            If you withdraw your consent or request erasure, we will delete your personal data within{" "}
            <strong className="text-foreground">30 days</strong> and confirm this to you by email.
          </p>
          <p>
            We review our member data annually and remove records where there has been no engagement
            for 24 months, unless you have asked to remain on the list.
          </p>
        </Section>

        <Section title="6. Who we share your data with">
          <p>
            We share your data only in the following limited circumstances, and only where necessary:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Event venues</strong> — we may share your first name with a venue for
              on-the-day check-in logistics. No other data is shared.
            </li>
            <li>
              <strong className="text-foreground">Sponsors</strong> — sponsors fund access to events but do not receive
              your personal data. We will never pass your details to a sponsor without your specific consent.
            </li>
            <li>
              <strong className="text-foreground">Hosting and infrastructure providers</strong> — our website and database
              are hosted by Replit, Inc., under appropriate data processing terms. Your data is stored within
              their infrastructure in accordance with their privacy commitments.
            </li>
          </ul>
          <p>We do not transfer your personal data outside the UK or EEA without appropriate safeguards.</p>
        </Section>

        <Section title="7. Your rights under UK GDPR">
          <p>You have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Right of access</strong> — you can request a copy of all personal data we
              hold about you (a Subject Access Request).
            </li>
            <li>
              <strong className="text-foreground">Right to rectification</strong> — you can ask us to correct any inaccurate
              or incomplete data.
            </li>
            <li>
              <strong className="text-foreground">Right to erasure</strong> — you can ask us to delete your personal data
              (the "right to be forgotten"), subject to any overriding legal obligations.
            </li>
            <li>
              <strong className="text-foreground">Right to restriction</strong> — you can ask us to pause processing of
              your data while a dispute is resolved.
            </li>
            <li>
              <strong className="text-foreground">Right to data portability</strong> — you can request your data in a
              structured, machine-readable format (e.g. CSV).
            </li>
            <li>
              <strong className="text-foreground">Right to object</strong> — you can object to processing based on our
              legitimate interests.
            </li>
            <li>
              <strong className="text-foreground">Right to withdraw consent</strong> — you can withdraw your consent at
              any time without affecting prior processing.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href="mailto:privacy@thepadelexchange.com" className="text-primary underline underline-offset-2">
              privacy@thepadelexchange.com
            </a>
            . We will respond within{" "}
            <strong className="text-foreground">one calendar month</strong> as required by UK GDPR.
          </p>
        </Section>

        <Section title="8. Cookies and local storage">
          <p>
            This website uses <strong className="text-foreground">no tracking or advertising cookies</strong> and does not
            use any third-party analytics services (e.g. Google Analytics, Meta Pixel).
          </p>
          <p>
            We use browser <strong className="text-foreground">local storage</strong> only for essential, non-identifying
            functionality — such as remembering that you have acknowledged our cookie notice. This data
            never leaves your device and is not sent to our servers.
          </p>
          <p>
            If we add analytics or other cookies in the future, we will update this policy and seek your
            consent before setting any non-essential cookies.
          </p>
        </Section>

        <Section title="9. Data security">
          <p>
            We take appropriate technical and organisational measures to protect your personal data against
            unauthorised access, loss, or disclosure. Access to registration data is restricted to
            authorised members of the People, Padel, Places team and is protected by password authentication.
          </p>
          <p>
            If we become aware of a personal data breach that is likely to result in a risk to your
            rights and freedoms, we will notify the ICO within 72 hours and inform you without undue
            delay where required.
          </p>
        </Section>

        <Section title="10. Right to complain">
          <p>
            If you are unhappy with how we have handled your personal data, you have the right to lodge a
            complaint with the UK's supervisory authority:
          </p>
          <div className="mt-3 p-4 rounded-xl border border-border bg-card/50 text-foreground">
            <p className="font-semibold mb-1">Information Commissioner's Office (ICO)</p>
            <p className="text-sm">
              Website:{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                ico.org.uk
              </a>
            </p>
            <p className="text-sm">Phone: 0303 123 1113</p>
          </div>
          <p className="mt-3">
            We would always prefer you contact us first so we have the opportunity to resolve your
            concern directly.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this privacy policy from time to time. The date at the top of the page
            reflects when it was last revised. Material changes will be communicated to registered
            members by email.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link href="/">
            <Button className="rounded-full px-8">Back to People, Padel, Places</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border bg-card/50 py-8 mt-8">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} People, Padel, Places · Risk Rising Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
