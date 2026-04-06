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
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      background: tokens.color.surface,
      borderBottom: `1px solid ${tokens.color.border}`,
      padding: '0 8px',
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
              fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 700,
              color: isActive ? tokens.color.gold : tokens.color.dim,
              letterSpacing: '0.06em',
            }}>
              {tab.icon} {tab.label}
            </div>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: '20%',
                background: tokens.color.red, color: '#fff',
                fontSize: 8, fontWeight: 800, fontFamily: tokens.font.mono,
                borderRadius: 8, padding: '1px 5px', minWidth: 14,
                textAlign: 'center', lineHeight: '14px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
