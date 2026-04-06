import { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { formatMoney } from '../utils/format';

interface BreakingNewsScreenProps {
  bag: number;
  day: number;
  onReceipt: () => void;
}

export function BreakingNewsScreen({ bag, day, onReceipt }: BreakingNewsScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Red flash overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: tokens.color.red,
        opacity: phase === 0 ? 0.15 : 0, transition: 'opacity 0.5s', pointerEvents: 'none',
      }} />

      {/* Breaking news banner */}
      <div style={{
        position: 'absolute', top: 80, left: 0, right: 0, padding: '12px 0',
        background: tokens.color.red, overflow: 'hidden',
        opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.3s',
      }}>
        <div style={{
          fontFamily: tokens.font.display, fontSize: 18, color: '#fff',
          letterSpacing: '0.15em', textAlign: 'center',
          animation: phase >= 1 ? 'shake 0.3s ease' : 'none',
        }}>
          {'\u26A1'} BREAKING NEWS {'\u26A1'}
        </div>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 340, position: 'relative', zIndex: 1 }}>
        {/* Newspaper style */}
        <div style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'none' : 'scale(0.9)',
          transition: 'all 0.5s ease',
        }}>
          <div style={{
            fontFamily: tokens.font.serif, fontSize: 11, color: tokens.color.muted,
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
          }}>The Daily Maverick</div>
          <h1 style={{
            fontFamily: tokens.font.serif, fontSize: 32, color: tokens.color.text,
            lineHeight: 1.15, fontWeight: 900,
          }}>
            Grid Controller Arrested In {formatMoney(bag)} Corruption Scandal
          </h1>
        </div>

        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'none' : 'translateY(10px)',
          transition: 'all 0.5s ease 0.2s',
        }}>
          <p style={{
            fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.muted,
            lineHeight: 1.7, marginTop: 16,
          }}>
            Hawks officials confirmed the arrest following a {day}-day investigation into inflated procurement contracts and misappropriated emergency funds at the national utility.
          </p>
          <p style={{
            fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.dim,
            lineHeight: 1.7, marginTop: 10, fontStyle: 'italic',
          }}>
            "The scale of theft is staggering," said the lead investigator. "While South Africans sat in the dark, billions were being siphoned into offshore accounts."
          </p>
        </div>

        {/* BUSTED stamp */}
        <div style={{
          opacity: phase >= 3 ? 1 : 0,
          animation: phase >= 3 ? 'stampIn 0.4s ease' : 'none',
          marginTop: 24,
        }}>
          <div style={{
            display: 'inline-block', padding: '12px 32px',
            border: `4px solid ${tokens.color.red}`, borderRadius: 8,
            transform: 'rotate(-5deg)',
          }}>
            <span style={{
              fontFamily: tokens.font.display, fontSize: 48, color: tokens.color.red, letterSpacing: '0.08em',
            }}>BUSTED</span>
          </div>
        </div>

        {/* Seized */}
        <div style={{
          opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.5s ease 0.3s', marginTop: 20,
        }}>
          <div style={{
            padding: 14, background: tokens.color.raised,
            border: `1px solid ${tokens.color.red}25`, borderRadius: 10,
          }}>
            <div style={{
              fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.red,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4,
            }}>ASSETS SEIZED</div>
            <div style={{
              fontFamily: tokens.font.serif, fontSize: 28, fontWeight: 900,
              color: tokens.color.red, textDecoration: 'line-through',
              textDecorationColor: tokens.color.red,
            }}>{formatMoney(bag)}</div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginTop: 4 }}>
              All offshore accounts frozen
            </div>
          </div>
        </div>

        <div style={{ opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.5s ease 0.5s', marginTop: 20 }}>
          <button onClick={onReceipt} style={{
            width: '100%', padding: 14, background: tokens.color.raised, color: tokens.color.text,
            border: `1px solid ${tokens.color.border}`, borderRadius: 10,
            fontFamily: tokens.font.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            View Your Corruption Receipt {'\u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
