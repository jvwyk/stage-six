import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  style?: CSSProperties;
  disabled?: boolean;
}

export function Button({ children, onClick, variant = 'primary', fullWidth, style, disabled }: ButtonProps) {
  const baseStyle: CSSProperties = {
    padding: '14px 20px',
    border: 'none',
    borderRadius: 10,
    fontFamily: tokens.font.body,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    letterSpacing: '0.03em',
    textAlign: 'center',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  const variants: Record<string, CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
      color: tokens.color.bg,
      boxShadow: `0 0 40px ${tokens.color.gold}30, 0 4px 20px rgba(0,0,0,0.5)`,
    },
    secondary: {
      background: tokens.color.raised,
      color: tokens.color.text,
      border: `1px solid ${tokens.color.border}`,
    },
    ghost: {
      background: 'transparent',
      color: tokens.color.dim,
      padding: '12px 20px',
      fontSize: 11,
      fontFamily: tokens.font.mono,
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...baseStyle, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}
