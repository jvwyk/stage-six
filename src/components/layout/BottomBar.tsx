import { tokens } from '../../styles/tokens';

interface BottomBarProps {
  day: number;
  onEndDay: () => void;
  onMenu?: () => void;
}

export function BottomBar({ day, onEndDay }: BottomBarProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      padding: '0 16px 0',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      background: `linear-gradient(transparent 0%, ${tokens.color.bg} 40%)`,
    }}>
      <button
        onClick={onEndDay}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg,
          border: 'none',
          borderRadius: 10,
          fontFamily: tokens.font.body,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.03em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span>End Day {day}</span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>\u2192</span>
      </button>
    </div>
  );
}
