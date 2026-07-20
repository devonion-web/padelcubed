/**
 * Option A — Partner Strip
 * A horizontal "Official Partners" logo bar that sits between the Hero and
 * Events sections. Subtle, non-intrusive — great entry-level ad unit.
 * Pricing idea: £500–£1,500 / season per slot.
 */
export function PartnerStrip() {
  const partners = [
    { name: "Corlytics", sector: "RegTech", initial: "C" },
    { name: "Finativ", sector: "FinTech", initial: "F" },
    { name: "GRC Edge", sector: "Compliance", initial: "G" },
    { name: "Apollo 1971", sector: "Investment", initial: "A" },
    { name: "Your Brand", sector: "→ Enquire", initial: "?", cta: true },
  ];

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
        gap: "40px",
      }}
    >
      {/* Context label */}
      <div style={{ color: "#C5D2F5", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>
        ↑ Hero section above
      </div>

      {/* The ad unit */}
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: "#0E1B2C",
          border: "1px solid #3A52A6",
          borderRadius: 16,
          padding: "28px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 16, background: "#19C3B0", borderRadius: 2 }} />
            <span style={{ color: "#C5D2F5", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Official Partners
            </span>
          </div>
          <span style={{ color: "#19C3B0", fontSize: 11, cursor: "pointer", borderBottom: "1px solid #19C3B0", paddingBottom: 1 }}>
            Become a partner →
          </span>
        </div>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto" }}>
          {partners.map((p) => (
            <div
              key={p.name}
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px",
                background: p.cta ? "transparent" : "#1C2E52",
                border: p.cta ? "1.5px dashed #3A52A6" : "1px solid #3A52A6",
                borderRadius: 12,
                minWidth: 140,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {/* Logo placeholder */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: p.cta ? "50%" : 10,
                  background: p.cta ? "#1C2E52" : "#19C3B022",
                  border: p.cta ? "2px dashed #3A52A6" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: p.cta ? 20 : 18,
                  color: p.cta ? "#3A52A6" : "#19C3B0",
                  fontWeight: 700,
                }}
              >
                {p.initial}
              </div>
              <span style={{ color: p.cta ? "#3A52A6" : "#FAFAFA", fontWeight: 600, fontSize: 13, textAlign: "center" }}>
                {p.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: p.cta ? "#19C3B0" : "#C5D2F5",
                  opacity: p.cta ? 1 : 0.7,
                  fontWeight: p.cta ? 600 : 400,
                }}
              >
                {p.sector}
              </span>
            </div>
          ))}
        </div>

        {/* Metrics row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            paddingTop: 12,
            borderTop: "1px solid #3A52A6",
            flexWrap: "wrap",
          }}
        >
          {[
            ["350+", "City professionals"],
            ["5", "events per season"],
            ["100%", "Americano format"],
            ["£500", "entry-level partner slot"],
          ].map(([val, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#19C3B0", fontWeight: 700, fontSize: 16 }}>{val}</span>
              <span style={{ color: "#C5D2F5", fontSize: 11, opacity: 0.8 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ color: "#C5D2F5", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>
        ↓ Events section below
      </div>
    </div>
  );
}
