/**
 * Option C — Section Takeover
 * A full-width bold sponsor spotlight that sits between major content sections
 * (e.g. between Events and Founders). The most impactful ad slot — great for
 * a headline sponsor who wants real visibility.
 * Pricing idea: £2,000–£5,000 / season for exclusive placement.
 */
export function SectionTakeover() {
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
        gap: 32,
      }}
    >
      <div style={{ color: "#C5D2F5", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
        ↑ Events section above
      </div>

      {/* The ad unit */}
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: "linear-gradient(135deg, #0E1B2C 0%, #1C2E52 60%, #0E1B2C 100%)",
          border: "1px solid #3A52A6",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Decorative top accent line */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #19C3B0, #4169E1, transparent)", width: "100%" }} />

        <div style={{ padding: "36px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
          {/* Left — sponsor identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "1 1 340px" }}>
            {/* "Presented by" label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 1, background: "#19C3B0" }} />
              <span style={{ color: "#19C3B0", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                Season headline sponsor
              </span>
            </div>

            {/* Logo row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: "#19C3B022",
                  border: "1px solid #19C3B066",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#19C3B0",
                }}
              >
                Q
              </div>
              <div>
                <div style={{ color: "#FAFAFA", fontWeight: 800, fontSize: 22, letterSpacing: "-0.4px" }}>QuantEdge</div>
                <div style={{ color: "#C5D2F5", fontSize: 13, marginTop: 2 }}>Quantitative investment management</div>
              </div>
            </div>

            {/* Tagline */}
            <p style={{ color: "#C5D2F5", fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
              "We back the City's padel community because great networks build great firms. P³ brings exactly that."
            </p>
            <p style={{ color: "#3A52A6", fontSize: 12, margin: 0, fontStyle: "italic" }}>— James Whitmore, Managing Director</p>
          </div>

          {/* Right — CTA + metrics */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: "0 0 260px", alignItems: "flex-start" }}>
            {/* Metrics */}
            <div style={{ display: "flex", gap: 24 }}>
              {[["350+", "members"], ["5", "events"]].map(([val, lbl]) => (
                <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "#19C3B0", fontWeight: 800, fontSize: 28, letterSpacing: "-0.5px" }}>{val}</span>
                  <span style={{ color: "#C5D2F5", fontSize: 12 }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <div
                style={{
                  background: "#19C3B0",
                  borderRadius: 10,
                  padding: "13px 24px",
                  textAlign: "center",
                  color: "#0E1B2C",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  letterSpacing: "-0.2px",
                }}
              >
                Visit QuantEdge →
              </div>
              <div
                style={{
                  background: "transparent",
                  border: "1px solid #3A52A6",
                  borderRadius: 10,
                  padding: "11px 24px",
                  textAlign: "center",
                  color: "#C5D2F5",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Careers at QuantEdge
              </div>
            </div>

            <span style={{ color: "#3A52A6", fontSize: 10, textAlign: "center", width: "100%" }}>
              Sponsored · quantedge.co.uk
            </span>
          </div>
        </div>

        {/* Bottom ticker strip */}
        <div
          style={{
            background: "#0A1422",
            borderTop: "1px solid #1C2E52",
            padding: "10px 48px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <span style={{ color: "#3A52A6", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Exclusive partner
          </span>
          <div style={{ height: 1, flex: 1, background: "#1C2E52" }} />
          <span style={{ color: "#3A52A6", fontSize: 11, whiteSpace: "nowrap" }}>
            Appearing on all 5 event communications · 2026 season
          </span>
        </div>
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
          <strong style={{ color: "#FAFAFA" }}>Section Takeover</strong> — sits between Events and Founders sections. Most visible slot; ideal for one exclusive headline sponsor per season. Includes quote, CTA, and career link. Pairs with email mentions + social shoutouts in a package.
        </span>
      </div>

      <div style={{ color: "#C5D2F5", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
        ↓ Founders section below
      </div>
    </div>
  );
}
