import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  glow?: string;
}

export function Card({ children, style, onClick, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: tokens.color.surface,
        border: `1px solid ${glow || tokens.color.border}`,
        borderRadius: 12,
        padding: 16,
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
