/**
 * Option B — Partner Card (in-grid)
 * A sponsored card that slots directly into the Events listing grid.
 * Visually consistent with event cards so it doesn't break the layout,
 * but clearly badged as "Sponsored" to stay transparent.
 * Pricing idea: £800–£2,000 / season per event listing slot.
 */

function EventCard({ title, date, venue, sponsor }: { title: string; date: string; venue: string; sponsor: string }) {
  return (
    <div
      style={{
        background: "#3557C8",
        border: "1px solid #3A52A6",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: "#19C3B022",
              border: "1px solid #19C3B044",
              borderRadius: 8,
              padding: "6px 10px",
              textAlign: "center",
              minWidth: 44,
            }}
          >
            <div style={{ color: "#19C3B0", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {date.split(" ")[0]}
            </div>
            <div style={{ color: "#FAFAFA", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{date.split(" ")[1]}</div>
          </div>
          <div>
            <div style={{ color: "#FAFAFA", fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{title}</div>
            <div style={{ color: "#C5D2F5", fontSize: 12, marginTop: 3 }}>{venue}</div>
          </div>
        </div>
        <div style={{ background: "#19C3B022", border: "1px solid #19C3B044", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#19C3B0", whiteSpace: "nowrap" }}>
          Open
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ background: "#0E1B2C", border: "1px solid #3A52A6", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#C5D2F5" }}>{sponsor}</span>
        <span style={{ color: "#C5D2F5", fontSize: 12 }}>Americano ›</span>
      </div>
    </div>
  );
}

function SponsoredCard() {
  return (
    <div
      style={{
        background: "#0E1B2C",
        border: "1.5px solid #19C3B066",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          background: "#19C3B0",
          opacity: 0.06,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Sponsored badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#19C3B015",
            border: "1px solid #19C3B044",
            borderRadius: 20,
            padding: "3px 10px",
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#19C3B0" }} />
          <span style={{ color: "#19C3B0", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Sponsored
          </span>
        </div>
        <span style={{ color: "#3A52A6", fontSize: 11 }}>Ad</span>
      </div>

      {/* Company logo placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "#19C3B022",
            border: "1px solid #19C3B044",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 800,
            color: "#19C3B0",
          }}
        >
          P
        </div>
        <div>
          <div style={{ color: "#FAFAFA", fontWeight: 700, fontSize: 15 }}>PadelPro Gear</div>
          <div style={{ color: "#C5D2F5", fontSize: 12, marginTop: 2 }}>Premium padel equipment</div>
        </div>
      </div>

      {/* Tagline */}
      <p style={{ color: "#C5D2F5", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
        Exclusive 20% discount for P³ members on rackets, balls and bags.
      </p>

      {/* CTA */}
      <div
        style={{
          background: "#19C3B0",
          borderRadius: 8,
          padding: "10px 16px",
          textAlign: "center",
          color: "#0E1B2C",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Claim member discount →
      </div>

      {/* Fine print */}
      <span style={{ color: "#3A52A6", fontSize: 10, textAlign: "center" }}>
        padelprogear.co.uk · Partner of P³
      </span>
    </div>
  );
}

export function PartnerCard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1e2d5a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
        gap: 24,
      }}
    >
      <div style={{ color: "#C5D2F5", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
        Events listing — sponsored slot shown in grid
      </div>

      {/* Simulate the events grid */}
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <EventCard title="The City Kickoff" date="AUG 6" venue="Racketeer · Acton" sponsor="Corlytics" />
        <EventCard title="The Surbiton Exchange" date="SEP 10" venue="Surbiton Racquet Club" sponsor="Risk Rising, Corlytics & Finativ" />
        <SponsoredCard />
        <EventCard title="The GRC Exchange" date="OCT 8" venue="Racketeer · Acton" sponsor="GRC Edge" />
        <EventCard title="The October Smash" date="OCT 29" venue="Padium · London" sponsor="Apollo 1971" />
        <EventCard title="The Year Closer" date="DEC 3" venue="Racketeer · Acton" sponsor="byrne-dean" />
      </div>

      {/* Annotation */}
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: "#0E1B2C",
          border: "1px dashed #3A52A6",
          borderRadius: 10,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#19C3B0", flexShrink: 0 }} />
        <span style={{ color: "#C5D2F5", fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: "#FAFAFA" }}>In-grid Partner Card</strong> — slots naturally between event cards. Same height & layout as an event card. "Sponsored" badge + "Ad" label keeps it transparent. Rotates per event if multiple partners are signed up.
        </span>
      </div>
    </div>
  );
}
