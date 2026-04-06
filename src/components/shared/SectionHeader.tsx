import type { ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

interface SectionHeaderProps {
  children: ReactNode;
  icon?: string;
  action?: ReactNode;
}

export function SectionHeader({ children, icon, action }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingBottom: 6,
      borderBottom: `1px solid ${tokens.color.border}`,
    }}>
      <span style={{
        fontFamily: tokens.font.mono,
        fontSize: 10,
        fontWeight: 700,
        color: tokens.color.muted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
        {children}
      </span>
      {action}
    </div>
  );
}
