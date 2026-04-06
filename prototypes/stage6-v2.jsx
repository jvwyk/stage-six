import { useState, useEffect, useCallback, useRef } from "react";

// ─── FONTS ───
const fl = document.createElement("link");
fl.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap";
fl.rel = "stylesheet";
document.head.appendChild(fl);

// ─── TOKENS ───
const T = {
  bg: "#08080a", surface: "#101014", raised: "#18181e", hover: "#222230",
  border: "#25252e", borderLit: "#35353e",
  text: "#e8e5e0", muted: "#78756e", dim: "#48453e",
  gold: "#d4a843", goldBright: "#f0c95c", goldDim: "#8a6d2b",
  red: "#e63946", redDim: "#6b1620", redGlow: "rgba(230,57,70,0.12)",
  green: "#2ec47a", greenDim: "#134d30",
  amber: "#e8943a", blue: "#4a8fe7", cyan: "#22b8cf", purple: "#9d6dea",
  font: { display: "'Bebas Neue',sans-serif", serif: "'Playfair Display',serif", mono: "'JetBrains Mono',monospace", body: "'Outfit',sans-serif" },
};

// ─── GLOBAL CSS ───
const gs = document.createElement("style");
gs.textContent = `
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{background:${T.bg};overflow-x:hidden}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.borderLit};border-radius:2px}
  @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes slideSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
  @keyframes countUp{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
  @keyframes flicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:.2}94%{opacity:1}96%{opacity:.4}97%{opacity:1}}
  @keyframes scanDrop{0%{top:-4px}100%{top:100%}}
  @keyframes goldPulse{0%,100%{box-shadow:0 0 20px ${T.gold}20}50%{box-shadow:0 0 30px ${T.gold}35}}
  @keyframes newsFlash{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes typewriter{from{width:0}to{width:100%}}
  @keyframes stampIn{0%{transform:rotate(-15deg) scale(2.5);opacity:0}60%{transform:rotate(3deg) scale(.95);opacity:1}100%{transform:rotate(-5deg) scale(1);opacity:1}}
`;
document.head.appendChild(gs);

const d = (i, b = 50) => ({ animation: `fadeUp .4s ease ${i * b}ms both` });
const fmtM = v => "R" + (v >= 1000 ? (v / 1000).toFixed(1) + "B" : v + "M");
const fmtMW = v => v.toLocaleString() + " MW";

// ─── DATA ───
const REGIONS = [
  { name: "Johannesburg", tier: 1, demand: 4200, supply: 3800, rage: 62, icon: "🏙️" },
  { name: "Cape Town", tier: 1, demand: 3100, supply: 2900, rage: 45, icon: "⛰️" },
  { name: "Durban", tier: 2, demand: 2200, supply: 1900, rage: 71, icon: "🌊" },
  { name: "Ekurhuleni", tier: 2, demand: 1800, supply: 1600, rage: 55, icon: "🏭" },
  { name: "Polokwane", tier: 3, demand: 900, supply: 820, rage: 30, icon: "🌿" },
];
const PLANTS = [
  { name: "Medupi", type: "Coal", cap: 4800, out: 3200, rel: 58, status: "Derated", color: T.amber },
  { name: "Kusile", type: "Coal", cap: 4800, out: 2100, rel: 44, status: "Derated", color: T.amber },
  { name: "Koeberg", type: "Nuclear", cap: 1860, out: 1860, rel: 92, status: "Online", color: T.cyan },
  { name: "Ankerlig", type: "Diesel", cap: 1350, out: 0, rel: 88, status: "Standby", color: T.purple },
  { name: "Sere Wind", type: "Renewable", cap: 100, out: 68, rel: 70, status: "Online", color: T.green },
  { name: "Cahora Bassa", type: "Import", cap: 1200, out: 1100, rel: 80, status: "Online", color: T.blue },
];
const OPPORTUNITIES = [
  { title: "Diesel Markup", desc: "Approve emergency diesel at inflated rate. Supplier kicks back 22%.", risk: "low", skim: 180, heat: 8, icon: "⛽", tag: "KICKBACK", gridEffect: "+1,350 MW for 2 days", color: T.purple },
  { title: "Coal Shipment 'Discount'", desc: "Broker offering coal at 3× market rate. Your cut: R80M. Or source properly for R0.", risk: "med", skim: 80, heat: 12, icon: "🚂", tag: "MARKUP", gridEffect: "+600 MW capacity restored", color: T.amber },
  { title: "Foreign Grid Access Sale", desc: "Mozambique investor wants guaranteed export capacity. Massive payout, but you lose 500MW.", risk: "high", skim: 420, heat: 22, icon: "🌍", tag: "SELL-OFF", gridEffect: "−500 MW permanent", color: T.red },
  { title: "Maintenance Contract", desc: "BEE contractor quote is 4× market rate. The minister is 'expecting' this one.", risk: "med", skim: 240, heat: 18, icon: "🔧", tag: "TENDER", gridEffect: "Medupi repaired in 5 days", color: T.gold },
];
const CORRUPTION_RECEIPT = [
  { day: 3, action: "Diesel emergency markup", skim: 180, heat: 8 },
  { day: 5, action: "Coal shipment kickback", skim: 80, heat: 12 },
  { day: 8, action: "Maintenance tender skim", skim: 240, heat: 18 },
  { day: 11, action: "Foreign grid access sold", skim: 420, heat: 22 },
  { day: 14, action: "Second diesel markup", skim: 195, heat: 10 },
  { day: 18, action: "Generator rental fraud", skim: 310, heat: 15 },
  { day: 21, action: "Emergency fund diversion", skim: 560, heat: 28 },
];

// ─── SHARED ───
function Bar({ value, max = 100, color = T.gold, h = 5, glow, label }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height: h, background: T.border, borderRadius: h / 2, overflow: "hidden", boxShadow: glow ? `0 0 10px ${color}25` : "none" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: h / 2, transition: "width .5s ease" }} />
      </div>
      {label && <span style={{ fontFamily: T.font.mono, fontSize: 10, color, fontWeight: 700, minWidth: 30, textAlign: "right" }}>{label}</span>}
    </div>
  );
}
function Pill({ children, color = T.muted, pulse: p }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: color + "15", border: `1px solid ${color}30`, borderRadius: 4, fontFamily: T.font.mono, fontSize: 9, fontWeight: 700, color, letterSpacing: ".05em", textTransform: "uppercase" }}>
      {p && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "pulse 1.2s infinite" }} />}
      {children}
    </span>
  );
}
function Card({ children, style, onClick, glow }) {
  return (
    <div onClick={onClick} style={{ background: T.surface, border: `1px solid ${glow || T.border}`, borderRadius: 12, padding: 16, ...(onClick ? { cursor: "pointer" } : {}), ...style }}>
      {children}
    </div>
  );
}
function Section({ children, icon, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontFamily: T.font.mono, fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: ".1em", textTransform: "uppercase" }}>{icon && <span style={{ marginRight: 5 }}>{icon}</span>}{children}</span>
      {action}
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: TITLE
// ═════════════════════════════════════
function TitleScreen({ onStart }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 150); }, []);
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: `radial-gradient(ellipse at 50% 25%, ${T.goldDim}30 0%, ${T.bg} 55%)`, position: "relative", overflow: "hidden" }}>
      {/* Grid overlay */}
      <div style={{ position: "absolute", inset: 0, opacity: .03, backgroundImage: `linear-gradient(${T.gold} 1px,transparent 1px),linear-gradient(90deg,${T.gold} 1px,transparent 1px)`, backgroundSize: "32px 32px", pointerEvents: "none" }} />
      {/* Scanline */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(transparent,transparent 2px,rgba(0,0,0,.06) 2px,rgba(0,0,0,.06) 4px)" }} />

      <div style={{ textAlign: "center", position: "relative", zIndex: 1, opacity: show ? 1 : 0, transform: show ? "none" : "translateY(40px)", transition: "all .9s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ fontSize: 44, marginBottom: 4, animation: "flicker 4s infinite" }}>⚡</div>
        <h1 style={{ fontFamily: T.font.display, fontSize: "clamp(76px,20vw,130px)", color: T.text, lineHeight: .85, letterSpacing: ".05em", textShadow: `0 0 80px ${T.gold}25` }}>STAGE 6</h1>
        <p style={{ fontFamily: T.font.mono, fontSize: 12, color: T.gold, letterSpacing: ".35em", textTransform: "uppercase", marginTop: 6, fontWeight: 500 }}>You're in charge now</p>

        <div style={{ margin: "28px auto", maxWidth: 300, padding: "16px 20px", background: T.surface, border: `1px solid ${T.gold}20`, borderRadius: 10 }}>
          <p style={{ fontFamily: T.font.body, fontSize: 14, color: T.muted, lineHeight: 1.7 }}>
            The grid is failing. The country needs you.<br />
            <span style={{ color: T.gold, fontWeight: 600 }}>But you didn't take this job to be a hero.</span>
          </p>
          <div style={{ marginTop: 12, padding: "8px 12px", background: T.raised, borderRadius: 6, fontFamily: T.font.mono, fontSize: 11, color: T.dim, textAlign: "left", lineHeight: 1.8 }}>
            <span style={{ color: T.green }}>💰 Skim contracts</span><br />
            <span style={{ color: T.amber }}>🔥 Manage your Heat</span><br />
            <span style={{ color: T.red }}>📰 Don't get caught</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, justifyContent: "center", fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginBottom: 28 }}>
          <span>30 DAYS</span><span style={{ color: T.border }}>|</span><span>5 REGIONS</span><span style={{ color: T.border }}>|</span><span>∞ GREED</span>
        </div>

        <button onClick={onStart} style={{ padding: "16px 56px", background: `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: ".06em", textTransform: "uppercase", boxShadow: `0 0 40px ${T.gold}30, 0 4px 20px rgba(0,0,0,.5)` }}>
          Take Control
        </button>
        <div style={{ marginTop: 10, fontFamily: T.font.mono, fontSize: 10, color: T.dim }}>How much can you steal before it all collapses?</div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 16px", background: T.red + "10", borderTop: `1px solid ${T.red}20`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ animation: "blink 1s infinite", color: T.red, fontSize: 8 }}>●</span>
        <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.red, letterSpacing: ".12em" }}>NATIONAL GRID STATUS: CRITICAL — STAGE 4 LOAD SHEDDING IN EFFECT</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: MAIN DASHBOARD
// ═════════════════════════════════════
function DashboardScreen({ onDeal, onNextDay, onPlants, onGameOver }) {
  const day = 14;
  const bag = 1985;
  const heat = 58;
  const rage = 62;
  const budget = 4200;
  const stage = 4;
  const totalS = REGIONS.reduce((a, r) => a + r.supply, 0);
  const totalD = REGIONS.reduce((a, r) => a + r.demand, 0);
  const deficit = totalD - totalS;

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: T.font.body, display: "flex", flexDirection: "column" }}>
      {/* ── TOP BAR ── */}
      <div style={{ position: "sticky", top: 36, zIndex: 50, background: T.surface + "f0", backdropFilter: "blur(14px)", borderBottom: `1px solid ${T.border}`, padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: T.font.display, fontSize: 20, color: T.text, letterSpacing: ".04em" }}>STAGE 6</span>
            <Pill color={T.muted}>DAY {day}/30</Pill>
          </div>
          <div style={{ fontFamily: T.font.mono, fontSize: 11, color: T.green }}>{fmtM(budget)} BUDGET</div>
        </div>

        {/* THE BAG — Personal Wealth */}
        <div style={{ marginTop: 10, padding: "10px 14px", background: `linear-gradient(135deg, ${T.gold}10, ${T.goldDim}08)`, border: `1px solid ${T.gold}25`, borderRadius: 8, animation: "goldPulse 3s infinite" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.gold, letterSpacing: ".12em", fontWeight: 700 }}>💰 YOUR OFFSHORE ACCOUNT</div>
              <div style={{ fontFamily: T.font.serif, fontSize: 28, color: T.goldBright, fontWeight: 900, letterSpacing: ".02em", marginTop: 2 }}>R{(bag / 1000).toFixed(1)}B</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim }}>LAST SKIM</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 14, color: T.green, fontWeight: 700 }}>+R310M</div>
            </div>
          </div>
        </div>

        {/* HEAT + RAGE bars */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: T.font.mono, fontSize: 8, color: T.amber, letterSpacing: ".1em", fontWeight: 700 }}>🔥 HEAT</span>
              <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.amber, fontWeight: 700 }}>{heat}%</span>
            </div>
            <Bar value={heat} color={heat > 70 ? T.red : T.amber} h={5} glow />
            <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.dim, marginTop: 2 }}>{heat > 70 ? "⚠ INVESTIGATION IMMINENT" : heat > 45 ? "JOURNALISTS SNIFFING" : "UNDER THE RADAR"}</div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: T.font.mono, fontSize: 8, color: T.red, letterSpacing: ".1em", fontWeight: 700 }}>😡 RAGE</span>
              <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.red, fontWeight: 700 }}>{rage}%</span>
            </div>
            <Bar value={rage} color={T.red} h={5} glow />
            <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.dim, marginTop: 2 }}>PROTESTS IN DURBAN</div>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* SUPPLY/DEMAND + STAGE */}
        <Card style={d(0)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.muted, letterSpacing: ".1em" }}>SUPPLY</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 20, fontWeight: 800, color: T.green }}>{fmtMW(totalS)}</div>
            </div>
            <div style={{ padding: "8px 14px", background: stage >= 6 ? T.red : stage >= 4 ? T.amber : T.green, borderRadius: 8 }}>
              <div style={{ fontFamily: T.font.display, fontSize: 28, color: T.bg, letterSpacing: ".04em", lineHeight: 1 }}>S{stage}</div>
            </div>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.muted, letterSpacing: ".1em" }}>DEMAND</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 20, fontWeight: 800, color: T.red }}>{fmtMW(totalD)}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, textAlign: "center", fontFamily: T.font.mono, fontSize: 10, color: T.red }}>DEFICIT: {fmtMW(deficit)} • SHEDDING {stage * 5}%</div>
        </Card>

        {/* ──── TODAY'S OPPORTUNITIES (The Drug Wars Moment) ──── */}
        <div style={d(1)}>
          <Section icon="💼">Today's Opportunities</Section>
          <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginBottom: 10, marginTop: -4 }}>
            Risk it for the biscuit — or play it clean for R0.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {OPPORTUNITIES.slice(0, 3).map((op, i) => {
              const riskColors = { low: T.green, med: T.amber, high: T.red };
              return (
                <div key={i} onClick={onDeal} style={{
                  padding: 14, background: T.raised, borderRadius: 10,
                  border: `1px solid ${op.color}20`, cursor: "pointer",
                  transition: "border-color .15s",
                  ...d(i + 2),
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{op.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{op.title}</div>
                        <Pill color={riskColors[op.risk]}>{op.risk} risk</Pill>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: T.font.serif, fontSize: 20, fontWeight: 900, color: T.goldBright }}>+{fmtM(op.skim)}</div>
                      <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.amber }}>+{op.heat} heat</div>
                    </div>
                  </div>
                  <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 6 }}>{op.desc}</p>
                  <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, padding: "4px 8px", background: T.surface, borderRadius: 4, display: "inline-block" }}>
                    Grid: {op.gridEffect}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* REGIONS */}
        <Card style={d(5)}>
          <Section icon="🌍">Regions</Section>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {REGIONS.map((r, i) => {
              const pct = (r.supply / r.demand) * 100;
              const rc = r.rage > 65 ? T.red : r.rage > 40 ? T.amber : T.green;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.raised, borderRadius: 8, border: r.rage > 65 ? `1px solid ${T.red}18` : "1px solid transparent" }}>
                  <span style={{ fontSize: 16, width: 24 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim }}>{fmtMW(r.supply)}/{fmtMW(r.demand)}</span>
                    </div>
                    <Bar value={pct} color={pct < 85 ? T.red : pct < 95 ? T.amber : T.green} h={3} />
                  </div>
                  <div style={{ textAlign: "center", minWidth: 32 }}>
                    <div style={{ fontFamily: T.font.mono, fontSize: 13, fontWeight: 800, color: rc }}>{r.rage}</div>
                    <div style={{ fontFamily: T.font.mono, fontSize: 7, color: T.dim }}>RAGE</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* PLANTS MINI */}
        <Card style={d(6)} onClick={onPlants}>
          <Section icon="🏭" action={<span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.gold }}>MANAGE →</span>}>Fleet</Section>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {PLANTS.map((p, i) => (
              <div key={i} style={{ padding: "5px 8px", background: T.raised, borderRadius: 5, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.status === "Online" ? T.green : p.status === "Derated" ? T.amber : T.muted }} />
                <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.muted }}>{p.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* QUICK ACTIONS */}
        <Card style={d(7)}>
          <Section icon="⚙️">Grid Actions</Section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Diesel", icon: "⛽", desc: "R180M", color: T.purple },
              { label: "Maintain", icon: "🔧", desc: "−Capacity", color: T.blue },
              { label: "Import", icon: "🔌", desc: "R90M", color: T.cyan },
            ].map((a, i) => (
              <button key={i} style={{ padding: "12px 8px", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                <div style={{ fontFamily: T.font.body, fontSize: 11, fontWeight: 600, color: a.color }}>{a.label}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim, marginTop: 2 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <div style={{ height: 90 }} />
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "0 16px 0", paddingBottom: "max(12px,env(safe-area-inset-bottom))", background: `linear-gradient(transparent 0%, ${T.bg} 40%)` }}>
        <button onClick={onNextDay} style={{ width: "100%", padding: "14px 20px", background: `linear-gradient(135deg,${T.gold},${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: ".03em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span>End Day {day}</span>
          <span style={{ fontSize: 12, opacity: .7 }}>→</span>
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: DEAL MODAL (Drug Wars "Buy" moment)
// ═════════════════════════════════════
function DealModal({ onClose }) {
  const op = OPPORTUNITIES[3]; // Maintenance tender
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", animation: "fadeIn .15s ease" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: T.surface, borderRadius: "18px 18px 0 0", padding: "20px 20px", paddingBottom: "max(20px,env(safe-area-inset-bottom))", border: `1px solid ${T.gold}20`, borderBottom: "none", animation: "slideSheet .3s ease" }}>
        <div style={{ width: 36, height: 4, background: T.border, borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>{op.icon}</div>
          <Pill color={T.gold}>{op.tag}</Pill>
          <h2 style={{ fontFamily: T.font.display, fontSize: 30, color: T.text, letterSpacing: ".04em", marginTop: 6 }}>{op.title.toUpperCase()}</h2>
          <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 320, margin: "6px auto 0" }}>{op.desc}</p>
        </div>

        {/* Risk/Reward Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 14, background: `${T.gold}08`, border: `1px solid ${T.gold}20`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.gold, letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>YOUR CUT</div>
            <div style={{ fontFamily: T.font.serif, fontSize: 32, color: T.goldBright, fontWeight: 900 }}>+{fmtM(op.skim)}</div>
          </div>
          <div style={{ padding: 14, background: T.redGlow, border: `1px solid ${T.red}20`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.amber, letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>HEAT ADDED</div>
            <div style={{ fontFamily: T.font.serif, fontSize: 32, color: T.amber, fontWeight: 900 }}>+{op.heat}%</div>
          </div>
        </div>

        {/* Grid Effect */}
        <div style={{ padding: 10, background: T.raised, borderRadius: 8, marginBottom: 16, textAlign: "center" }}>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.muted }}>GRID EFFECT: </span>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.cyan, fontWeight: 700 }}>{op.gridEffect}</span>
        </div>

        {/* Heat Warning */}
        <div style={{ padding: "8px 12px", background: T.amber + "10", border: `1px solid ${T.amber}20`, borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.amber, lineHeight: 1.5 }}>
            Your heat is at 58%. This deal pushes you to 76%. <span style={{ color: T.red, fontWeight: 700 }}>Investigation threshold: 80%.</span>
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "14px 20px", background: `linear-gradient(135deg,${T.gold},${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
            Take the Deal — +R240M 💰
          </button>
          <button onClick={onClose} style={{ padding: "14px 20px", background: T.raised, color: T.text, border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Award Clean Contract — R0 profit
          </button>
          <button onClick={onClose} style={{ padding: "12px 20px", background: "transparent", color: T.dim, border: "none", fontFamily: T.font.mono, fontSize: 11, cursor: "pointer" }}>
            Skip — no contract awarded
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: DAY SUMMARY
// ═════════════════════════════════════
function DaySummaryScreen({ onContinue }) {
  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: T.font.body, padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", padding: "28px 0 20px", ...d(0) }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.muted, letterSpacing: ".15em" }}>END OF</div>
        <div style={{ fontFamily: T.font.display, fontSize: 52, color: T.text, letterSpacing: ".04em" }}>DAY 14</div>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim }}>16 DAYS REMAINING</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Key Metrics */}
        <Card style={d(1)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            {[
              { label: "SKIMMED", val: "+R310M", color: T.goldBright, icon: "💰" },
              { label: "AVG STAGE", val: "4.2", color: T.amber, icon: "⚡" },
              { label: "HEAT", val: "+15%", color: T.red, icon: "🔥" },
              { label: "RAGE", val: "+8%", color: T.red, icon: "😡" },
            ].map((s, i) => (
              <div key={i} style={d(i + 2)}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 7, color: T.dim, letterSpacing: ".08em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* What Happened */}
        <Card style={d(3)}>
          <Section icon="📰">What Happened</Section>
          {[
            { text: "You awarded the Medupi maintenance tender and pocketed R240M", icon: "💰", color: T.gold },
            { text: "A journalist from Daily Maverick started asking questions about procurement", icon: "🔥", color: T.amber },
            { text: "Durban protests intensified — riot police deployed", icon: "📢", color: T.red },
            { text: "Koeberg running stable — small mercy", icon: "✅", color: T.green },
          ].map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${T.border}` : "none", ...d(i + 4) }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{ev.icon}</span>
              <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{ev.text}</span>
            </div>
          ))}
        </Card>

        {/* The Missed Opportunity Hook */}
        <Card style={{ ...d(5), border: `1px solid ${T.gold}20`, background: `linear-gradient(135deg, ${T.gold}06, transparent)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>👀</span>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.gold, letterSpacing: ".1em", fontWeight: 700 }}>TOMORROW'S OPPORTUNITY</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 2 }}>Emergency Fund Diversion</div>
              <div style={{ fontFamily: T.font.serif, fontSize: 20, color: T.goldBright, fontWeight: 900 }}>Up to R560M</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginTop: 2 }}>But your heat is at 73%...</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ padding: "16px 0", paddingBottom: "max(16px,env(safe-area-inset-bottom))", ...d(6) }}>
        <button onClick={onContinue} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.gold},${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          One More Day → Day 15
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: BREAKING NEWS (Heat Game Over)
// ═════════════════════════════════════
function BreakingNewsScreen({ onReceipt }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Red flash overlay */}
      <div style={{ position: "absolute", inset: 0, background: T.red, opacity: phase === 0 ? 0.15 : 0, transition: "opacity .5s", pointerEvents: "none" }} />

      {/* Breaking news banner */}
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, padding: "12px 0", background: T.red, overflow: "hidden", opacity: phase >= 1 ? 1 : 0, transition: "opacity .3s" }}>
        <div style={{ fontFamily: T.font.display, fontSize: 18, color: "#fff", letterSpacing: ".15em", textAlign: "center", animation: phase >= 1 ? "shake .3s ease" : "none" }}>
          ⚡ BREAKING NEWS ⚡
        </div>
      </div>

      <div style={{ textAlign: "center", maxWidth: 340, position: "relative", zIndex: 1 }}>
        {/* Newspaper style */}
        <div style={{ opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "none" : "scale(.9)", transition: "all .5s ease" }}>
          <div style={{ fontFamily: T.font.serif, fontSize: 11, color: T.muted, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8 }}>The Daily Maverick</div>
          <h1 style={{ fontFamily: T.font.serif, fontSize: 32, color: T.text, lineHeight: 1.15, fontWeight: 900 }}>
            Grid Controller Arrested In R1.9B Corruption Scandal
          </h1>
        </div>

        <div style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "none" : "translateY(10px)", transition: "all .5s ease .2s" }}>
          <p style={{ fontFamily: T.font.body, fontSize: 14, color: T.muted, lineHeight: 1.7, marginTop: 16 }}>
            Hawks officials confirmed the arrest following a 6-month investigation into inflated procurement contracts and misappropriated emergency funds at the national utility.
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.dim, lineHeight: 1.7, marginTop: 10, fontStyle: "italic" }}>
            "The scale of theft is staggering," said the lead investigator. "While South Africans sat in the dark, billions were being siphoned into offshore accounts."
          </p>
        </div>

        {/* BUSTED stamp */}
        <div style={{ opacity: phase >= 3 ? 1 : 0, animation: phase >= 3 ? "stampIn .4s ease" : "none", marginTop: 24 }}>
          <div style={{ display: "inline-block", padding: "12px 32px", border: `4px solid ${T.red}`, borderRadius: 8, transform: "rotate(-5deg)" }}>
            <span style={{ fontFamily: T.font.display, fontSize: 48, color: T.red, letterSpacing: ".08em" }}>BUSTED</span>
          </div>
        </div>

        {/* Seized */}
        <div style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity .5s ease .3s", marginTop: 20 }}>
          <div style={{ padding: 14, background: T.raised, border: `1px solid ${T.red}25`, borderRadius: 10 }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.red, letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>ASSETS SEIZED</div>
            <div style={{ fontFamily: T.font.serif, fontSize: 28, fontWeight: 900, color: T.red, textDecoration: "line-through", textDecorationColor: T.red }}>R1.985B</div>
            <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginTop: 4 }}>All offshore accounts frozen</div>
          </div>
        </div>

        <div style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity .5s ease .5s", marginTop: 20 }}>
          <button onClick={onReceipt} style={{ width: "100%", padding: 14, background: T.raised, color: T.text, border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            View Your Corruption Receipt →
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: GAME OVER — CORRUPTION RECEIPT
// ═════════════════════════════════════
function GameOverScreen({ onRestart, onTitle }) {
  const totalSkim = CORRUPTION_RECEIPT.reduce((a, c) => a + c.skim, 0);
  const [reveal, setReveal] = useState(false);
  useEffect(() => { setTimeout(() => setReveal(true), 200); }, []);

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: T.font.body, padding: 20, display: "flex", flexDirection: "column" }}>
      {/* Title */}
      <div style={{ textAlign: "center", padding: "20px 0 16px", ...d(0) }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.muted, letterSpacing: ".15em" }}>GAME OVER — DAY 22/30</div>
        <div style={{ fontFamily: T.font.display, fontSize: 20, color: T.red, letterSpacing: ".04em", marginTop: 4 }}>ARRESTED FOR CORRUPTION</div>
      </div>

      {/* Player Title Card */}
      <Card style={{ ...d(1), textAlign: "center", border: `1px solid ${T.gold}25`, background: `linear-gradient(180deg, ${T.gold}08, transparent)` }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.dim, letterSpacing: ".12em" }}>YOUR TITLE</div>
        <div style={{ fontFamily: T.font.display, fontSize: 36, color: T.gold, letterSpacing: ".05em", marginTop: 2 }}>TENDERPRENEUR</div>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.muted, marginTop: 4 }}>Lasted 22 days • Stole from 7 contracts</div>
      </Card>

      {/* ── THE RECEIPT ── */}
      <Card style={{ ...d(2), marginTop: 12, background: "#0d0d10", border: `1px dashed ${T.border}`, fontFamily: T.font.mono, padding: "16px 14px" }}>
        <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 10, borderBottom: `1px dashed ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.dim, letterSpacing: ".15em" }}>═══ CORRUPTION RECEIPT ═══</div>
          <div style={{ fontSize: 8, color: T.dim, marginTop: 4 }}>NATIONAL PROSECUTING AUTHORITY</div>
          <div style={{ fontSize: 8, color: T.dim }}>EXHIBIT A — STATE vs. PLAYER</div>
        </div>

        {/* Line items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.dim, paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
            <span>DAY</span><span style={{ flex: 1, textAlign: "left", marginLeft: 12 }}>OFFENCE</span><span>SKIM</span><span style={{ marginLeft: 8 }}>HEAT</span>
          </div>
          {CORRUPTION_RECEIPT.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, padding: "5px 0", borderBottom: `1px solid ${T.border}08`, animation: reveal ? `fadeUp .3s ease ${(i + 3) * 80}ms both` : "none" }}>
              <span style={{ color: T.dim, minWidth: 24 }}>{item.day}</span>
              <span style={{ flex: 1, textAlign: "left", marginLeft: 12 }}>{item.action}</span>
              <span style={{ color: T.goldBright, fontWeight: 700 }}>+{fmtM(item.skim)}</span>
              <span style={{ color: T.amber, marginLeft: 8, minWidth: 30, textAlign: "right" }}>+{item.heat}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: T.muted }}>TOTAL STOLEN</span>
          <span style={{ fontSize: 20, color: T.goldBright, fontWeight: 800 }}>{fmtM(totalSkim)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: T.red }}>STATUS</span>
          <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>ALL ASSETS SEIZED</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 8, color: T.dim }}>════════════════════════</div>
      </Card>

      {/* Score */}
      <Card style={{ ...d(3), marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Grid Stability", value: 28, color: T.red },
            { label: "Personal Wealth", value: 85, color: T.gold },
            { label: "Public Trust", value: 12, color: T.amber },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.muted }}>{s.label}</span>
                <span style={{ fontFamily: T.font.mono, fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}/100</span>
              </div>
              <Bar value={s.value} color={s.color} h={5} />
            </div>
          ))}
          <div style={{ textAlign: "center", padding: 12, background: T.raised, borderRadius: 8, marginTop: 4 }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.dim, letterSpacing: ".1em" }}>FINAL SCORE</div>
            <div style={{ fontFamily: T.font.display, fontSize: 48, color: T.text }}>{38}</div>
            <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim }}>/ 100</div>
          </div>
        </div>
      </Card>

      {/* Share Card */}
      <Card style={{ ...d(4), marginTop: 12, background: T.raised, textAlign: "center" }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim, letterSpacing: ".1em", marginBottom: 8 }}>SHARE YOUR CRIMINAL RECORD</div>
        <div style={{ padding: 14, background: T.surface, borderRadius: 8, fontFamily: T.font.mono, fontSize: 11, color: T.muted, lineHeight: 1.8, textAlign: "left" }}>
          ⚡ STAGE 6 — Day 22/30<br />
          💰 Stole: R1.985B across 7 deals<br />
          🔥 Title: Tenderpreneur<br />
          📰 Busted by Daily Maverick<br />
          📊 Score: 38/100<br />
          <br />
          <span style={{ color: T.gold }}>Think you'd last longer?</span>
        </div>
        <button style={{ marginTop: 10, padding: "10px 24px", background: T.gold, color: T.bg, border: "none", borderRadius: 8, fontFamily: T.font.body, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Share 📤
        </button>
      </Card>

      {/* What you missed */}
      <Card style={{ ...d(5), marginTop: 12, border: `1px solid ${T.gold}15` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>😤</span>
          <div>
            <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.gold, letterSpacing: ".08em", fontWeight: 700 }}>YOU WERE 8 DAYS FROM...</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 2 }}>The R2B emergency fund — biggest score in the game</div>
            <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginTop: 2 }}>If only you'd kept your heat below 80%...</div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, paddingBottom: "max(16px,env(safe-area-inset-bottom))", ...d(6) }}>
        <button onClick={onRestart} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.gold},${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Try Again — Beat R1.985B
        </button>
        <button onClick={onTitle} style={{ width: "100%", padding: 13, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.font.body, fontSize: 13, cursor: "pointer" }}>
          Back to Title
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// SCREEN: DAILY CHALLENGE
// ═════════════════════════════════════
function DailyChallengeScreen({ onPlay, onBack }) {
  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: T.font.body, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ textAlign: "center", ...d(0) }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.gold, letterSpacing: ".2em", fontWeight: 700 }}>⚡ DAILY CHALLENGE</div>
        <div style={{ fontFamily: T.font.display, fontSize: 42, color: T.text, letterSpacing: ".04em", marginTop: 4 }}>APRIL 6, 2026</div>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.dim, marginTop: 4 }}>Same seed for everyone. 7 days. One shot.</div>
      </div>

      <Card style={{ ...d(1), marginTop: 24 }}>
        <Section icon="📋">Today's Scenario</Section>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Starting Condition", value: "Koeberg offline for maintenance", icon: "☢️" },
            { label: "Budget", value: "R2.1B — tight", icon: "💸" },
            { label: "Weather", value: "Cold front Day 3-5", icon: "🌧️" },
            { label: "Political Pressure", value: "Elections in 2 weeks", icon: "🗳️" },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, ...d(i + 2) }}>
              <span style={{ fontSize: 18, width: 28 }}>{c.icon}</span>
              <div>
                <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.dim }}>{c.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Leaderboard Preview */}
      <Card style={{ ...d(3), marginTop: 12 }}>
        <Section icon="🏆">Today's Leaderboard</Section>
        {[
          { name: "@grid_savior_za", title: "Grid Savior", score: 91, bag: "R0", color: T.green },
          { name: "@eskom_enjoyer", title: "Opportunist", score: 74, bag: "R820M", color: T.amber },
          { name: "@tenderboss99", title: "Tenderpreneur", score: 52, bag: "R3.1B", color: T.gold },
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none", ...d(i + 4) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: T.font.display, fontSize: 22, color: i === 0 ? T.gold : T.dim, width: 24 }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                <Pill color={p.color}>{p.title}</Pill>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: T.font.mono, fontSize: 14, fontWeight: 700, color: T.text }}>{p.score}</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.gold }}>💰 {p.bag}</div>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, ...d(5) }}>
        <button onClick={onPlay} style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${T.gold},${T.goldBright})`, color: T.bg, border: "none", borderRadius: 10, fontFamily: T.font.body, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Play Today's Challenge
        </button>
        <button onClick={onBack} style={{ width: "100%", padding: 12, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: T.font.body, fontSize: 13, cursor: "pointer" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════
// NAV
// ═════════════════════════════════════
function Nav({ current, onChange }) {
  const screens = [
    { id: "title", label: "Title" },
    { id: "dashboard", label: "Dashboard" },
    { id: "deal", label: "Deal" },
    { id: "summary", label: "Day End" },
    { id: "news", label: "Busted!" },
    { id: "gameover", label: "Receipt" },
    { id: "daily", label: "Daily" },
  ];
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#6d28d9e0", backdropFilter: "blur(8px)", display: "flex", overflow: "auto", gap: 2, padding: "5px 6px" }}>
      <span style={{ fontFamily: T.font.mono, fontSize: 8, color: "#fff6", padding: "5px 6px", whiteSpace: "nowrap", alignSelf: "center" }}>SCREENS:</span>
      {screens.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)} style={{ padding: "5px 10px", borderRadius: 4, border: "none", background: current === s.id ? "#fff" : "rgba(255,255,255,.12)", color: current === s.id ? "#6d28d9" : "#fffc", fontFamily: T.font.mono, fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════
// APP
// ═════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("title");

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", position: "relative", minHeight: "100dvh" }}>
      <Nav current={screen} onChange={setScreen} />
      <div style={{ paddingTop: 34 }}>
        {screen === "title" && <TitleScreen onStart={() => setScreen("dashboard")} />}
        {screen === "dashboard" && <DashboardScreen onDeal={() => setScreen("deal")} onNextDay={() => setScreen("summary")} onPlants={() => {}} onGameOver={() => setScreen("gameover")} />}
        {screen === "deal" && <DealModal onClose={() => setScreen("dashboard")} />}
        {screen === "summary" && <DaySummaryScreen onContinue={() => setScreen("dashboard")} />}
        {screen === "news" && <BreakingNewsScreen onReceipt={() => setScreen("gameover")} />}
        {screen === "gameover" && <GameOverScreen onRestart={() => setScreen("dashboard")} onTitle={() => setScreen("title")} />}
        {screen === "daily" && <DailyChallengeScreen onPlay={() => setScreen("dashboard")} onBack={() => setScreen("title")} />}
      </div>
    </div>
  );
}
