import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';
import { SectionHeader } from '../components/shared/SectionHeader';
import { formatMoney } from '../utils/format';
import type { DayReport } from '../data/types';
import { BALANCING } from '../data/balancing';

interface DaySummaryScreenProps {
  report: DayReport;
  onContinue: () => void;
}

export function DaySummaryScreen({ report, onContinue }: DaySummaryScreenProps) {
  const daysRemaining = BALANCING.TOTAL_DAYS - report.day;

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, padding: 16, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ textAlign: 'center', padding: '28px 0 20px', ...staggeredFadeUp(0) }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted, letterSpacing: '0.15em' }}>END OF</div>
        <div style={{ fontFamily: tokens.font.display, fontSize: 52, color: tokens.color.text, letterSpacing: '0.04em' }}>DAY {report.day}</div>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim }}>{daysRemaining} DAYS REMAINING</div>
      </div>

      {/* Demand satisfaction badge */}
      {report.supplyTotal >= report.demandTotal && (
        <div style={{
          padding: '8px 12px', background: `${tokens.color.green}10`,
          border: `1px solid ${tokens.color.green}20`, borderRadius: 8,
          textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 10,
          color: tokens.color.green, fontWeight: 700,
          ...staggeredFadeUp(1),
        }}>
          {'\u2705'} DEMAND MET — NO LOAD SHEDDING NEEDED
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {/* Key Metrics */}
        <Card style={staggeredFadeUp(1)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {[
              { label: 'SKIMMED', val: report.skimmed > 0 ? `+${formatMoney(report.skimmed)}` : 'R0', color: tokens.color.goldBright, icon: '\u{1F4B0}' },
              { label: 'AVG STAGE', val: report.avgStage.toFixed(1), color: tokens.color.amber, icon: '\u26A1' },
              { label: 'HEAT', val: `${report.heatDelta >= 0 ? '+' : ''}${Math.round(report.heatDelta)}%`, color: tokens.color.red, icon: '\u{1F525}' },
              { label: 'RAGE', val: `${report.rageDelta >= 0 ? '+' : ''}${Math.round(report.rageDelta)}%`, color: tokens.color.red, icon: '\u{1F621}' },
            ].map((s, i) => (
              <div key={i} style={staggeredFadeUp(i + 2)}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim, letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* What Happened */}
        <Card style={staggeredFadeUp(3)}>
          <SectionHeader icon={'\u{1F4F0}'}>What Happened</SectionHeader>
          {report.events.slice(0, 6).map((ev, i) => {
            const isGood = ev.includes('clean') || ev.includes('stable') || ev.includes('approved') || ev.includes('cooling');
            const color = isGood ? tokens.color.green : ev.includes('fail') || ev.includes('rage') || ev.includes('arrest') ? tokens.color.red : tokens.color.gold;
            return (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: i < Math.min(report.events.length - 1, 5) ? `1px solid ${tokens.color.border}` : 'none',
                ...staggeredFadeUp(i + 4),
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, color }}>{'\u2022'}</span>
                <span style={{ fontSize: 12, color: tokens.color.muted, lineHeight: 1.6 }}>{ev}</span>
              </div>
            );
          })}
        </Card>

        {/* Tomorrow's Teaser */}
        {report.tomorrowTeaser && (
          <Card style={{
            ...staggeredFadeUp(5),
            border: `1px solid ${tokens.color.gold}20`,
            background: `linear-gradient(135deg, ${tokens.color.gold}06, transparent)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{'\u{1F440}'}</span>
              <div>
                <div style={{
                  fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.gold,
                  letterSpacing: '0.1em', fontWeight: 700,
                }}>TOMORROW'S OPPORTUNITY</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tokens.color.text, marginTop: 2 }}>
                  {report.tomorrowTeaser.title}
                </div>
                <div style={{
                  fontFamily: tokens.font.serif, fontSize: 20, color: tokens.color.goldBright, fontWeight: 900,
                }}>Up to {formatMoney(report.tomorrowTeaser.skimAmount)}</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginTop: 2 }}>
                  {report.tomorrowTeaser.hint}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div style={{
        padding: '16px 0', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        ...staggeredFadeUp(6),
      }}>
        <button onClick={onContinue} style={{
          width: '100%', padding: 15,
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          One More Day {'\u2192'} Day {report.day + 1}
        </button>
      </div>
    </div>
  );
}
