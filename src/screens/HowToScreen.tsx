import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';

interface HowToScreenProps {
  onClose: () => void;
}

const GUIDE_SECTIONS = [
  {
    icon: '\u{1F3AF}',
    title: 'Your Mission',
    text: "You're a corrupt grid controller. You have 30 days before your appointment ends. Skim as much as you can before getting caught — or before the grid collapses.",
    color: tokens.color.gold,
  },
  {
    icon: '\u{1F4B0}',
    title: 'The Bag',
    text: "Your offshore account. Every corrupt deal adds money to it. This is your real score — the more you steal, the higher you rank.",
    color: tokens.color.goldBright,
  },
  {
    icon: '\u{1F525}',
    title: 'Heat',
    text: "Every corrupt deal adds heat. Heat decays 2 points daily, or 5 on clean days. But heat can't drop more than one threshold band per day — once you're hot, cooling down takes time. Above 80%? Hawks are circling. Above 96%? You're arrested.",
    color: tokens.color.amber,
  },
  {
    icon: '\u26A1',
    title: 'The Grid',
    text: "Set load shedding stages (0-8) to balance supply vs demand. Higher stages cut demand but anger the public. You can't set a stage below the grid minimum — the lights must stay on.",
    color: tokens.color.cyan,
  },
  {
    icon: '\u{1F621}',
    title: 'Public Rage',
    text: "High load shedding and blackouts make people angry. Rage reduces your revenue. At extreme levels, the public goes off-grid entirely — fewer customers means less money for you.",
    color: tokens.color.red,
  },
  {
    icon: '\u{1F4BC}',
    title: 'Deals',
    text: "Each day brings procurement tenders. Set the inflation level — clean (no skim) or inflate up to 100% for maximum kickback. Higher inflation means worse work quality, more heat, and plant wear. You can also delay tenders (but costs may rise).",
    color: tokens.color.purple,
  },
  {
    icon: '\u{1F3DB}\uFE0F',
    title: 'Influence & Diversion',
    text: "Earn influence by keeping the grid stable and meeting demand. Spend it to suppress rage, deflect investigations, or cover power diversions. Divert grid power to private clients for extra income — but detection means heat and rage.",
    color: tokens.color.purple,
  },
  {
    icon: '\u{1F3E6}',
    title: 'Budget',
    text: "The grid's operational money — not yours. Revenue from electricity sales minus fuel costs. Going bankrupt for 3 days ends the game. Use tariff hikes or a government bailout to stay afloat.",
    color: tokens.color.green,
  },
  {
    icon: '\u{1F3C6}',
    title: 'Survive 30 Days',
    text: "Make it to day 30 with your bag intact. Or if heat gets too high, flee the country with 40% of your loot. Get arrested? Bag seized. Game over.",
    color: tokens.color.gold,
  },
];

export function HowToScreen({ onClose }: HowToScreenProps) {
  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, padding: 16, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '24px 0 16px', ...staggeredFadeUp(0) }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>{'\u26A1'}</div>
        <div style={{
          fontFamily: tokens.font.display, fontSize: 32, letterSpacing: '0.04em',
        }}>HOW TO PLAY</div>
        <div style={{
          fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginTop: 4,
        }}>The grid is yours. So is the offshore account.</div>
      </div>

      {/* Guide Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {GUIDE_SECTIONS.map((section, i) => (
          <Card key={i} style={{
            ...staggeredFadeUp(i + 1),
            border: `1px solid ${section.color}20`,
            padding: 14,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{section.icon}</span>
              <div>
                <div style={{
                  fontFamily: tokens.font.display, fontSize: 18, color: section.color,
                  letterSpacing: '0.04em', marginBottom: 4,
                }}>{section.title.toUpperCase()}</div>
                <div style={{
                  fontSize: 12, color: tokens.color.muted, lineHeight: 1.6,
                }}>{section.text}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Close Button */}
      <div style={{
        padding: '16px 0', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        ...staggeredFadeUp(GUIDE_SECTIONS.length + 1),
      }}>
        <button onClick={onClose} style={{
          width: '100%', padding: 15,
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          Got It — Let's Go
        </button>
      </div>
    </div>
  );
}
