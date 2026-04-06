import { tokens } from '../../styles/tokens';
import { StatusPill } from '../shared/StatusPill';
import { BottomSheet } from '../layout/BottomSheet';
import type { ActiveEvent } from '../../data/types';

interface EventModalProps {
  event: ActiveEvent;
  onChoice: (eventId: string, choiceIndex: number) => void;
}

const severityColors: Record<string, string> = {
  info: tokens.color.blue,
  warning: tokens.color.amber,
  critical: tokens.color.red,
};

export function EventModal({ event: ae, onChoice }: EventModalProps) {
  const { event } = ae;
  const color = severityColors[event.severity] || tokens.color.amber;

  return (
    <BottomSheet onClose={() => {}}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>{event.icon}</div>
        <StatusPill color={color}>{event.severity}</StatusPill>
        <h2 style={{
          fontFamily: tokens.font.display, fontSize: 26, color: tokens.color.text,
          letterSpacing: '0.04em', marginTop: 6,
        }}>{event.title.toUpperCase()}</h2>
        <p style={{
          fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.muted,
          marginTop: 8, lineHeight: 1.6, maxWidth: 320, margin: '8px auto 0',
        }}>{event.description}</p>
      </div>

      {/* Effects summary */}
      {event.effects.length > 0 && (
        <div style={{
          padding: 10, background: `${color}08`, border: `1px solid ${color}20`,
          borderRadius: 8, marginBottom: 16, textAlign: 'center',
          fontFamily: tokens.font.mono, fontSize: 10, color,
        }}>
          {event.effects.map((e, i) => (
            <span key={i}>
              {e.type === 'supply' && `Supply: ${e.value > 0 ? '+' : ''}${e.value}MW`}
              {e.type === 'demand' && `Demand: ${e.value > 0 ? '+' : ''}${e.value}%`}
              {e.type === 'rage' && `Rage: ${e.value > 0 ? '+' : ''}${e.value}`}
              {e.type === 'heat' && `Heat: ${e.value > 0 ? '+' : ''}${e.value}`}
              {e.type === 'budget' && `Budget: ${e.value > 0 ? '+' : ''}R${Math.abs(e.value)}M`}
              {i < event.effects.length - 1 ? ' \u2022 ' : ''}
            </span>
          ))}
          {ae.remainingDays > 0 && ` \u2022 ${ae.remainingDays}d duration`}
        </div>
      )}

      {/* Choices */}
      {event.choices && event.choices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim,
            textAlign: 'center', letterSpacing: '0.1em', marginBottom: 4,
          }}>CHOOSE YOUR RESPONSE</div>
          {event.choices.map((choice, i) => {
            const budgetEffect = choice.effects.find((e) => e.type === 'budget');
            const rageEffect = choice.effects.find((e) => e.type === 'rage');
            const heatEffect = choice.effects.find((e) => e.type === 'heat');

            return (
              <button key={i} onClick={() => onChoice(event.id, i)} style={{
                padding: '14px 16px', background: i === 0 ? tokens.color.raised : tokens.color.surface,
                border: `1px solid ${i === 0 ? `${color}30` : tokens.color.border}`,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                minHeight: 44,
              }}>
                <div style={{ fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, color: tokens.color.text }}>
                  {choice.label}
                </div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 11, color: tokens.color.muted, marginTop: 2 }}>
                  {choice.description}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontFamily: tokens.font.mono, fontSize: 9 }}>
                  {budgetEffect && (
                    <span style={{ color: budgetEffect.value >= 0 ? tokens.color.green : tokens.color.red }}>
                      {budgetEffect.value >= 0 ? '+' : ''}R{Math.abs(budgetEffect.value)}M
                    </span>
                  )}
                  {rageEffect && (
                    <span style={{ color: rageEffect.value > 0 ? tokens.color.red : tokens.color.green }}>
                      Rage {rageEffect.value > 0 ? '+' : ''}{rageEffect.value}
                    </span>
                  )}
                  {heatEffect && (
                    <span style={{ color: tokens.color.amber }}>
                      Heat {heatEffect.value > 0 ? '+' : ''}{heatEffect.value}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
