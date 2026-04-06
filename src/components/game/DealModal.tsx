import { tokens } from '../../styles/tokens';
import { StatusPill } from '../shared/StatusPill';
import { BottomSheet } from '../layout/BottomSheet';
import { formatMoney } from '../../utils/format';
import type { Opportunity } from '../../data/types';

interface DealModalProps {
  opportunity: Opportunity;
  currentHeat: number;
  onTake: () => void;
  onClean: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function DealModal({ opportunity, currentHeat, onTake, onClean, onSkip, onClose }: DealModalProps) {
  const op = opportunity;
  const projectedHeat = currentHeat + op.heatCost;
  const isHeatDangerous = projectedHeat >= 80;

  return (
    <BottomSheet onClose={onClose}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>{op.icon}</div>
        <StatusPill color={tokens.color.gold}>{op.tag}</StatusPill>
        <h2 style={{
          fontFamily: tokens.font.display, fontSize: 30, color: tokens.color.text,
          letterSpacing: '0.04em', marginTop: 6,
        }}>{op.title.toUpperCase()}</h2>
        <p style={{
          fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.muted,
          marginTop: 6, lineHeight: 1.6, maxWidth: 320, margin: '6px auto 0',
        }}>{op.description}</p>
      </div>

      {/* Risk/Reward Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{
          padding: 14, background: `${tokens.color.gold}08`,
          border: `1px solid ${tokens.color.gold}20`, borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.gold,
            letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4,
          }}>YOUR CUT</div>
          <div style={{
            fontFamily: tokens.font.serif, fontSize: 32, color: tokens.color.goldBright, fontWeight: 900,
          }}>+{formatMoney(op.skimAmount)}</div>
        </div>
        <div style={{
          padding: 14, background: tokens.color.redGlow,
          border: `1px solid ${tokens.color.red}20`, borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.amber,
            letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4,
          }}>HEAT ADDED</div>
          <div style={{
            fontFamily: tokens.font.serif, fontSize: 32, color: tokens.color.amber, fontWeight: 900,
          }}>+{op.heatCost}%</div>
        </div>
      </div>

      {/* Grid Effect */}
      <div style={{
        padding: 10, background: tokens.color.raised, borderRadius: 8, marginBottom: 16, textAlign: 'center',
      }}>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.muted }}>GRID EFFECT: </span>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.cyan, fontWeight: 700 }}>{op.gridEffectLabel}</span>
      </div>

      {/* Heat Warning */}
      {isHeatDangerous && (
        <div style={{
          padding: '8px 12px', background: `${tokens.color.amber}10`,
          border: `1px solid ${tokens.color.amber}20`, borderRadius: 8,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>{'\u26A0\uFE0F'}</span>
          <span style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.amber, lineHeight: 1.5 }}>
            Your heat is at {Math.round(currentHeat)}%. This deal pushes you to {Math.round(projectedHeat)}%.{' '}
            <span style={{ color: tokens.color.red, fontWeight: 700 }}>Investigation threshold: 80%.</span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onTake} style={{
          padding: '14px 20px',
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          textAlign: 'center',
        }}>
          Take the Deal {'\u2014'} +{formatMoney(op.skimAmount)} {'\u{1F4B0}'}
        </button>
        <button onClick={onClean} style={{
          padding: '14px 20px', background: tokens.color.raised, color: tokens.color.text,
          border: `1px solid ${tokens.color.border}`, borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Award Clean Contract {'\u2014'} R0 profit
        </button>
        <button onClick={onSkip} style={{
          padding: '12px 20px', background: 'transparent', color: tokens.color.dim,
          border: 'none', fontFamily: tokens.font.mono, fontSize: 11, cursor: 'pointer',
        }}>
          Skip {'\u2014'} no contract awarded
        </button>
      </div>
    </BottomSheet>
  );
}
