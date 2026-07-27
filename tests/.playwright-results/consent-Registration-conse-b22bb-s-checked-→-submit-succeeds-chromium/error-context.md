# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: consent.spec.ts >> Registration consent checkboxes >> all three consents checked → submit succeeds
- Location: web/consent.spec.ts:106:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role="dialog"][aria-modal="true"]').getByText(/you're on the list/i)
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('[role="dialog"][aria-modal="true"]').getByText(/you're on the list/i)

```

```yaml
- banner:
  - link "P Cubed — People, Padel, Places":
    - /url: /
  - navigation:
    - link "Events":
      - /url: "#events"
    - link "Host an event":
      - /url: /host-an-event
  - button "Apply"
- main:
  - text: Our partners
  - link "Visit Risk Rising":
    - /url: https://www.riskrising.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Risk Rising"
  - link "Visit Panorays":
    - /url: https://www.panorays.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Panorays"
  - link "Visit LogicGate":
    - /url: https://www.logicgate.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "LogicGate"
  - link "Visit Corlytics":
    - /url: https://www.corlytics.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Corlytics"
  - link "Visit Finativ":
    - /url: https://www.finativ.co.uk/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Finativ"
  - link "Visit byrne·dean":
    - /url: https://www.byrnedean.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "byrne·dean"
  - link "Visit Racketeer":
    - /url: https://www.racketeer.club
    - img "Racketeer"
  - link "Visit Padium":
    - /url: https://padium.com
    - img "Padium"
  - link "Visit Risk Rising":
    - /url: https://www.riskrising.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Risk Rising"
  - link "Visit Panorays":
    - /url: https://www.panorays.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Panorays"
  - link "Visit LogicGate":
    - /url: https://www.logicgate.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "LogicGate"
  - link "Visit Corlytics":
    - /url: https://www.corlytics.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Corlytics"
  - link "Visit Finativ":
    - /url: https://www.finativ.co.uk/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "Finativ"
  - link "Visit byrne·dean":
    - /url: https://www.byrnedean.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site
    - img "byrne·dean"
  - link "Visit Racketeer":
    - /url: https://www.racketeer.club
    - img "Racketeer"
  - link "Visit Padium":
    - /url: https://padium.com
    - img "Padium"
  - text: Join 120+ professionals already on the list
  - heading "People, Padel, Places." [level=1]
  - paragraph: Arrive solo. Rotate partners. Leave having met the room. All levels welcome — kit provided, no pitch required.
  - button "Register your interest"
  - button "How it works"
  - paragraph: No commitment required.
  - text: Where we play
  - heading "Our venues" [level=2]
  - button "Scroll left" [disabled]
  - button "Scroll right"
  - link "Racketeer 11 courts Racketeer Acton, London Indoor ~20 min from Bank East Acton Central Overground":
    - /url: https://www.racketeer.club
    - img "Racketeer"
    - text: 11 courts
    - heading "Racketeer" [level=3]
    - text: Acton, London Indoor ~20 min from Bank East Acton Central Overground
  - link "Surbiton Racket & Fitness Club 5 courts Surbiton Racket & Fitness Club Surbiton, Surrey Outdoor ~20 min from Waterloo Surbiton SWR":
    - /url: https://www.surbiton.org
    - img "Surbiton Racket & Fitness Club"
    - text: 5 courts
    - heading "Surbiton Racket & Fitness Club" [level=3]
    - text: Surbiton, Surrey Outdoor ~20 min from Waterloo Surbiton SWR
  - link "Padium 9 courts Padium Canary Wharf, London In & outdoor ~10 min from Bank Canary Wharf Jubilee Elizabeth DLR":
    - /url: https://padium.com/canary-wharf
    - img "Padium"
    - text: 9 courts
    - heading "Padium" [level=3]
    - text: Canary Wharf, London In & outdoor ~10 min from Bank Canary Wharf Jubilee Elizabeth DLR
  - text: 🏟️
  - paragraph: More venues coming
  - paragraph: We're expanding across London and beyond.
  - text: Upcoming events
  - heading "Our events" [level=2]
  - paragraph: Play, connect, and belong — from a warm-up in Surbiton to the full P³ launch at Padium, Canary Wharf.
  - text: Pre-Launch Event
  - heading "The Surbiton Exchange" [level=3]
  - text: Thursday 10 September 2026 Surbiton Racquet Club · Surbiton, Surrey 16 spots left Americano £10
  - paragraph: Risk leaders, RegTech founders and compliance professionals connect on court at one of Surrey's finest clubs. Curated Americano play, peer exchange and post-match drinks — brought to you by Risk Rising, Corlytics and Finativ.
  - button "Register interest →"
  - text: Launch Event
  - heading "P³ Launch — People, Padel, Places" [level=3]
  - text: Thursday 15 October 2026 Padium · Canary Wharf, London 16 spots left Americano £20
  - paragraph: An evening of curated play and new connections at Padium, Canary Wharf. Americano format, drinks, and a room full of founders and senior professionals worth meeting.
  - button "Register interest →"
  - paragraph: P³ runs curated social padel events for founders and senior professionals. Using rotating formats like the Americano, you play with and against everyone in the room over 1.5–3 hours — so a single evening turns into a dozen real connections.
  - paragraph: "It's an exchange: of ideas, perspectives, introductions, energy and a good game. All levels welcome — starting in London and growing across the UK."
  - heading "Why join" [level=2]
  - paragraph: Produced social events designed to make real connections — not another awkward room with name badges and canapés.
  - heading "Play with everyone" [level=3]
  - paragraph: Americano-style rotation means new partners every round. Arrive solo, leave having met the room.
  - heading "Produced events, not court hire" [level=3]
  - paragraph: Hosted by an MC, 1.5–3 hours, format, leaderboard and drinks. You're booking an experience, not a court.
  - heading "Exchange, don't pitch" [level=3]
  - paragraph: A built-in moment to trade ideas, views and introductions — no slide decks required.
  - heading "All levels welcome" [level=3]
  - paragraph: Never played? Neither had half the room. Kit provided. We make sure everyone gets a fair, enjoyable game.
  - heading "Partner-backed events" [level=3]
  - paragraph: Our partners sponsor the evening so the focus stays on who's in the room. You get great venues, a great format, and a great crowd — without having to sort any of it yourself.
  - heading "Fitness + connection" [level=3]
  - paragraph: Get off the desk and meet great people in one evening. Building a company is sedentary enough.
  - text: Why this matters
  - heading "Padel is one of the UK's fastest-growing sports. P³ brings it to you the right way." [level=2]
  - paragraph: Every P³ evening is produced from start to finish — a proper venue, an MC, an Americano format, a live leaderboard, and time for a drink at the end. Our partners make it happen. You just show up and play.
  - heading "The best venues" [level=3]
  - paragraph: We work with the top padel clubs in the UK — the courts you've heard of but wouldn't normally book solo. Starting in London, expanding nationally.
  - heading "More than a game." [level=3]
  - paragraph: One ticket, the whole evening — hosted play, a live leaderboard, prizes and drinks. Produced end to end so you can focus on the people, not the logistics.
  - heading "A real experience" [level=3]
  - paragraph: "Not a shared booking with strangers. A produced evening: MC, Americano format, live leaderboard, prizes and drinks — at a venue worth going to."
  - heading "What happens at an event" [level=2]
  - paragraph: From arrival to the final drink — here's how a typical evening runs.
  - text: "1"
  - heading "Welcome" [level=3]
  - paragraph: Arrival, name badges (name + company), and a quick intro from your host. No awkward standing around.
  - text: "2"
  - heading "Warm-up" [level=3]
  - paragraph: A few minutes to find your feet — all levels, no judgement. We ease everyone in together.
  - text: "3"
  - heading "The Americano" [level=3]
  - paragraph: Rotating rounds — you partner and play against different people each time. Points build to a live leaderboard on the night.
  - text: "4"
  - heading "People, Padel, Places" [level=3]
  - paragraph: A short moment for ideas and introductions. At some events, a guest insight from someone in the room.
  - text: "5"
  - heading "Drinks & prizes" [level=3]
  - paragraph: Leaderboard, a winner, a photo, and time to connect properly. The game did the introductions — now just enjoy the conversation.
  - paragraph: Events run 1.5 to 3 hours. Come on your own or bring a colleague — the format does the introductions for you.
  - heading "How it works" [level=2]
  - text: "01"
  - heading "Get in touch" [level=3]
  - paragraph: Drop us a message — we'll come back to you quickly.
  - text: "02"
  - heading "We match you" [level=3]
  - paragraph: We match you to events that fit your level and interests.
  - text: "03"
  - heading "Reserve your spot" [level=3]
  - paragraph: Reserve your spot — you're booking a produced evening, not a court.
  - text: "04"
  - heading "Turn up & connect" [level=3]
  - paragraph: Play with everyone, trade ideas, leave with new connections.
  - heading "Who is this for?" [level=2]
  - paragraph: Founders, operators, and senior leaders who want to meet great people outside their immediate industry bubble — while breaking a sweat. All levels welcome. Starting in London and growing across the UK, P³ is for anyone who values real connection over forced small talk.
  - heading "The ambassadors" [level=2]
  - paragraph: Seven people who'd rather make the introduction on court than across a boardroom. This is who you're playing with.
  - link "Dev O'Nion on LinkedIn":
    - /url: https://www.linkedin.com/in/devairr
  - img "Dev O'Nion"
  - heading "Dev O'Nion" [level=3]
  - paragraph: Director, Risk Rising
  - paragraph: The spark behind P³. Dev builds technology that moves GRC forward — and started this community because the best introductions happen mid-rally, not across a boardroom.
  - link "Rash Phullar on LinkedIn":
    - /url: https://www.linkedin.com/in/rash-phullar-12628847/
  - img "Rash Phullar"
  - heading "Rash Phullar" [level=3]
  - paragraph: Chief Strategic Growth Officer, Corlytics
  - paragraph: Growth strategist by day, relentless competitor on court. Rash helps fast-scaling companies find their edge, and brings the same energy to every rally.
  - link "Jahangez Chaudhery on LinkedIn":
    - /url: https://www.linkedin.com/in/jahangez-chaudhery-7793312a/
  - img "Jahangez Chaudhery"
  - heading "Jahangez Chaudhery" [level=3]
  - paragraph: Executive Underwriter, Apollo 1971
  - paragraph: A specialty insurance mind with a serious appetite for a game. Jahangez underwrites risk at Lloyd's — then happily takes plenty of it at the net.
  - link "James Pickles on LinkedIn":
    - /url: https://www.linkedin.com/in/jamespicklescoaching/
  - img "James Pickles"
  - heading "James Pickles" [level=3]
  - paragraph: Performance & Wellbeing Consultant, byrne·dean
  - paragraph: Award-winning performance coach, speaker, dad of two and unashamed padel enthusiast. James keeps high-performing teams — and this community — healthy, happy and firing.
  - link "Christian Roelofs on LinkedIn":
    - /url: https://www.linkedin.com/in/christianroelofs/
  - img "Christian Roelofs"
  - heading "Christian Roelofs" [level=3]
  - paragraph: CEO, Finativ
  - paragraph: Finance specialist with a builder's instinct. Christian advises on corporate finance, transformation and ESG — and reckons a good doubles partnership tells you everything about someone.
  - link "Lee Edge on LinkedIn":
    - /url: https://www.linkedin.com/in/lee-edge/
  - img "Lee Edge"
  - heading "Lee Edge" [level=3]
  - paragraph: Principal, GRC Edge
  - paragraph: GRC, cyber and AI governance are Lee's world — helping organisations navigate complexity without losing their nerve. On court, he brings the same calm under pressure.
  - link "Tanya Phullar on LinkedIn":
    - /url: https://www.linkedin.com/in/tanya-phullar-4237333b/
  - img "Tanya Phullar"
  - heading "Tanya Phullar" [level=3]
  - paragraph: Programme Manager, Financial Services
  - paragraph: A results-driven Programme Manager with a track record of delivering complex, strategic projects across financial services. Brings the same precision and client confidence to every rally.
  - paragraph: Want to be part of it?
  - button "Register your interest"
  - text: Corporate & private events
  - heading "Bring P³ to your team or clients" [level=2]
  - paragraph: We produce the whole event — format, MC, scoring, kit and photos. You take the credit.
  - link "Find out more →":
    - /url: /host-an-event
  - heading "Frequently asked questions" [level=2]
  - heading "Is it just single games of padel?" [level=3]:
    - button "Is it just single games of padel?"
  - heading "Can I come on my own?" [level=3]:
    - button "Can I come on my own?"
  - heading "Do I need to be good at padel?" [level=3]:
    - button "Do I need to be good at padel?"
  - heading "What is the cost?" [level=3]:
    - button "What is the cost?"
  - heading "Where do events take place?" [level=3]:
    - button "Where do events take place?"
  - heading "Who exactly is in the community?" [level=3]:
    - button "Who exactly is in the community?"
  - heading "How is my data used?" [level=3]:
    - button "How is my data used?"
  - heading "Stay in the loop" [level=2]
  - paragraph: Event announcements, behind-the-scenes, and community moments — follow us to keep up.
  - link "Instagram @padelcubed":
    - /url: https://www.instagram.com/padelcubed
    - img
    - paragraph: Instagram
    - paragraph: "@padelcubed"
    - img
  - link "LinkedIn People, Padel, Places":
    - /url: https://www.linkedin.com/company/people-padel-places/
    - img
    - paragraph: LinkedIn
    - paragraph: People, Padel, Places
    - img
- contentinfo:
  - link "P Cubed — People, Padel, Places":
    - /url: /
  - paragraph: The best padel, best people, best places.
  - link "Events":
    - /url: "#events"
  - link "Ambassadors":
    - /url: "#ambassadors"
  - link "Host an event":
    - /url: /host-an-event
  - link "Email us":
    - /url: mailto:info@padelcubed.co.uk
  - link "Instagram":
    - /url: https://www.instagram.com/padelcubed
  - link "LinkedIn":
    - /url: https://www.linkedin.com/company/people-padel-places/
  - link "Privacy Policy":
    - /url: /privacy
  - paragraph: © 2026 People, Padel, Places. All rights reserved.
  - paragraph: Starting in London · Growing across the UK
- dialog:
  - button "Back"
  - heading "Join the community" [level=2]
  - paragraph: Tell us a bit about yourself and we'll be in touch about upcoming events.
  - button "Close"
  - text: Individual Full name *
  - textbox "Jane Smith": Test User
  - text: Work email *
  - textbox "jane@company.com": test@example.com
  - text: Company
  - textbox "Acme Corp"
  - text: Job title
  - textbox "Founder / Head of Risk"
  - text: Industry
  - combobox:
    - option "Select your industry…" [selected]
    - option "Technology"
    - option "Financial Services"
    - option "Professional Services"
    - option "Cyber / Security"
    - option "Legal"
    - option "Consulting"
    - option "Healthcare"
    - option "Other"
  - text: Role type
  - combobox:
    - option "Select…" [selected]
    - option "Founder / CEO"
    - option "Risk / Compliance / GRC"
    - option "Security / CISO"
    - option "Product / Engineering"
    - option "Sales / Marketing"
    - option "Operations"
    - option "Investor"
    - option "Other"
  - text: Seniority
  - combobox:
    - option "Select…" [selected]
    - option "Founder / Owner"
    - option "C-suite"
    - option "VP / Head of"
    - option "Director / Manager"
    - option "Other"
  - text: Padel level
  - button "Never played"
  - button "Beginner"
  - button "Intermediate"
  - button "Advanced"
  - text: What are you most interested in? (pick any)
  - button "Playing / fitness"
  - button "Meeting other professionals"
  - button "Industry peers & ideas"
  - button "Just trying padel"
  - button "Social play (Americano events)"
  - text: Verify your LinkedIn *
  - textbox "https://www.linkedin.com/in/yourname"
  - checkbox "Required — Keep me posted about P³ events, and store my details so you can. Privacy Notice." [checked]
  - text: Required — Keep me posted about P³ events, and store my details so you can.
  - link "Privacy Notice":
    - /url: /privacy
  - text: .
  - checkbox "Optional — Send me the occasional newsletter and the odd update beyond events." [checked]
  - text: Optional — Send me the occasional newsletter and the odd update beyond events.
  - checkbox "Optional — When a sponsor's a genuine match for someone like me, I'm happy to be introduced." [checked]
  - text: Optional — When a sponsor's a genuine match for someone like me, I'm happy to be introduced.
  - paragraph:
    - text: We never sell your data, and you can delete it whenever you like.
    - link "Privacy Notice":
      - /url: /privacy
    - text: .
  - button "Register my interest"
- dialog "Cookie notice":
  - text: No tracking cookies. We use only essential browser storage to make this site work. We don't use analytics, ad networks, or any third-party tracking. Read our
  - link "Privacy Policy":
    - /url: /privacy
  - text: for full details.
  - button "Got it"
  - button "Dismiss cookie notice"
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  19  |   await page.route("**/api/registrations", (route) =>
  20  |     route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  21  |   );
  22  | 
  23  |   await page.goto("/");
  24  | 
  25  |   // Click any "Register your interest" CTA on the homepage
  26  |   await page.getByRole("button", { name: /register your interest/i }).first().click();
  27  | 
  28  |   // The modal should open
  29  |   // Filter to the IntentModal specifically — the page also has a CookieBanner
  30  |   // with role="dialog" (no aria-modal), so we key on aria-modal="true".
  31  |   const modal = page.locator('[role="dialog"][aria-modal="true"]');
  32  |   await expect(modal).toBeVisible();
  33  | 
  34  |   // The modal opens at the "pick intent" step — click "Join the community"
  35  |   // (it's a <button> element, not just text)
  36  |   await modal.getByRole("button", { name: /join the community/i }).click();
  37  | 
  38  |   // Wait for the form to appear (brief Framer Motion transition)
  39  |   await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });
  40  | 
  41  |   return modal;
  42  | }
  43  | 
  44  | async function fillMinimumFields(modal: import("@playwright/test").Locator) {
  45  |   await modal.getByPlaceholder("Jane Smith").fill("Test User");
  46  |   await modal.getByPlaceholder("jane@company.com").fill("test@example.com");
  47  | }
  48  | 
  49  | // ── tests ────────────────────────────────────────────────────────────────────
  50  | 
  51  | test.describe("Registration consent checkboxes", () => {
  52  |   test("all three consent blocks are visible", async ({ page }) => {
  53  |     const modal = await openJoinForm(page);
  54  | 
  55  |     // Scroll to the consent section at the bottom of the form
  56  |     await modal.getByRole("checkbox").first().scrollIntoViewIfNeeded();
  57  | 
  58  |     // 1. Required — events consent (new wording)
  59  |     await expect(modal.getByText("Required", { exact: false }).first()).toBeVisible();
  60  |     await expect(modal.getByText(/keep me posted about P³ events/i)).toBeVisible();
  61  | 
  62  |     // 2. Optional — newsletter / updates
  63  |     await expect(modal.getByText(/occasional newsletter/i)).toBeVisible();
  64  | 
  65  |     // 3. Optional — sponsor introductions
  66  |     await expect(modal.getByText(/genuine match.*happy to be introduced/i)).toBeVisible();
  67  |   });
  68  | 
  69  |   test("submit button is disabled until required (gdpr) checkbox is checked", async ({ page }) => {
  70  |     const modal = await openJoinForm(page);
  71  |     await fillMinimumFields(modal);
  72  | 
  73  |     const submit = modal.getByRole("button", { name: /register my interest/i });
  74  |     await submit.scrollIntoViewIfNeeded();
  75  | 
  76  |     // Without any consent → disabled
  77  |     await expect(submit).toBeDisabled();
  78  | 
  79  |     // Check only the optional marketing checkbox → still disabled
  80  |     const checkboxes = await modal.getByRole("checkbox").all();
  81  |     await checkboxes[1].check(); // marketing (2nd checkbox)
  82  |     await expect(submit).toBeDisabled();
  83  | 
  84  |     // Check the required gdpr checkbox (1st) → enabled
  85  |     await checkboxes[0].check();
  86  |     await expect(submit).toBeEnabled();
  87  |   });
  88  | 
  89  |   test("optional checkboxes (marketing + sponsor) can be omitted", async ({ page }) => {
  90  |     const modal = await openJoinForm(page);
  91  |     await fillMinimumFields(modal);
  92  | 
  93  |     // Only check the required gdpr box (first checkbox)
  94  |     const [gdprCheckbox] = await modal.getByRole("checkbox").all();
  95  |     await gdprCheckbox.scrollIntoViewIfNeeded();
  96  |     await gdprCheckbox.check();
  97  | 
  98  |     const submit = modal.getByRole("button", { name: /register my interest/i });
  99  |     await expect(submit).toBeEnabled();
  100 | 
  101 |     // Submit with only gdpr → should succeed (API is mocked to 201)
  102 |     await submit.click();
  103 |     await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
  104 |   });
  105 | 
  106 |   test("all three consents checked → submit succeeds", async ({ page }) => {
  107 |     const modal = await openJoinForm(page);
  108 |     await fillMinimumFields(modal);
  109 | 
  110 |     const checkboxes = await modal.getByRole("checkbox").all();
  111 |     for (const cb of checkboxes) {
  112 |       await cb.scrollIntoViewIfNeeded();
  113 |       await cb.check();
  114 |     }
  115 | 
  116 |     const submit = modal.getByRole("button", { name: /register my interest/i });
  117 |     await expect(submit).toBeEnabled();
  118 |     await submit.click();
> 119 |     await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  120 |   });
  121 | });
  122 | 
```