import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { TopBar } from '../components/layout/TopBar';
import { BottomBar } from '../components/layout/BottomBar';
import { Card } from '../components/shared/Card';
import { SectionHeader } from '../components/shared/SectionHeader';
import { StatusPill } from '../components/shared/StatusPill';
import { MeterBar } from '../components/shared/MeterBar';
import { EventAlert } from '../components/game/EventAlert';
import { formatMoney, formatMW } from '../utils/format';
import { calculateMinimumStage } from '../engine/SimulationEngine';
import { getAvailableCapacity } from '../engine/PlantEngine';
import { BALANCING } from '../data/balancing';
import type { GameState, Opportunity } from '../data/types';

interface DashboardScreenProps {
  game: GameState;
  onDealClick: (opportunity: Opportunity) => void;
  onEndDay: () => void;
  onPlants: () => void;
  onStageChange: (stage: number) => void;
  onActivateDiesel: (plantId: string) => void;
  onEventChoice: (eventId: string, choiceIndex: number) => void;
  onIncreaseTariff: () => void;
  onRequestBailout: () => void;
  onMenu: () => void;
}

export function DashboardScreen({
  game, onDealClick, onEndDay, onPlants, onStageChange, onActivateDiesel, onEventChoice,
  onIncreaseTariff, onRequestBailout, onMenu,
}: DashboardScreenProps) {
  const totalSupply = game.plants.reduce((sum, p) =>
    (p.status === 'online' || p.status === 'derated') ? sum + p.currentOutput : sum, 0);
  const totalDemand = game.regions.reduce((sum, r) => sum + r.currentDemand, 0);
  const deficit = totalDemand - totalSupply;
  const lastSkim = game.corruptionLog.length > 0
    ? game.corruptionLog[game.corruptionLog.length - 1].skimAmount : 0;

  // Check which deals have already been decided
  const decidedIds = new Set(game.playerActions.deals.map((d) => d.opportunityId));
  const pendingOpportunities = game.todaysOpportunities.filter((o) => !decidedIds.has(o.id));

  // Calculate minimum and recommended stages
  const availableSupply = getAvailableCapacity(game.plants);
  const { minimumStage, recommendedStage } = calculateMinimumStage(availableSupply, totalDemand);

  const riskColors: Record<string, string> = {
    low: tokens.color.green,
    med: tokens.color.amber,
    high: tokens.color.red,
    extreme: tokens.color.red,
  };

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, display: 'flex', flexDirection: 'column',
    }}>
      <TopBar
        day={game.day}
        budget={game.budget}
        bag={game.bag}
        lastSkim={lastSkim}
        heat={game.heat}
        rage={game.rage}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Supply/Demand + Stage */}
        <Card style={staggeredFadeUp(0)}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8,
            alignItems: 'center', textAlign: 'center',
          }}>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>SUPPLY</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.green }}>{formatMW(totalSupply)}</div>
            </div>
            <div style={{
              padding: '8px 14px',
              background: game.currentStage >= 6 ? tokens.color.red : game.currentStage >= 4 ? tokens.color.amber : tokens.color.green,
              borderRadius: 8,
            }}>
              <div style={{
                fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.bg,
                letterSpacing: '0.04em', lineHeight: 1,
              }}>S{game.currentStage}</div>
            </div>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>DEMAND</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.red }}>{formatMW(totalDemand)}</div>
            </div>
          </div>
          <div style={{
            marginTop: 8, textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.red,
          }}>
            DEFICIT: {formatMW(Math.max(0, deficit))} {'\u2022'} SHEDDING {game.currentStage * 5}%
          </div>

          {/* Stage Selector */}
          {game.currentStage < recommendedStage && (
            <div style={{
              marginTop: 8, padding: '6px 10px', background: `${tokens.color.amber}10`,
              border: `1px solid ${tokens.color.amber}20`, borderRadius: 6, textAlign: 'center',
              fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber,
            }}>
              {'\u26A0\uFE0F'} Supply deficit — stage {recommendedStage}+ recommended
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center' }}>
            {Array.from({ length: 9 }, (_, i) => {
              const isDisabled = i < minimumStage;
              const isActive = i === game.currentStage;
              const isRecommended = i === recommendedStage;
              return (
                <button key={i} onClick={() => !isDisabled && onStageChange(i)} style={{
                  minWidth: 38, minHeight: 44,
                  background: isActive
                    ? (i >= 6 ? tokens.color.red : i >= 4 ? tokens.color.amber : tokens.color.green)
                    : tokens.color.raised,
                  color: isDisabled ? `${tokens.color.dim}40` : isActive ? tokens.color.bg : tokens.color.dim,
                  border: `1px solid ${isActive ? 'transparent' : isRecommended ? `${tokens.color.amber}50` : tokens.color.border}`,
                  borderRadius: 6, cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700,
                  opacity: isDisabled ? 0.4 : 1,
                }}>
                  {isDisabled ? '\u{1F512}' : i}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Today's Opportunities */}
        {pendingOpportunities.length > 0 && (
          <div style={staggeredFadeUp(1)}>
            <SectionHeader icon={'\u{1F4BC}'}>Today's Opportunities</SectionHeader>
            <div style={{
              fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim,
              marginBottom: 10, marginTop: -4,
            }}>
              Risk it for the biscuit {'\u2014'} or play it clean for R0.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingOpportunities.map((op, i) => (
                <div key={op.id} onClick={() => onDealClick(op)} style={{
                  padding: 14, background: tokens.color.raised, borderRadius: 10,
                  border: `1px solid ${(riskColors[op.riskLevel] || tokens.color.border)}20`,
                  cursor: 'pointer',
                  ...staggeredFadeUp(i + 2),
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{op.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: tokens.color.text }}>{op.title}</div>
                        <StatusPill color={riskColors[op.riskLevel]}>{op.riskLevel} risk</StatusPill>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: tokens.font.serif, fontSize: 20, fontWeight: 900, color: tokens.color.goldBright,
                      }}>+{formatMoney(op.skimAmount)}</div>
                      <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber }}>+{op.heatCost} heat</div>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.muted,
                    lineHeight: 1.5, marginBottom: 6,
                  }}>{op.description}</p>
                  <div style={{
                    fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim,
                    padding: '4px 8px', background: tokens.color.surface, borderRadius: 4, display: 'inline-block',
                  }}>
                    Grid: {op.gridEffectLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Events */}
        {game.activeEvents.length > 0 && (
          <div style={staggeredFadeUp(4)}>
            <SectionHeader icon={'\u26A0\uFE0F'}>Active Events</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {game.activeEvents.map((ae) => (
                <EventAlert key={ae.event.id} event={ae} onChoice={onEventChoice} />
              ))}
            </div>
          </div>
        )}

        {/* Regions */}
        <Card style={staggeredFadeUp(5)}>
          <SectionHeader icon={'\u{1F30D}'}>Regions</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {game.regions.map((r) => {
              const pct = r.currentDemand > 0 ? (r.currentSupply / r.currentDemand) * 100 : 100;
              const rageColor = r.rage > 65 ? tokens.color.red : r.rage > 40 ? tokens.color.amber : tokens.color.green;
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: tokens.color.raised, borderRadius: 8,
                  border: r.rage > 65 ? `1px solid ${tokens.color.red}18` : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 16, width: 24 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim }}>
                        {formatMW(r.currentSupply)}/{formatMW(r.currentDemand)}
                      </span>
                    </div>
                    <MeterBar value={pct} color={pct < 85 ? tokens.color.red : pct < 95 ? tokens.color.amber : tokens.color.green} height={3} />
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 32 }}>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 13, fontWeight: 800, color: rageColor }}>{Math.round(r.rage)}</div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim }}>RAGE</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Plants Mini */}
        <Card style={staggeredFadeUp(6)} onClick={onPlants}>
          <SectionHeader icon={'\u{1F3ED}'} action={
            <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.gold }}>MANAGE {'\u2192'}</span>
          }>Fleet</SectionHeader>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {game.plants.map((p) => (
              <div key={p.id} style={{
                padding: '5px 8px', background: tokens.color.raised, borderRadius: 5,
                border: `1px solid ${tokens.color.border}`, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: p.status === 'online' ? tokens.color.green
                    : p.status === 'derated' ? tokens.color.amber
                    : p.status === 'standby' ? tokens.color.muted
                    : tokens.color.red,
                }} />
                <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted }}>{p.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card style={staggeredFadeUp(7)}>
          <SectionHeader icon={'\u2699\uFE0F'}>Grid Actions</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {game.plants.filter((p) => p.type === 'diesel' && p.status === 'standby').map((p) => (
              <button key={p.id} onClick={() => onActivateDiesel(p.id)} style={{
                padding: '12px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.border}`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{'\u26FD'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 11, fontWeight: 600, color: tokens.color.purple }}>
                  Activate {p.name}
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>
                  {formatMoney(p.fuelCostPerDay)}/day
                </div>
              </button>
            ))}
            {/* Tariff Increase */}
            {game.tariffIncreases < BALANCING.TARIFF_INCREASE_MAX && (
              <button onClick={onIncreaseTariff} style={{
                padding: '12px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.amber}20`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{'\u{1F4B5}'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 11, fontWeight: 600, color: tokens.color.amber }}>
                  Raise Tariff
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>
                  +15% rev, +8 rage ({game.tariffIncreases}/{BALANCING.TARIFF_INCREASE_MAX})
                </div>
              </button>
            )}
            {/* Government Bailout */}
            {!game.bailoutUsed && (
              <button onClick={onRequestBailout} style={{
                padding: '12px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.green}20`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{'\u{1F3E6}'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 11, fontWeight: 600, color: tokens.color.green }}>
                  Bailout
                </div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>
                  +R800M, +12 heat
                </div>
              </button>
            )}
            <button onClick={onMenu} style={{
              padding: '12px 8px', background: tokens.color.raised,
              border: `1px solid ${tokens.color.border}`, borderRadius: 8,
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{'\u2630'}</div>
              <div style={{ fontFamily: tokens.font.body, fontSize: 11, fontWeight: 600, color: tokens.color.muted }}>Menu</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, marginTop: 2 }}>Save & Options</div>
            </button>
          </div>
        </Card>

        <div style={{ height: 90 }} />
      </div>

      <BottomBar day={game.day} onEndDay={onEndDay} />
    </div>
  );
}
