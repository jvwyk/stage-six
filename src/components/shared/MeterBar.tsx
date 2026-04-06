import type { CSSProperties } from 'react';
import { tokens } from '../../styles/tokens';

interface MeterBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  glow?: boolean;
  label?: string;
}

export function MeterBar({ value, max = 100, color = tokens.color.gold, height = 5, glow, label }: MeterBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  const trackStyle: CSSProperties = {
    flex: 1,
    height,
    background: tokens.color.border,
    borderRadius: height / 2,
    overflow: 'hidden',
    boxShadow: glow ? `0 0 10px ${color}25` : 'none',
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${pct}%`,
    background: color,
    borderRadius: height / 2,
    transition: 'width 0.5s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      {label && (
        <span style={{
          fontFamily: tokens.font.mono,
          fontSize: 10,
          color,
          fontWeight: 700,
          minWidth: 30,
          textAlign: 'right',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
