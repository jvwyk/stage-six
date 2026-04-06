import { tokens } from '../../styles/tokens';

interface BottomBarProps {
  day: number;
  onEndDay: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function BottomBar({ day, onEndDay, disabled, disabledReason }: BottomBarProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: '0 16px 0',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      background: `linear-gradient(transparent 0%, ${tokens.color.bg} 40%)`,
    }}>
      {disabledReason && disabled && (
        <div style={{
          textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 9,
          color: tokens.color.amber, marginBottom: 4,
        }}>
          {'\u26A0\uFE0F'} {disabledReason}
        </div>
      )}
      <button onClick={disabled ? undefined : onEndDay} style={{
        width: '100%', padding: '14px 20px',
        background: disabled
          ? tokens.color.raised
          : `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
        color: disabled ? tokens.color.dim : tokens.color.bg,
        border: disabled ? `1px solid ${tokens.color.border}` : 'none',
        borderRadius: 10, fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.03em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span>End Day {day}</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{'\u2192'}</span>
      </button>
    </div>
  );
}
