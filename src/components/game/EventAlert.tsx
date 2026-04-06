import { tokens } from '../../styles/tokens';
import { StatusPill } from '../shared/StatusPill';
import type { ActiveEvent } from '../../data/types';

interface EventAlertProps {
  event: ActiveEvent;
  onChoice?: (eventId: string, choiceIndex: number) => void;
}

const severityColors: Record<string, string> = {
  info: tokens.color.blue,
  warning: tokens.color.amber,
  critical: tokens.color.red,
};

export function EventAlert({ event: ae, onChoice }: EventAlertProps) {
  const { event } = ae;
  const color = severityColors[event.severity] || tokens.color.muted;
  const hasChoices = event.choices && event.choices.length > 0 && ae.choiceMade === undefined;

  return (
    <div style={{
      padding: 12, background: `${color}08`, border: `1px solid ${color}20`,
      borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{event.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tokens.color.text }}>{event.title}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              <StatusPill color={color}>{event.severity}</StatusPill>
              {ae.remainingDays > 0 && (
                <StatusPill color={tokens.color.muted}>{ae.remainingDays}d left</StatusPill>
              )}
            </div>
          </div>
        </div>
      </div>

      <p style={{
        fontFamily: tokens.font.body, fontSize: 11, color: tokens.color.muted, lineHeight: 1.5,
      }}>{event.description}</p>

      {/* Choice buttons */}
      {hasChoices && event.choices && onChoice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {event.choices.map((choice, i) => (
            <button key={i} onClick={() => onChoice(event.id, i)} style={{
              padding: '10px 14px', background: tokens.color.raised,
              border: `1px solid ${tokens.color.border}`, borderRadius: 8,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontFamily: tokens.font.body, fontSize: 12, fontWeight: 600, color: tokens.color.text }}>
                {choice.label}
              </div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>
                {choice.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {ae.choiceMade !== undefined && event.choices && (
        <div style={{
          fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim,
          padding: '6px 10px', background: tokens.color.raised, borderRadius: 6,
        }}>
          Choice made: {event.choices[ae.choiceMade]?.label}
        </div>
      )}
    </div>
  );
}
