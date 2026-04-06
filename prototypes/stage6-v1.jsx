import { useState, useEffect, useRef } from "react";

// ─── FONTS (loaded via <style> injection) ───
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// ─── DESIGN TOKENS ───
const T = {
  bg: "#0a0a0a",
  surface: "#111113",
  surfaceRaised: "#1a1a1e",
  surfaceHover: "#222228",
  border: "#2a2a30",
  borderBright: "#3a3a42",
  text: "#e8e6e3",
  textMuted: "#7a7872",
  textDim: "#4a4842",
  amber: "#f59e0b",
  amberDim: "#92600a",
  red: "#ef4444",
  redDim: "#7f1d1d",
  redGlow: "rgba(239,68,68,0.15)",
  green: "#22c55e",
  greenDim: "#14532d",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  orange: "#f97316",
  purple: "#a855f7",
  font: {
    display: "'Bebas Neue', sans-serif",
    mono: "'JetBrains Mono', monospace",
    body: "'Outfit', sans-serif",
  },
};

// ─── GLOBAL STYLES ───
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { background: ${T.bg}; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.borderBright}; border-radius: 2px; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes glitch {
    0% { transform: translate(0); }
    20% { transform: translate(-2px, 2px); }
    40% { transform: translate(-2px, -2px); }
    60% { transform: translate(2px, 2px); }
    80% { transform: translate(2px, -2px); }
    100% { transform: translate(0); }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes barFill { from { width: 0%; } }
  @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes flicker { 0%,100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.3; } 94% { opacity: 1; } 96% { opacity: 0.5; } 97% { opacity: 1; } }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes shakeX { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  @keyframes rotateIn { from { transform: rotate(-10deg) scale(0.9); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
`;
document.head.appendChild(globalStyle);

// ─── HELPERS ───
const delay = (i, base = 60) => ({ animation: `slideUp 0.4s ease ${i * base}ms both` });
const formatMW = (v) => v.toLocaleString() + " MW";
const formatMoney = (v) => "R" + (v / 1000).toFixed(1) + "B";

// ─── DATA ───
const REGIONS = [
  { name: "Johannesburg", tier: 1, demand: 4200, supply: 3800, rage: 62, icon: "🏙️" },
  { name: "Cape Town", tier: 1, demand: 3100, supply: 2900, rage: 45, icon: "⛰️" },
  { name: "Pretoria", tier: 1, demand: 2800, supply: 2650, rage: 38, icon: "🏛️" },
  { name: "Durban", tier: 2, demand: 2200, supply: 1900, rage: 71, icon: "🌊" },
  { name: "Ekurhuleni", tier: 2, demand: 1800, supply: 1600, rage: 55, icon: "🏭" },
];

const PLANTS = [
  { name: "Medupi", type: "Coal", capacity: 4800, output: 3200, reliability: 58, status: "Derated", color: T.orange },
  { name: "Kusile", type: "Coal", capacity: 4800, output: 2100, status: "Derated", reliability: 44, color: T.orange },
  { name: "Koeberg", type: "Nuclear", capacity: 1860, output: 1860, reliability: 92, status: "Online", color: T.cyan },
  { name: "Ankerlig", type: "Diesel", capacity: 1350, output: 0, reliability: 88, status: "Standby", color: T.purple },
  { name: "Sere Wind", type: "Renewable", capacity: 100, output: 68, reliability: 70, status: "Online", color: T.green },
  { name: "Cahora Bassa", type: "Import", capacity: 1200, output: 1100, reliability: 80, status: "Online", color: T.blue },
];

const EVENTS = [
  { title: "Boiler Tube Leak at Medupi", desc: "Unit 3 forced offline. Capacity reduced by 800MW for 3 days.", severity: "critical", icon: "💥" },
  { title: "Cold Front Approaching", desc: "Demand expected to spike 12% across Western Cape tomorrow.", severity: "warning", icon: "🌧️" },
];

// ─── SHARED COMPONENTS ───

function StatusPill({ status }) {
  const colors = {
    Online: T.green, Derated: T.amber, "Forced Outage": T.red,
    Maintenance: T.blue, Standby: T.textMuted,
  };
  const c = colors[status] || T.textMuted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      background: c + "18", border: `1px solid ${c}40`, borderRadius: 4,
      fontSize: 10, fontFamily: T.font.mono, fontWeight: 600, color: c,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c,
        animation: status === "Derated" || status === "Forced Outage" ? "pulse 1.5s infinite" : "none" }} />
      {status}
    </span>
  );
}

function MeterBar({ value, max = 100, color = T.amber, height = 6, showLabel, glow }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{
        flex: 1, height, background: T.border, borderRadius: height / 2, overflow: "hidden",
        boxShadow: glow ? `0 0 12px ${color}30` : "none",
      }}>
        <div style={{
          height: "100%", width: pct + "%", background: color,
          borderRadius: height / 2, transition: "width 0.6s ease",
          animation: "barFill 0.8s ease",
        }} />
      </div>
      {showLabel && (
        <span style={{ fontFamily: T.font.mono, fontSize: 11, color, fontWeight: 600, minWidth: 36, textAlign: "right" }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

function SectionHeader({ children, action, icon }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{
        fontFamily: T.font.mono, fontSize: 11, fontWeight: 700, color: T.textMuted,
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{children}
      </span>
      {action}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: 16, ...style,
      ...(onClick ? { cursor: "pointer" } : {}),
    }}>
      {children}
    </div>
  );
}

function ActionButton({ children, color = T.amber, variant = "filled", onClick, disabled, small, icon }) {
  const isFilled = variant === "filled";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: small ? "8px 14px" : "12px 20px",
      background: disabled ? T.surfaceRaised : isFilled ? color : "transparent",
      color: disabled ? T.textDim : isFilled ? T.bg : color,
      border: isFilled ? "none" : `1.5px solid ${disabled ? T.border : color}`,
      borderRadius: 8, fontFamily: T.font.body, fontSize: small ? 12 : 14,
      fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease", letterSpacing: "0.02em",
      opacity: disabled ? 0.5 : 1,
    }}>
      {icon && <span style={{ fontSize: small ? 14 : 16 }}>{icon}</span>}
      {children}
    </button>
  );
}

// ─── SCREEN: TITLE ───
function TitleScreen({ onStart }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      background: `radial-gradient(ellipse at 50% 30%, ${T.redDim}40 0%, ${T.bg} 60%)`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }} />

      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `linear-gradient(${T.amber} 1px, transparent 1px), linear-gradient(90deg, ${T.amber} 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      <div style={{
        textAlign: "center", position: "relative", zIndex: 1,
        opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Lightning icon */}
        <div style={{ fontSize: 48, marginBottom: 8, animation: "flicker 3s infinite" }}>⚡</div>

        {/* Title */}
        <h1 style={{
          fontFamily: T.font.display, fontSize: "clamp(72px, 18vw, 120px)",
          color: T.text, lineHeight: 0.9, letterSpacing: "0.04em",
          textShadow: `0 0 60px ${T.red}40, 0 2px 0 ${T.red}20`,
        }}>
          STAGE 6
        </h1>

        <p style={{
          fontFamily: T.font.mono, fontSize: 13, color: T.amber,
          letterSpacing: "0.3em", textTransform: "uppercase", marginTop: 8,
          fontWeight: 500,
        }}>
          You're in charge now
        </p>

        <p style={{
          fontFamily: T.font.body, fontSize: 15, color: T.textMuted,
          maxWidth: 320, margin: "24px auto 0", lineHeight: 1.6,
        }}>
          Manage a failing power grid. Balance stability, profit, and public rage.
          Every decision has a cost.
        </p>

        {/* Stats preview */}
        <div style={{
          display: "flex", gap: 24, justifyContent: "center", margin: "32px 0",
          fontFamily: T.font.mono, fontSize: 11, color: T.textDim,
        }}>
          <span>30 DAYS</span>
          <span style={{ color: T.border }}>|</span>
          <span>5 REGIONS</span>
          <span style={{ color: T.border }}>|</span>
          <span>6 PLANTS</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button onClick={onStart} style={{
            padding: "16px 48px", background: T.red, color: T.text,
            border: "none", borderRadius: 8, fontFamily: T.font.body,
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.06em", textTransform: "uppercase",
            boxShadow: `0 0 30px ${T.red}40, 0 4px 12px rgba(0,0,0,0.4)`,
            transition: "all 0.2s",
          }}>
            Take Control
          </button>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim }}>
            or pretend this isn't your problem
          </span>
        </div>
      </div>

      {/* Bottom warning strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "10px 16px", background: T.amber + "10",
        borderTop: `1px solid ${T.amber}20`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span style={{ animation: "blink 1s infinite", color: T.amber, fontSize: 10 }}>●</span>
        <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.amber, letterSpacing: "0.1em" }}>
          NATIONAL GRID STATUS: CRITICAL
        </span>
      </div>
    </div>
  );
}

// ─── SCREEN: MAIN DASHBOARD ───
function DashboardScreen({ onNextDay, onEvent, onPlants, onEndGame }) {
  const [stage, setStage] = useState(4);
  const totalDemand = REGIONS.reduce((s, r) => s + r.demand, 0);
  const totalSupply = REGIONS.reduce((s, r) => s + r.supply, 0);
  const deficit = totalDemand - totalSupply;
  const rageVal = 62;

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, color: T.text,
      fontFamily: T.font.body, display: "flex", flexDirection: "column",
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: T.surface + "ee",
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`,
        padding: "10px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: T.font.display, fontSize: 22, color: T.text, letterSpacing: "0.04em" }}>
              STAGE 6
            </span>
            <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim }}>DAY 12/30</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontFamily: T.font.mono, fontSize: 12 }}>
            <span style={{ color: T.green }}>R4.2B</span>
            <span style={{ color: T.amber }}>⚡ {formatMW(totalSupply)}</span>
          </div>
        </div>

        {/* Rage bar */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.red, letterSpacing: "0.08em", fontWeight: 700 }}>
            RAGE
          </span>
          <MeterBar value={rageVal} color={rageVal > 60 ? T.red : T.amber} height={5} glow />
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.red, fontWeight: 700 }}>{rageVal}%</span>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* SUPPLY vs DEMAND Summary */}
        <Card style={delay(0)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>
                SUPPLY
              </div>
              <div style={{ fontFamily: T.font.mono, fontSize: 24, fontWeight: 800, color: T.green }}>
                {formatMW(totalSupply)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>
                DEMAND
              </div>
              <div style={{ fontFamily: T.font.mono, fontSize: 24, fontWeight: 800, color: T.red }}>
                {formatMW(totalDemand)}
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 12, padding: "8px 12px", background: T.redGlow,
            border: `1px solid ${T.red}30`, borderRadius: 6,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.red, fontWeight: 600 }}>
              DEFICIT: {formatMW(deficit)}
            </span>
            <span style={{
              fontFamily: T.font.mono, fontSize: 10, padding: "2px 8px",
              background: T.red, color: T.bg, borderRadius: 3, fontWeight: 700,
            }}>
              STAGE {stage}
            </span>
          </div>
        </Card>

        {/* LOAD SHEDDING STAGE SELECTOR */}
        <Card style={delay(1)}>
          <SectionHeader icon="🔌">Set Load Shedding Stage</SectionHeader>
          <div style={{ display: "flex", gap: 6 }}>
            {[0,1,2,3,4,5,6,7,8].map(s => (
              <button key={s} onClick={() => setStage(s)} style={{
                flex: 1, padding: "10px 0", borderRadius: 6,
                background: s === stage ? (s >= 6 ? T.red : s >= 4 ? T.amber : T.green) : T.surfaceRaised,
                color: s === stage ? T.bg : (s >= 6 ? T.red : s >= 4 ? T.amber : T.textMuted),
                border: `1px solid ${s === stage ? "transparent" : T.border}`,
                fontFamily: T.font.mono, fontSize: 13, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{
            marginTop: 8, fontFamily: T.font.mono, fontSize: 10, color: T.textDim, textAlign: "center"
          }}>
            Stage {stage} = {stage * 5}% demand cut • {formatMW(Math.round(totalDemand * stage * 0.05))} shed
          </div>
        </Card>

        {/* ACTIVE EVENTS */}
        <Card style={{ ...delay(2), border: `1px solid ${T.amber}30`, background: T.surface }}>
          <SectionHeader icon="⚠️">Active Events</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EVENTS.map((ev, i) => (
              <div key={i} onClick={onEvent} style={{
                padding: 12, borderRadius: 8,
                background: ev.severity === "critical" ? T.redGlow : `${T.amber}08`,
                border: `1px solid ${ev.severity === "critical" ? T.red : T.amber}20`,
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{ev.icon}</span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: 13, fontWeight: 600,
                    color: ev.severity === "critical" ? T.red : T.amber,
                  }}>
                    {ev.title}
                  </span>
                </div>
                <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                  {ev.desc}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* REGIONS */}
        <Card style={delay(3)}>
          <SectionHeader icon="🌍">Regions</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REGIONS.map((r, i) => {
              const pct = (r.supply / r.demand) * 100;
              const rageColor = r.rage > 65 ? T.red : r.rage > 40 ? T.amber : T.green;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 12, padding: "10px 12px",
                  background: T.surfaceRaised, borderRadius: 8,
                  border: r.rage > 65 ? `1px solid ${T.red}20` : `1px solid transparent`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textDim }}>TIER {r.tier}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <MeterBar value={pct} color={pct < 85 ? T.red : pct < 95 ? T.amber : T.green} height={4} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.mono, fontSize: 9, color: T.textDim }}>
                      <span>{formatMW(r.supply)} / {formatMW(r.demand)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 40 }}>
                    <div style={{ fontFamily: T.font.mono, fontSize: 14, fontWeight: 700, color: rageColor }}>
                      {r.rage}
                    </div>
                    <div style={{ fontFamily: T.font.mono, fontSize: 8, color: T.textDim }}>RAGE</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* PLANT FLEET MINI */}
        <Card style={delay(4)} onClick={onPlants}>
          <SectionHeader icon="🏭" action={
            <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.amber, cursor: "pointer" }}>VIEW ALL →</span>
          }>Power Plants</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PLANTS.slice(0, 4).map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", background: T.surfaceRaised, borderRadius: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 28, borderRadius: 2, background: p.color }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim }}>{p.type} • {p.reliability}% rel.</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: T.font.mono, fontSize: 13, fontWeight: 700, color: T.text }}>
                      {formatMW(p.output)}
                    </div>
                    <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textDim }}>/ {formatMW(p.capacity)}</div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* QUICK ACTIONS */}
        <Card style={delay(5)}>
          <SectionHeader icon="⚙️">Actions</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Emergency Diesel", icon: "⛽", desc: "R180M • +1,350MW", color: T.purple },
              { label: "Maintenance", icon: "🔧", desc: "Offline 2 days", color: T.blue },
              { label: "Clean Tender", icon: "📋", desc: "R400M • Long-term", color: T.green },
              { label: "Corrupt Tender", icon: "💰", desc: "R120M • +Kickback", color: T.red },
            ].map((a, i) => (
              <button key={i} style={{
                padding: 14, background: T.surfaceRaised, border: `1px solid ${T.border}`,
                borderRadius: 8, cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{a.icon}</div>
                <div style={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: a.color }}>{a.label}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim, marginTop: 2 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Spacer for bottom bar */}
        <div style={{ height: 80 }} />
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        background: `linear-gradient(transparent, ${T.bg} 30%)`,
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <ActionButton onClick={onNextDay} color={T.amber} icon="▶">
              End Day 12
            </ActionButton>
          </div>
          <ActionButton onClick={onEndGame} variant="outline" color={T.textMuted} small icon="📊">
            Score
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: DAY SUMMARY ───
function DaySummaryScreen({ onContinue }) {
  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, color: T.text,
      fontFamily: T.font.body, padding: 16, display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "32px 0 24px", ...delay(0) }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.15em" }}>
          END OF DAY
        </div>
        <div style={{ fontFamily: T.font.display, fontSize: 56, color: T.text, letterSpacing: "0.04em" }}>
          DAY 12
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <Card style={delay(1)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
            {[
              { label: "AVG STAGE", value: "4.2", color: T.amber, icon: "⚡" },
              { label: "REVENUE", value: "R320M", color: T.green, icon: "💰" },
              { label: "RAGE Δ", value: "+8%", color: T.red, icon: "😡" },
            ].map((s, i) => (
              <div key={i} style={{ ...delay(i + 2) }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textDim, letterSpacing: "0.08em", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Events that happened */}
        <Card style={delay(3)}>
          <SectionHeader icon="📰">What Happened</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { text: "Medupi Unit 3 went offline — boiler tube leak", icon: "💥", color: T.red },
              { text: "Diesel generators activated — R180M spent", icon: "⛽", color: T.purple },
              { text: "Durban protests escalated — rage +12", icon: "📢", color: T.orange },
              { text: "Cape Town demand stabilized — rage -3", icon: "✅", color: T.green },
            ].map((ev, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 0", borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
                ...delay(i + 4),
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ev.icon}</span>
                <span style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>{ev.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Plant Fleet Status */}
        <Card style={delay(5)}>
          <SectionHeader icon="🏭">Fleet Status</SectionHeader>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PLANTS.map((p, i) => (
              <div key={i} style={{
                padding: "6px 10px", borderRadius: 6, background: T.surfaceRaised,
                border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textMuted }}>{p.name}</span>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Continue Button */}
      <div style={{ padding: "20px 0", paddingBottom: "max(20px, env(safe-area-inset-bottom))", ...delay(6) }}>
        <button onClick={onContinue} style={{
          width: "100%", padding: 16, background: T.amber, color: T.bg,
          border: "none", borderRadius: 10, fontFamily: T.font.body,
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          letterSpacing: "0.04em",
        }}>
          Continue to Day 13 →
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: GAME OVER ───
function GameOverScreen({ onRestart, onTitle }) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => { setTimeout(() => setReveal(true), 200); }, []);

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, color: T.text,
      fontFamily: T.font.body, padding: 24,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(${T.amber}20, transparent)`,
        top: "15%", left: "50%", transform: "translateX(-50%)",
        filter: "blur(60px)",
      }} />

      <div style={{
        textAlign: "center", position: "relative", zIndex: 1,
        opacity: reveal ? 1 : 0, transform: reveal ? "none" : "translateY(30px)",
        transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Title */}
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.2em", marginBottom: 8 }}>
          DAY 22 OF 30
        </div>
        <div style={{
          fontFamily: T.font.display, fontSize: "clamp(48px, 14vw, 80px)",
          color: T.red, letterSpacing: "0.04em", lineHeight: 1,
          textShadow: `0 0 40px ${T.red}30`,
        }}>
          GRID COLLAPSE
        </div>
        <p style={{ fontFamily: T.font.body, fontSize: 14, color: T.textMuted, marginTop: 12, maxWidth: 300, lineHeight: 1.6 }}>
          Supply dropped below critical threshold. The nation plunged into total darkness.
        </p>

        {/* Player Title */}
        <div style={{
          margin: "32px auto", padding: "16px 24px", background: T.surfaceRaised,
          border: `1px solid ${T.amber}30`, borderRadius: 10, display: "inline-block",
          animation: reveal ? "rotateIn 0.6s ease 0.5s both" : "none",
        }}>
          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textDim, letterSpacing: "0.15em", marginBottom: 4 }}>
            YOUR TITLE
          </div>
          <div style={{ fontFamily: T.font.display, fontSize: 32, color: T.amber, letterSpacing: "0.05em" }}>
            MINISTER OF DARKNESS
          </div>
        </div>

        {/* Score Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "24px 0", width: "100%", maxWidth: 320 }}>
          {[
            { label: "Stability", value: 34, color: T.red, weight: "40%" },
            { label: "Profit", value: 72, color: T.green, weight: "40%" },
            { label: "Public Trust", value: 18, color: T.amber, weight: "20%" },
          ].map((s, i) => (
            <div key={i} style={{ ...delay(i + 3, 150) }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.textMuted }}>{s.label} ({s.weight})</span>
                <span style={{ fontFamily: T.font.mono, fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}/100</span>
              </div>
              <MeterBar value={s.value} color={s.color} height={6} />
            </div>
          ))}
          <div style={{
            marginTop: 8, padding: 16, background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, textAlign: "center", ...delay(6, 150),
          }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.textDim, letterSpacing: "0.15em" }}>FINAL SCORE</div>
            <div style={{ fontFamily: T.font.display, fontSize: 56, color: T.text, letterSpacing: "0.04em" }}>42</div>
            <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim }}>/ 100</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, ...delay(7, 150) }}>
          <button onClick={onRestart} style={{
            padding: "14px 32px", background: T.amber, color: T.bg,
            border: "none", borderRadius: 8, fontFamily: T.font.body,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
            Try Again
          </button>
          <button onClick={onTitle} style={{
            padding: "12px 32px", background: "transparent",
            color: T.textMuted, border: `1px solid ${T.border}`,
            borderRadius: 8, fontFamily: T.font.body, fontSize: 13,
            cursor: "pointer",
          }}>
            Back to Title
          </button>
          {/* Share */}
          <div style={{
            marginTop: 8, padding: 12, background: T.surfaceRaised,
            border: `1px solid ${T.border}`, borderRadius: 8, textAlign: "center",
          }}>
            <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim, marginBottom: 6 }}>
              SHARE YOUR SHAME
            </div>
            <div style={{
              fontFamily: T.font.mono, fontSize: 12, color: T.textMuted, lineHeight: 1.6,
              padding: "8px 12px", background: T.surface, borderRadius: 6,
            }}>
              I scored 42/100 in Stage 6 ⚡<br/>
              Title: Minister of Darkness 🌑<br/>
              Grid collapsed on Day 22.<br/>
              Think you can do better?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: PLANT DETAIL ───
function PlantScreen({ onBack }) {
  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, color: T.text,
      fontFamily: T.font.body,
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: T.surface + "ee",
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: T.textMuted,
          fontSize: 18, cursor: "pointer", padding: 4,
        }}>←</button>
        <span style={{ fontFamily: T.font.display, fontSize: 20, letterSpacing: "0.04em" }}>POWER PLANTS</span>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Summary bar */}
        <div style={{
          display: "flex", gap: 12, padding: 12, background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: 8, justifyContent: "space-around",
          fontFamily: T.font.mono, textAlign: "center",
        }}>
          {[
            { label: "ONLINE", val: "3", color: T.green },
            { label: "DERATED", val: "2", color: T.amber },
            { label: "STANDBY", val: "1", color: T.textMuted },
            { label: "OUTAGE", val: "0", color: T.red },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 8, color: T.textDim, letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {PLANTS.map((p, i) => (
          <Card key={i} style={{ ...delay(i + 1), padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: p.color }} />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                </div>
                <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.textDim, marginLeft: 12 }}>{p.type}</span>
              </div>
              <StatusPill status={p.status} />
            </div>

            {/* Output bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.mono, fontSize: 10, color: T.textDim, marginBottom: 4 }}>
                <span>Output</span>
                <span>{formatMW(p.output)} / {formatMW(p.capacity)}</span>
              </div>
              <MeterBar value={p.output} max={p.capacity} color={p.color} height={5} />
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, fontFamily: T.font.mono, fontSize: 10 }}>
              <div style={{ flex: 1, padding: "6px 8px", background: T.surfaceRaised, borderRadius: 4, textAlign: "center" }}>
                <div style={{ color: T.textDim, marginBottom: 2, fontSize: 8 }}>RELIABILITY</div>
                <div style={{ color: p.reliability > 70 ? T.green : p.reliability > 50 ? T.amber : T.red, fontWeight: 700 }}>
                  {p.reliability}%
                </div>
              </div>
              <div style={{ flex: 1, padding: "6px 8px", background: T.surfaceRaised, borderRadius: 4, textAlign: "center" }}>
                <div style={{ color: T.textDim, marginBottom: 2, fontSize: 8 }}>FAIL RISK</div>
                <div style={{ color: T.amber, fontWeight: 700 }}>{(100 - p.reliability)}%</div>
              </div>
              <div style={{ flex: 1, padding: "6px 8px", background: T.surfaceRaised, borderRadius: 4, textAlign: "center" }}>
                <div style={{ color: T.textDim, marginBottom: 2, fontSize: 8 }}>DEBT</div>
                <div style={{ color: T.red, fontWeight: 700 }}>
                  {p.status === "Derated" ? "HIGH" : "LOW"}
                </div>
              </div>
            </div>

            {/* Actions */}
            {p.status !== "Online" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <ActionButton small variant="outline" color={T.blue} icon="🔧">Schedule Maintenance</ActionButton>
              </div>
            )}
          </Card>
        ))}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// ─── SCREEN: EVENT MODAL ───
function EventModal({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420, background: T.surface,
        borderRadius: "16px 16px 0 0", padding: 24,
        border: `1px solid ${T.red}30`, borderBottom: "none",
        animation: "slideUp 0.3s ease",
      }}>
        <div style={{ width: 36, height: 4, background: T.border, borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: "shakeX 0.4s ease" }}>💥</div>
          <div style={{
            fontFamily: T.font.mono, fontSize: 9, color: T.red,
            letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4,
          }}>
            CRITICAL EVENT
          </div>
          <h2 style={{ fontFamily: T.font.display, fontSize: 28, color: T.text, letterSpacing: "0.04em" }}>
            BOILER TUBE LEAK
          </h2>
          <p style={{ fontFamily: T.font.body, fontSize: 14, color: T.textMuted, marginTop: 8, lineHeight: 1.6 }}>
            Medupi Unit 3 has experienced a catastrophic boiler tube failure.
            The unit is forced offline immediately.
          </p>
        </div>

        {/* Impact */}
        <div style={{
          padding: 14, background: T.redGlow, border: `1px solid ${T.red}25`,
          borderRadius: 10, marginBottom: 16,
        }}>
          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.red, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
            IMPACT
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Capacity Lost", value: "−800 MW", color: T.red },
              { label: "Duration", value: "3 Days", color: T.amber },
              { label: "Rage Impact", value: "+15", color: T.orange },
            ].map((im, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.mono, fontSize: 12 }}>
                <span style={{ color: T.textMuted }}>{im.label}</span>
                <span style={{ color: im.color, fontWeight: 700 }}>{im.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Choices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onClose} style={{
            padding: 14, background: T.amber, color: T.bg, border: "none",
            borderRadius: 8, fontFamily: T.font.body, fontSize: 14, fontWeight: 700,
            cursor: "pointer", textAlign: "left",
          }}>
            <div>Rush Repair — R220M</div>
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>Back online in 1 day instead of 3</div>
          </button>
          <button onClick={onClose} style={{
            padding: 14, background: T.surfaceRaised, color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 8,
            fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
            cursor: "pointer", textAlign: "left",
          }}>
            <div>Standard Repair</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: T.textMuted, marginTop: 2 }}>3 day outage, no extra cost</div>
          </button>
          <button onClick={onClose} style={{
            padding: 14, background: T.redGlow, color: T.red,
            border: `1px solid ${T.red}30`, borderRadius: 8,
            fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
            cursor: "pointer", textAlign: "left",
          }}>
            <div>Patch & Pray 🎲</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: T.textMuted, marginTop: 2 }}>Quick fix. 40% chance it fails again within 2 days</div>
          </button>
        </div>

        <div style={{ height: "max(16px, env(safe-area-inset-bottom))" }} />
      </div>
    </div>
  );
}

// ─── SCREEN NAVIGATOR ───
function ScreenNav({ current, onChange }) {
  const screens = [
    { id: "title", label: "Title" },
    { id: "dashboard", label: "Dashboard" },
    { id: "plants", label: "Plants" },
    { id: "event", label: "Event" },
    { id: "summary", label: "Day End" },
    { id: "gameover", label: "Game Over" },
  ];
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: T.purple + "dd", backdropFilter: "blur(8px)",
      display: "flex", overflow: "auto", gap: 2, padding: "6px 8px",
    }}>
      <span style={{
        fontFamily: T.font.mono, fontSize: 9, color: "#fff8",
        padding: "6px 8px", whiteSpace: "nowrap", alignSelf: "center",
      }}>
        MOCK SCREENS:
      </span>
      {screens.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)} style={{
          padding: "6px 12px", borderRadius: 4, border: "none",
          background: current === s.id ? "#fff" : "rgba(255,255,255,0.12)",
          color: current === s.id ? T.purple : "#fffc",
          fontFamily: T.font.mono, fontSize: 10, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── APP ───
export default function App() {
  const [screen, setScreen] = useState("title");
  const [showEvent, setShowEvent] = useState(false);

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", position: "relative", minHeight: "100dvh" }}>
      <ScreenNav current={screen} onChange={setScreen} />
      <div style={{ paddingTop: 36 }}>
        {screen === "title" && <TitleScreen onStart={() => setScreen("dashboard")} />}
        {screen === "dashboard" && (
          <DashboardScreen
            onNextDay={() => setScreen("summary")}
            onEvent={() => setShowEvent(true)}
            onPlants={() => setScreen("plants")}
            onEndGame={() => setScreen("gameover")}
          />
        )}
        {screen === "plants" && <PlantScreen onBack={() => setScreen("dashboard")} />}
        {screen === "summary" && <DaySummaryScreen onContinue={() => setScreen("dashboard")} />}
        {screen === "gameover" && <GameOverScreen onRestart={() => setScreen("dashboard")} onTitle={() => setScreen("title")} />}
        {showEvent && <EventModal onClose={() => setShowEvent(false)} />}
      </div>
    </div>
  );
}
