import { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { StatusPill } from '../shared/StatusPill';
import { BottomSheet } from '../layout/BottomSheet';
import { formatMoney } from '../../utils/format';
import { BALANCING } from '../../data/balancing';
import { getAvailableInflationSteps } from '../../engine/OpportunityEngine';
import type { Opportunity } from '../../data/types';

interface TenderModalProps {
  opportunity: Opportunity;
  currentHeat: number;
  onApprove: (inflationLevel: number) => void;
  onDelay: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TenderModal({ opportunity, currentHeat, onApprove, onDelay, onSkip, onClose }: TenderModalProps) {
  const op = opportunity;
  const steps = getAvailableInflationSteps(op);
  const [selectedStep, setSelectedStep] = useState(0);

  const inflationMultiplier = 1 + selectedStep;
  const gridPays = Math.round(op.baseCost * inflationMultiplier);
  const yourCut = Math.round(op.baseCost * selectedStep);
  const stepIndex = Math.round(selectedStep / 0.25);
  const heatAdded = selectedStep > 0 ? op.heatPerInflation * stepIndex : 0;
  const wearAdded = selectedStep > 0 ? op.failureDebtPerInflation * stepIndex : 0;
  const degradation = BALANCING.TENDER_GRID_EFFECT_DEGRADATION[Math.min(stepIndex, BALANCING.TENDER_GRID_EFFECT_DEGRADATION.length - 1)];
  const projectedHeat = currentHeat + heatAdded;
  const isHeatDangerous = projectedHeat >= 80;
  const isClean = selectedStep <= 0;
  const canDelay = op.canDelay && op.delayCount < BALANCING.TENDER_DELAY_MAX;

  // Color interpolation based on inflation level
  const stepColor = isClean ? tokens.color.green
    : selectedStep <= 0.25 ? tokens.color.cyan
    : selectedStep <= 0.5 ? tokens.color.amber
    : selectedStep <= 0.75 ? tokens.color.gold
    : tokens.color.red;

  return (
    <BottomSheet onClose={onClose}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>{op.icon}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
          <StatusPill color={tokens.color.gold}>{op.tag}</StatusPill>
          {op.delayCount > 0 && <StatusPill color={tokens.color.amber}>DELAYED x{op.delayCount}</StatusPill>}
        </div>
        <h2 style={{
          fontFamily: tokens.font.display, fontSize: 24, color: tokens.color.text,
          letterSpacing: '0.04em', marginTop: 4,
        }}>{op.title.toUpperCase()}</h2>
        <p style={{
          fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.muted,
          marginTop: 4, lineHeight: 1.5, maxWidth: 320, margin: '4px auto 0',
        }}>{op.description}</p>
        <div style={{
          fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.dim, marginTop: 6,
        }}>Base contract: <span style={{ color: tokens.color.text, fontWeight: 700 }}>R{op.baseCost}M</span></div>
      </div>

      {/* Inflation Selector */}
      <div style={{
        padding: 12, background: tokens.color.raised, borderRadius: 10,
        border: `1px solid ${stepColor}20`, marginBottom: 12,
      }}>
        <div style={{
          fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim,
          letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8, textAlign: 'center',
        }}>INFLATION LEVEL</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {steps.map((step) => {
            const active = step === selectedStep;
            const pct = Math.round(step * 100);
            const btnColor = step <= 0 ? tokens.color.green
              : step <= 0.25 ? tokens.color.cyan
              : step <= 0.5 ? tokens.color.amber
              : step <= 0.75 ? tokens.color.gold
              : tokens.color.red;
            return (
              <button key={step} onClick={() => setSelectedStep(step)} style={{
                flex: 1, padding: '8px 2px',
                background: active ? `${btnColor}18` : tokens.color.surface,
                border: active ? `2px solid ${btnColor}` : `1px solid ${tokens.color.border}`,
                borderRadius: 8, cursor: 'pointer',
                fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 800,
                color: active ? btnColor : tokens.color.dim,
                transition: 'all 0.15s ease',
              }}>
                {pct === 0 ? 'CLEAN' : `${pct}%`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{
          padding: 12, background: isClean ? `${tokens.color.green}08` : `${tokens.color.gold}08`,
          border: `1px solid ${isClean ? tokens.color.green : tokens.color.gold}20`,
          borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 7, letterSpacing: '0.1em', fontWeight: 700,
            color: isClean ? tokens.color.green : tokens.color.gold, marginBottom: 3,
          }}>YOUR CUT</div>
          <div style={{
            fontFamily: tokens.font.serif, fontSize: 26, fontWeight: 900,
            color: isClean ? tokens.color.green : tokens.color.goldBright,
          }}>{isClean ? 'R0' : `+${formatMoney(yourCut)}`}</div>
        </div>
        <div style={{
          padding: 12, background: tokens.color.raised,
          border: `1px solid ${tokens.color.border}`, borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 7, letterSpacing: '0.1em', fontWeight: 700,
            color: tokens.color.muted, marginBottom: 3,
          }}>GRID PAYS</div>
          <div style={{
            fontFamily: tokens.font.serif, fontSize: 26, fontWeight: 900, color: tokens.color.text,
          }}>R{gridPays}M</div>
        </div>
      </div>

      {/* Consequences Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12,
      }}>
        <div style={{
          padding: '8px 4px', background: tokens.color.raised, borderRadius: 8, textAlign: 'center',
        }}>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim, letterSpacing: '0.08em', fontWeight: 700 }}>HEAT</div>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 16, fontWeight: 800,
            color: heatAdded > 0 ? tokens.color.red : tokens.color.green,
          }}>{heatAdded > 0 ? `+${heatAdded}` : '0'}</div>
        </div>
        <div style={{
          padding: '8px 4px', background: tokens.color.raised, borderRadius: 8, textAlign: 'center',
        }}>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim, letterSpacing: '0.08em', fontWeight: 700 }}>WEAR</div>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 16, fontWeight: 800,
            color: wearAdded > 0 ? tokens.color.amber : tokens.color.green,
          }}>{wearAdded > 0 ? `+${wearAdded}` : '0'}</div>
        </div>
        <div style={{
          padding: '8px 4px', background: tokens.color.raised, borderRadius: 8, textAlign: 'center',
        }}>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim, letterSpacing: '0.08em', fontWeight: 700 }}>QUALITY</div>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 16, fontWeight: 800,
            color: degradation >= 1 ? tokens.color.green : degradation >= 0.75 ? tokens.color.cyan : degradation >= 0.5 ? tokens.color.amber : tokens.color.red,
          }}>{Math.round(degradation * 100)}%</div>
        </div>
      </div>

      {/* Grid Effect */}
      <div style={{
        padding: 8, background: tokens.color.raised, borderRadius: 8, marginBottom: 12, textAlign: 'center',
      }}>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted }}>GRID: </span>
        <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.cyan, fontWeight: 700 }}>
          {op.gridEffectLabel}
          {degradation < 1 && ` (${Math.round(degradation * 100)}% effective)`}
        </span>
      </div>

      {/* Heat Warning */}
      {isHeatDangerous && (
        <div style={{
          padding: '6px 10px', background: `${tokens.color.amber}10`,
          border: `1px solid ${tokens.color.amber}20`, borderRadius: 8,
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>{'\u26A0\uFE0F'}</span>
          <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber, lineHeight: 1.4 }}>
            Heat {Math.round(currentHeat)}% {'\u2192'} {Math.round(projectedHeat)}%.{' '}
            <span style={{ color: tokens.color.red, fontWeight: 700 }}>Investigation at 80%.</span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={() => onApprove(selectedStep)} style={{
          padding: '14px 20px',
          background: isClean
            ? `linear-gradient(135deg, ${tokens.color.green}, ${tokens.color.cyan})`
            : `linear-gradient(135deg, ${stepColor}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          {isClean
            ? `Approve Clean Contract \u2014 R0 profit`
            : `Inflate & Approve at ${Math.round(selectedStep * 100)}% \u2014 +${formatMoney(yourCut)}`
          }
        </button>
        {canDelay && (
          <button onClick={onDelay} style={{
            padding: '12px 20px', background: tokens.color.raised, color: tokens.color.amber,
            border: `1px solid ${tokens.color.amber}20`, borderRadius: 10,
            fontFamily: tokens.font.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {'\u23F3'} Delay to Tomorrow (+{BALANCING.TENDER_DELAY_RAGE_COST} rage, {Math.round(BALANCING.TENDER_DELAY_WORSEN_CHANCE * 100)}% worsen)
          </button>
        )}
        <button onClick={onSkip} style={{
          padding: '10px 20px', background: 'transparent', color: tokens.color.dim,
          border: 'none', fontFamily: tokens.font.mono, fontSize: 10, cursor: 'pointer',
        }}>
          Skip {'\u2014'} no contract awarded
        </button>
      </div>
    </BottomSheet>
  );
}
