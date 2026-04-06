import type { ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
}

export function BottomSheet({ children, onClose }: BottomSheetProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          background: tokens.color.surface,
          borderRadius: '18px 18px 0 0',
          padding: '20px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          border: `1px solid ${tokens.color.gold}20`,
          borderBottom: 'none',
          animation: 'slideSheet 0.3s ease',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36,
          height: 4,
          background: tokens.color.border,
          borderRadius: 2,
          margin: '0 auto 20px',
        }} />
        {children}
      </div>
    </div>
  );
}
