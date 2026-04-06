import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';
import { StatusPill } from '../components/shared/StatusPill';
import { formatMoney } from '../utils/format';
import type { CompletedRun, AggregateStats } from '../data/types';

interface RunHistoryScreenProps {
  runs: CompletedRun[];
  stats: AggregateStats;
  onBack: () => void;
  onClear: () => void;
}

const reasonColors: Record<string, string> = {
  heat: tokens.color.red,
  rage: tokens.color.amber,
  collapse: tokens.color.red,
  bankrupt: tokens.color.amber,
  survived: tokens.color.green,
};

export function RunHistoryScreen({ runs, stats, onBack, onClear }: RunHistoryScreenProps) {
  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, padding: 16, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, ...staggeredFadeUp(0) }}>
        <button onClick={onBack} style={{
          background: tokens.color.raised, border: `1px solid ${tokens.color.border}`,
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: tokens.color.muted,
          fontFamily: tokens.font.mono, fontSize: 12,
        }}>{'\u2190'}</button>
        <div>
          <div style={{ fontFamily: tokens.font.display, fontSize: 24, letterSpacing: '0.04em' }}>RUN HISTORY</div>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim }}>
            {stats.totalRuns} runs {'\u2022'} {stats.totalDaysPlayed} days played
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      {stats.totalRuns > 0 && (
        <Card style={{ ...staggeredFadeUp(1), marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, letterSpacing: '0.1em' }}>BEST SCORE</div>
              <div style={{ fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.gold }}>{stats.bestScore}</div>
            </div>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, letterSpacing: '0.1em' }}>TOTAL STOLEN</div>
              <div style={{ fontFamily: tokens.font.serif, fontSize: 18, color: tokens.color.goldBright, fontWeight: 900 }}>{formatMoney(stats.totalStolen)}</div>
            </div>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, letterSpacing: '0.1em' }}>LONGEST RUN</div>
              <div style={{ fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.text }}>{stats.longestSurvival}d</div>
            </div>
          </div>
        </Card>
      )}

      {/* Run List */}
      {runs.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: tokens.color.dim, fontFamily: tokens.font.mono, fontSize: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F4CA}'}</div>
          No runs yet. Start your first game!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...runs].reverse().map((run, i) => (
            <Card key={run.runId} style={{ ...staggeredFadeUp(i + 2), padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{run.title}</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>
                    Day {run.day}/30 {'\u2022'} {new Date(run.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: tokens.font.display, fontSize: 22, color: tokens.color.text }}>{run.score}</div>
                  <StatusPill color={reasonColors[run.endReason] || tokens.color.muted}>
                    {run.endReason}
                  </StatusPill>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 16, marginTop: 8,
                fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.muted,
              }}>
                <span style={{ color: tokens.color.goldBright }}>{'\u{1F4B0}'} {formatMoney(run.bag)}</span>
                <span>{run.corruptionLog.length} deals</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Clear Button */}
      {runs.length > 0 && (
        <div style={{ marginTop: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button onClick={onClear} style={{
            width: '100%', padding: 12, background: 'transparent',
            color: tokens.color.dim, border: `1px solid ${tokens.color.border}`,
            borderRadius: 10, fontFamily: tokens.font.mono, fontSize: 11, cursor: 'pointer',
          }}>
            Clear History
          </button>
        </div>
      )}
    </div>
  );
}
