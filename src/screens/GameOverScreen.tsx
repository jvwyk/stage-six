import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';
import { MeterBar } from '../components/shared/MeterBar';
import { formatMoney } from '../utils/format';
import type { GameState, EndReason } from '../data/types';
import { copyToClipboard } from '../utils/share';
import { calculateFinalScore, assignTitle, generateShareText } from '../engine/ScoringEngine';
import { BALANCING } from '../data/balancing';

interface GameOverScreenProps {
  game: GameState;
  onRestart: () => void;
  onTitle: () => void;
}

const REASON_LABELS: Record<EndReason, { title: string; icon: string }> = {
  heat: { title: 'ARRESTED FOR CORRUPTION', icon: '\u{1F6A8}' },
  rage: { title: 'OVERTHROWN BY THE PEOPLE', icon: '\u270A' },
  collapse: { title: 'TOTAL GRID COLLAPSE', icon: '\u{1F4A5}' },
  bankrupt: { title: 'GRID WENT BANKRUPT', icon: '\u{1F4B8}' },
  survived: { title: 'YOU SURVIVED!', icon: '\u{1F3C6}' },
  fled: { title: 'FLED THE COUNTRY', icon: '\u2708\uFE0F' },
};

export function GameOverScreen({ game, onRestart, onTitle }: GameOverScreenProps) {
  const reason = game.gameOverReason || 'survived';
  const reasonInfo = REASON_LABELS[reason];
  const score = calculateFinalScore(game);
  const title = assignTitle(game);
  const shareText = generateShareText(game, title, score.total);
  const isSurvived = reason === 'survived';

  const copyShare = () => {
    copyToClipboard(shareText);
  };

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, padding: 20, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '28px 0 20px', ...staggeredFadeUp(0) }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{reasonInfo.icon}</div>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted, letterSpacing: '0.15em' }}>
          DAY {game.day}/{BALANCING.TOTAL_DAYS}
        </div>
        <div style={{
          fontFamily: tokens.font.display, fontSize: 24,
          color: isSurvived ? tokens.color.gold : tokens.color.red,
          letterSpacing: '0.04em', marginTop: 4,
        }}>
          {reasonInfo.title}
        </div>
      </div>

      {/* Title Card */}
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
          {game.day} days {'\u2022'} {formatMoney(game.bag)} stolen {'\u2022'} {game.corruptionLog.length} deals
        </div>
      </Card>

      {/* Score */}
      <Card style={{ ...staggeredFadeUp(2), marginTop: 12 }}>
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

      {/* Share */}
      <Card style={{ ...staggeredFadeUp(3), marginTop: 12, background: tokens.color.raised, textAlign: 'center' }}>
        <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, letterSpacing: '0.1em', marginBottom: 8 }}>
          SHARE YOUR RECORD
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
        ...staggeredFadeUp(4),
      }}>
        <button onClick={onRestart} style={{
          width: '100%', padding: 15,
          background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
          color: tokens.color.bg, border: 'none', borderRadius: 10,
          fontFamily: tokens.font.body, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          Try Again
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
