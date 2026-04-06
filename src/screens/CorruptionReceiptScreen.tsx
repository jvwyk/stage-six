import { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';
import { MeterBar } from '../components/shared/MeterBar';
import { formatMoney } from '../utils/format';
import type { GameState } from '../data/types';
import { calculateFinalScore, assignTitle, generateShareText } from '../engine/ScoringEngine';
import { BALANCING } from '../data/balancing';

interface CorruptionReceiptScreenProps {
  game: GameState;
  onRestart: () => void;
  onTitle: () => void;
}

export function CorruptionReceiptScreen({ game, onRestart, onTitle }: CorruptionReceiptScreenProps) {
  const totalSkim = game.corruptionLog.reduce((a, c) => a + c.skimAmount, 0);
  const [reveal, setReveal] = useState(false);
  const score = calculateFinalScore(game);
  const title = assignTitle(game);
  const shareText = generateShareText(game, title, score.total);

  useEffect(() => { setTimeout(() => setReveal(true), 200); }, []);

  const copyShare = () => {
    navigator.clipboard.writeText(shareText).catch(() => {});
  };

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, padding: 20, display: 'flex', flexDirection: 'column',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px', ...staggeredFadeUp(0) }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted, letterSpacing: '0.15em' }}>
          GAME OVER {'\u2014'} DAY {game.day}/{BALANCING.TOTAL_DAYS}
        </div>
        <div style={{ fontFamily: tokens.font.display, fontSize: 20, color: tokens.color.red, letterSpacing: '0.04em', marginTop: 4 }}>
          ARRESTED FOR CORRUPTION
        </div>
      </div>

      {/* Player Title Card */}
      <Card style={{
        ...staggeredFadeUp(1), textAlign: 'center',
        border: `1px solid ${tokens.color.gold}25`,
        background: `linear-gradient(180deg, ${tokens.color.gold}08, transparent)`,
      }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, letterSpacing: '0.12em' }}>YOUR TITLE</div>
        <div style={{ fontFamily: tokens.font.display, fontSize: 36, color: tokens.color.gold, letterSpacing: '0.05em', marginTop: 2 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.muted, marginTop: 4 }}>
          Lasted {game.day} days {'\u2022'} Stole from {game.corruptionLog.length} contracts
        </div>
      </Card>

      {/* THE RECEIPT */}
      <Card style={{
        ...staggeredFadeUp(2), marginTop: 12, background: '#0d0d10',
        border: `1px dashed ${tokens.color.border}`, fontFamily: tokens.font.mono, padding: '16px 14px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px dashed ${tokens.color.border}` }}>
          <div style={{ fontSize: 10, color: tokens.color.dim, letterSpacing: '0.15em' }}>{'\u2550'.repeat(10)} CORRUPTION RECEIPT {'\u2550'.repeat(10)}</div>
          <div style={{ fontSize: 8, color: tokens.color.dim, marginTop: 4 }}>NATIONAL PROSECUTING AUTHORITY</div>
          <div style={{ fontSize: 8, color: tokens.color.dim }}>EXHIBIT A {'\u2014'} STATE vs. PLAYER</div>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontSize: 8, color: tokens.color.dim,
          paddingBottom: 4, borderBottom: `1px solid ${tokens.color.border}`,
        }}>
          <span>DAY</span>
          <span style={{ flex: 1, textAlign: 'left', marginLeft: 12 }}>OFFENCE</span>
          <span>SKIM</span>
          <span style={{ marginLeft: 8 }}>HEAT</span>
        </div>

        {/* Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {game.corruptionLog.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tokens.color.muted,
              padding: '5px 0', borderBottom: `1px solid ${tokens.color.border}08`,
              animation: reveal ? `fadeUp 0.3s ease ${(i + 3) * 80}ms both` : 'none',
            }}>
              <span style={{ color: tokens.color.dim, minWidth: 24 }}>{item.day}</span>
              <span style={{ flex: 1, textAlign: 'left', marginLeft: 12 }}>{item.action}</span>
              <span style={{ color: tokens.color.goldBright, fontWeight: 700 }}>+{formatMoney(item.skimAmount)}</span>
              <span style={{ color: tokens.color.amber, marginLeft: 8, minWidth: 30, textAlign: 'right' }}>+{item.heatAdded}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${tokens.color.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: tokens.color.muted }}>TOTAL STOLEN</span>
          <span style={{ fontSize: 20, color: tokens.color.goldBright, fontWeight: 800 }}>{formatMoney(totalSkim)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: tokens.color.red }}>STATUS</span>
          <span style={{ fontSize: 10, color: tokens.color.red, fontWeight: 700 }}>ALL ASSETS SEIZED</span>
        </div>
      </Card>

      {/* Score */}
      <Card style={{ ...staggeredFadeUp(3), marginTop: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Grid Stability', value: score.stability, color: score.stability < 40 ? tokens.color.red : tokens.color.amber },
            { label: 'Personal Wealth', value: score.wealth, color: tokens.color.gold },
            { label: 'Public Trust', value: score.trust, color: score.trust < 30 ? tokens.color.red : tokens.color.amber },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.muted }}>{s.label}</span>
                <span style={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}/100</span>
              </div>
              <MeterBar value={s.value} color={s.color} height={5} />
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: 12, background: tokens.color.raised, borderRadius: 8, marginTop: 4 }}>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, letterSpacing: '0.1em' }}>FINAL SCORE</div>
            <div style={{ fontFamily: tokens.font.display, fontSize: 48, color: tokens.color.text }}>{score.total}</div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim }}>/ 100</div>
          </div>
        </div>
      </Card>

      {/* Share Card */}
      <Card style={{ ...staggeredFadeUp(4), marginTop: 12, background: tokens.color.raised, textAlign: 'center' }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, letterSpacing: '0.1em', marginBottom: 8 }}>
          SHARE YOUR CRIMINAL RECORD
        </div>
        <div style={{
          padding: 14, background: tokens.color.surface, borderRadius: 8,
          fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.muted,
          lineHeight: 1.8, textAlign: 'left', whiteSpace: 'pre-wrap',
        }}>
          {shareText}
        </div>
        <button onClick={copyShare} style={{
          marginTop: 10, padding: '10px 24px', background: tokens.color.gold, color: tokens.color.bg,
          border: 'none', borderRadius: 8, fontFamily: tokens.font.body, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Copy {'\u{1F4E4}'}
        </button>
      </Card>

      {/* Actions */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        marginTop: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        ...staggeredFadeUp(5),
      }}>
        <button onClick={onRestart} style={{
          width: '100%', padding: 15,
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          Try Again {'\u2014'} Beat {formatMoney(totalSkim)}
        </button>
        <button onClick={onTitle} style={{
          width: '100%', padding: 13, background: 'transparent', color: tokens.color.muted,
          border: `1px solid ${tokens.color.border}`, borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 13, cursor: 'pointer',
        }}>
          Back to Title
        </button>
      </div>
    </div>
  );
}
