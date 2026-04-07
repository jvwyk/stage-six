import { tokens } from '../../styles/tokens';

interface Tab {
  label: string;
  icon: string;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: number;
  onTabChange: (index: number) => void;
  onMenuClick?: () => void;
}

export function TabBar({ tabs, activeTab, onTabChange, onMenuClick }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      background: tokens.color.surface,
      borderBottom: `1px solid ${tokens.color.border}`,
      padding: '0 4px',
    }}>
      {tabs.map((tab, i) => {
        const isActive = i === activeTab;
        return (
          <button key={i} onClick={() => onTabChange(i)} style={{
            flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none',
            borderBottom: `2px solid ${isActive ? tokens.color.gold : 'transparent'}`,
            cursor: 'pointer', textAlign: 'center', position: 'relative',
            minHeight: 44,
          }}>
            <div style={{
              fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 700,
              color: isActive ? tokens.color.gold : tokens.color.dim,
              letterSpacing: '0.04em',
            }}>
              {tab.icon} {tab.label}
            </div>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: '15%',
                background: tokens.color.red, color: '#fff',
                fontSize: 7, fontWeight: 800, fontFamily: tokens.font.mono,
                borderRadius: 8, padding: '1px 4px', minWidth: 12,
                textAlign: 'center', lineHeight: '12px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
      {onMenuClick && (
        <button onClick={onMenuClick} style={{
          width: 44, minHeight: 44, background: 'none', border: 'none',
          borderBottom: '2px solid transparent', cursor: 'pointer',
          fontFamily: tokens.font.mono, fontSize: 16, color: tokens.color.dim,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {'\u22EF'}
        </button>
      )}
    </div>
  );
}
