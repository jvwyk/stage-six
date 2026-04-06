import { tokens } from '../../styles/tokens';
import { BottomSheet } from '../layout/BottomSheet';

interface PauseMenuProps {
  canFlee: boolean;
  onResume: () => void;
  onFlee: () => void;
  onAbandon: () => void;
  onTitle: () => void;
}

export function PauseMenu({ canFlee, onResume, onFlee, onAbandon, onTitle }: PauseMenuProps) {
  return (
    <BottomSheet onClose={onResume}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: tokens.font.display, fontSize: 24, letterSpacing: '0.04em' }}>MENU</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onResume} style={{
          padding: '14px 20px',
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          Resume Game
        </button>

        {canFlee && (
          <button onClick={onFlee} style={{
            padding: '14px 20px', background: `${tokens.color.amber}15`,
            color: tokens.color.amber, border: `1px solid ${tokens.color.amber}30`,
            borderRadius: 10, fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {'\u2708\uFE0F'} Flee the Country (keep 40% of bag)
          </button>
        )}

        <button onClick={onTitle} style={{
          padding: '14px 20px', background: tokens.color.raised, color: tokens.color.text,
          border: `1px solid ${tokens.color.border}`, borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Save & Quit
        </button>

        <button onClick={onAbandon} style={{
          padding: '12px 20px', background: 'transparent', color: tokens.color.red,
          border: 'none', fontFamily: tokens.font.mono, fontSize: 11, cursor: 'pointer',
        }}>
          Abandon Run
        </button>
      </div>
    </BottomSheet>
  );
}
