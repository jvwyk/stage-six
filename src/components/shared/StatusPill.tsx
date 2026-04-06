import type { ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

interface StatusPillProps {
  children: ReactNode;
  color?: string;
  pulse?: boolean;
}

export function StatusPill({ children, color = tokens.color.muted, pulse }: StatusPillProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: 4,
      fontFamily: tokens.font.mono,
      fontSize: 9,
      fontWeight: 700,
      color,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {pulse && (
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          animation: 'pulse 1.2s infinite',
        }} />
      )}
      {children}
    </span>
  );
}
