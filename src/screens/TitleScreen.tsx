import { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { loadCurrentRun } from '../utils/storage';

interface TitleScreenProps {
  onStart: () => void;
  onResume: () => void;
  onHistory: () => void;
  onHowTo: () => void;
}

export function TitleScreen({ onStart, onResume, onHistory, onHowTo }: TitleScreenProps) {
  const [show, setShow] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 150);
    setHasRun(loadCurrentRun() !== null);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: `radial-gradient(ellipse at 50% 25%, ${tokens.color.goldDim}30 0%, ${tokens.color.bg} 55%)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${tokens.color.gold} 1px, transparent 1px), linear-gradient(90deg, ${tokens.color.gold} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      {/* Scanline */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
      }} />

      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 1,
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(40px)',
        transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ fontSize: 44, marginBottom: 4, animation: 'flicker 4s infinite' }}>{'\u26A1'}</div>
        <h1 style={{
          fontFamily: tokens.font.display,
          fontSize: 'clamp(76px, 20vw, 130px)',
          color: tokens.color.text,
          lineHeight: 0.85,
          letterSpacing: '0.05em',
          textShadow: `0 0 80px ${tokens.color.gold}25`,
        }}>STAGE 6</h1>
        <p style={{
          fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.gold,
          letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 6, fontWeight: 500,
        }}>You're in charge now</p>

        <div style={{
          margin: '28px auto', maxWidth: 300, padding: '16px 20px',
          background: tokens.color.surface, border: `1px solid ${tokens.color.gold}20`, borderRadius: 10,
        }}>
          <p style={{
            fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.muted, lineHeight: 1.7,
          }}>
            The grid is failing. The country needs you.<br />
            <span style={{ color: tokens.color.gold, fontWeight: 600 }}>But you didn't take this job to be a hero.</span>
          </p>
          <div style={{
            marginTop: 12, padding: '8px 12px', background: tokens.color.raised, borderRadius: 6,
            fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.dim, textAlign: 'left', lineHeight: 1.8,
          }}>
            <span style={{ color: tokens.color.green }}>{'\u{1F4B0}'} Skim contracts</span><br />
            <span style={{ color: tokens.color.amber }}>{'\u{1F525}'} Manage your Heat</span><br />
            <span style={{ color: tokens.color.red }}>{'\u{1F4F0}'} Don't get caught</span>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 20, justifyContent: 'center',
          fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginBottom: 28,
        }}>
          <span>30 DAYS</span>
          <span style={{ color: tokens.color.border }}>|</span>
          <span>5 REGIONS</span>
          <span style={{ color: tokens.color.border }}>|</span>
          <span>{'\u221E'} GREED</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <button onClick={onStart} style={{
            padding: '16px 56px',
            background: `linear-gradient(135deg, ${tokens.color.gold}, ${tokens.color.goldBright})`,
            color: tokens.color.bg, border: 'none', borderRadius: 10,
            fontFamily: tokens.font.body, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: `0 0 40px ${tokens.color.gold}30, 0 4px 20px rgba(0,0,0,0.5)`,
          }}>
            Take Control
          </button>

          {hasRun && (
            <button onClick={onResume} style={{
              padding: '12px 40px', background: tokens.color.raised, color: tokens.color.text,
              border: `1px solid ${tokens.color.border}`, borderRadius: 10,
              fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Resume Game
            </button>
          )}

          <button onClick={onHistory} style={{
            padding: '10px 30px', background: 'transparent', color: tokens.color.muted,
            border: 'none', fontFamily: tokens.font.mono, fontSize: 11, cursor: 'pointer',
          }}>
            Run History
          </button>

          <button onClick={onHowTo} style={{
            padding: '10px 30px', background: 'transparent', color: tokens.color.gold,
            border: 'none', fontFamily: tokens.font.mono, fontSize: 11, cursor: 'pointer',
          }}>
            How to Play
          </button>
        </div>

        <div style={{
          marginTop: 10, fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim,
        }}>
          How much can you steal before it all collapses?
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 16px', background: `${tokens.color.red}10`,
        borderTop: `1px solid ${tokens.color.red}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span style={{ animation: 'blink 1s infinite', color: tokens.color.red, fontSize: 8 }}>{'\u25CF'}</span>
        <span style={{
          fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.red, letterSpacing: '0.12em',
        }}>
          NATIONAL GRID STATUS: CRITICAL {'\u2014'} STAGE 4 LOAD SHEDDING IN EFFECT
        </span>
      </div>
    </div>
  );
}
