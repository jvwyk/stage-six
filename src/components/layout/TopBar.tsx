import { tokens } from '../../styles/tokens';
import { StatusPill } from '../shared/StatusPill';
import { MeterBar } from '../shared/MeterBar';
import { formatMoney } from '../../utils/format';
import { getHeatStatusLabel } from '../../engine/HeatEngine';
import { BALANCING } from '../../data/balancing';

interface TopBarProps {
  day: number;
  budget: number;
  bag: number;
  lastSkim: number;
  heat: number;
  rage: number;
  budgetDelta?: number;
  influence?: number;
  eventCount?: number;
}

export function TopBar({ day, budget, bag, lastSkim, heat, rage, budgetDelta, influence, eventCount }: TopBarProps) {
  const heatColor = heat > 70 ? tokens.color.red : tokens.color.amber;
  const heatLabel = getHeatStatusLabel(heat);

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: `${tokens.color.surface}f0`,
      backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${tokens.color.border}`,
      padding: '8px 16px 10px',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: tokens.font.display,
            fontSize: 20,
            color: tokens.color.text,
            letterSpacing: '0.04em',
          }}>STAGE 6</span>
          <StatusPill color={tokens.color.muted}>DAY {day}/{BALANCING.TOTAL_DAYS}</StatusPill>
          {eventCount !== undefined && eventCount > 0 && (
            <StatusPill color={tokens.color.amber} pulse>{eventCount} event{eventCount !== 1 ? 's' : ''}</StatusPill>
          )}
        </div>
        <div style={{
          fontFamily: tokens.font.mono,
          fontSize: 11,
          color: tokens.color.green,
        }}>
          {formatMoney(budget)}{budgetDelta ? (
            <span style={{ color: budgetDelta >= 0 ? tokens.color.green : tokens.color.red, marginLeft: 4 }}>
              ({budgetDelta >= 0 ? '+' : ''}{formatMoney(budgetDelta)})
            </span>
          ) : null}
        </div>
      </div>

      {/* THE BAG */}
      <div style={{
        marginTop: 10,
        padding: '10px 14px',
        background: `linear-gradient(135deg, ${tokens.color.gold}10, ${tokens.color.goldDim}08)`,
        border: `1px solid ${tokens.color.gold}25`,
        borderRadius: 8,
        animation: 'goldPulse 3s infinite',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontFamily: tokens.font.mono,
              fontSize: 8,
              color: tokens.color.gold,
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}>
              {'\u{1F4B0}'} YOUR OFFSHORE ACCOUNT
            </div>
            <div style={{
              fontFamily: tokens.font.serif,
              fontSize: 28,
              color: tokens.color.goldBright,
              fontWeight: 900,
              letterSpacing: '0.02em',
              marginTop: 2,
            }}>
              {formatMoney(bag)}
            </div>
          </div>
          {lastSkim > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim }}>LAST SKIM</div>
              <div style={{
                fontFamily: tokens.font.mono,
                fontSize: 14,
                color: tokens.color.green,
                fontWeight: 700,
              }}>
                +{formatMoney(lastSkim)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Heat + Rage bars */}
      <div style={{ display: 'grid', gridTemplateColumns: influence !== undefined ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{
              fontFamily: tokens.font.mono,
              fontSize: 8,
              color: tokens.color.amber,
              letterSpacing: '0.1em',
              fontWeight: 700,
            }}>
              {'\u{1F525}'} HEAT
            </span>
            <span style={{
              fontFamily: tokens.font.mono,
              fontSize: 9,
              color: tokens.color.amber,
              fontWeight: 700,
            }}>
              {Math.round(heat)}%
            </span>
          </div>
          <MeterBar value={heat} color={heatColor} height={5} glow />
          <div style={{
            fontFamily: tokens.font.mono,
            fontSize: 8,
            color: tokens.color.dim,
            marginTop: 2,
          }}>
            {heatLabel}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{
              fontFamily: tokens.font.mono,
              fontSize: 8,
              color: tokens.color.red,
              letterSpacing: '0.1em',
              fontWeight: 700,
            }}>
              {'\u{1F621}'} RAGE
            </span>
            <span style={{
              fontFamily: tokens.font.mono,
              fontSize: 9,
              color: tokens.color.red,
              fontWeight: 700,
            }}>
              {Math.round(rage)}%
            </span>
          </div>
          <MeterBar value={rage} color={tokens.color.red} height={5} glow />
          <div style={{
            fontFamily: tokens.font.mono,
            fontSize: 8,
            color: tokens.color.dim,
            marginTop: 2,
          }}>
            {rage > 85 ? 'CRITICAL' : rage > 70 ? 'FURIOUS' : rage > 50 ? 'ANGRY' : rage > 25 ? 'GRUMBLING' : 'CALM'}
          </div>
        </div>
        {influence !== undefined && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.purple, letterSpacing: '0.1em', fontWeight: 700 }}>
                {'\u{1F3DB}\uFE0F'} INFLUENCE
              </span>
              <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.purple, fontWeight: 700 }}>
                {Math.round(influence)}
              </span>
            </div>
            <MeterBar value={influence} color={tokens.color.purple} height={5} glow />
          </div>
        )}
      </div>
    </div>
  );
}
