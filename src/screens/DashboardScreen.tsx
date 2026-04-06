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
import { getRageRevenuePenalty } from '../engine/RageEngine';
import { BALANCING } from '../data/balancing';
import type { GameState, Opportunity } from '../data/types';

interface DashboardScreenProps {
  game: GameState;
  onDealClick: (opportunity: Opportunity) => void;
  onEndDay: () => void;
  onStageChange: (stage: number) => void;
  onActivateDiesel: (plantId: string) => void;
  onScheduleMaintenance: (plantId: string) => void;
  onEventChoice: (eventId: string, choiceIndex: number) => void;
  onBuyDieselFuel: () => void;
  onBuyEmergencyImport: () => void;
  onIncreaseTariff: () => void;
  onRequestBailout: () => void;
  onEmergencyLevy: () => void;
  onMenu: () => void;
}

const statusColors: Record<string, string> = {
  online: tokens.color.green,
  derated: tokens.color.amber,
  maintenance: tokens.color.blue,
  forced_outage: tokens.color.red,
  standby: tokens.color.muted,
  starting: tokens.color.cyan,
};

const statusLabels: Record<string, string> = {
  online: 'ONLINE',
  derated: 'DERATED',
  maintenance: 'MAINT',
  forced_outage: 'OUTAGE',
  standby: 'STANDBY',
  starting: 'STARTING',
};

export function DashboardScreen({
  game, onDealClick, onEndDay, onStageChange, onActivateDiesel, onScheduleMaintenance,
  onEventChoice, onBuyDieselFuel, onBuyEmergencyImport, onIncreaseTariff, onRequestBailout,
  onEmergencyLevy, onMenu,
}: DashboardScreenProps) {
  const totalSupply = getAvailableCapacity(game.plants) + game.emergencyImportMW;
  const totalDemand = game.regions.reduce((sum, r) => sum + r.baseDemand, 0);
  const stageCut = BALANCING.STAGE_DEMAND_CUT[game.currentStage] || 0;
  const effectiveDemand = Math.round(totalDemand * (1 - stageCut));
  const deficit = effectiveDemand - totalSupply;
  const lastSkim = game.corruptionLog.length > 0
    ? game.corruptionLog[game.corruptionLog.length - 1].skimAmount : 0;
  const budgetDelta = game.dayReport?.budgetDelta ?? 0;

  const decidedIds = new Set(game.playerActions.deals.map((d) => d.opportunityId));
  const pendingOpportunities = game.todaysOpportunities.filter((o) => !decidedIds.has(o.id));

  const { minimumStage, recommendedStage } = calculateMinimumStage(totalSupply, totalDemand);

  // Budget estimates
  const ragePenalty = getRageRevenuePenalty(game.rage);
  const estRevenue = Math.round(
    game.regions.reduce((sum, r) => sum + r.baseDemand * r.economicValue, 0)
    * BALANCING.TARIFF_RATE * game.tariffMultiplier * (1 - ragePenalty) * (1 - stageCut),
  );
  const estFuelCost = game.plants.reduce((sum, p) =>
    (p.status === 'online' || p.status === 'derated') ? sum + p.fuelCostPerDay : sum, 0);

  const riskColors: Record<string, string> = {
    low: tokens.color.green, med: tokens.color.amber, high: tokens.color.red, extreme: tokens.color.red,
  };

  // Diesel plants that can be activated
  const hasDieselFuel = game.dieselFuelDays > 0;
  const hasDieselOnline = game.plants.some((p) => p.type === 'diesel' && (p.status === 'online' || p.status === 'starting'));

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, display: 'flex', flexDirection: 'column',
    }}>
      <TopBar day={game.day} budget={game.budget} bag={game.bag}
        lastSkim={lastSkim} heat={game.heat} rage={game.rage} budgetDelta={budgetDelta} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ═══ GRID STATUS ═══ */}
        <Card style={staggeredFadeUp(0)}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8,
            alignItems: 'center', textAlign: 'center',
          }}>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>CAPACITY</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.green }}>{formatMW(totalSupply)}</div>
            </div>
            <div style={{
              padding: '8px 14px',
              background: game.currentStage >= 6 ? tokens.color.red : game.currentStage >= 4 ? tokens.color.amber : tokens.color.green,
              borderRadius: 8,
            }}>
              <div style={{ fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.bg, letterSpacing: '0.04em', lineHeight: 1 }}>S{game.currentStage}</div>
            </div>
            <div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>DEMAND</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.red }}>{formatMW(totalDemand)}</div>
            </div>
          </div>
          <div style={{ marginTop: 6, textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 10, color: deficit > 0 ? tokens.color.red : tokens.color.green }}>
            After shedding: {formatMW(effectiveDemand)} {'\u2022'} {deficit > 0 ? `DEFICIT: ${formatMW(deficit)}` : `SURPLUS: ${formatMW(-deficit)}`}
          </div>

          {/* Stage warning */}
          {game.currentStage < recommendedStage && (
            <div style={{
              marginTop: 8, padding: '6px 10px', background: `${tokens.color.amber}10`,
              border: `1px solid ${tokens.color.amber}20`, borderRadius: 6, textAlign: 'center',
              fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber,
            }}>
              {'\u26A0\uFE0F'} Stage {recommendedStage}+ recommended to meet demand
            </div>
          )}
          {game.currentStage >= 6 && (
            <div style={{
              marginTop: 8, padding: '6px 10px', background: `${tokens.color.red}10`,
              border: `1px solid ${tokens.color.red}20`, borderRadius: 6, textAlign: 'center',
              fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.red,
            }}>
              {'\u{1F6A8}'} GRID CRITICAL — buy fuel or emergency import to reduce stage
            </div>
          )}

          {/* Stage Selector */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center' }}>
            {Array.from({ length: 9 }, (_, i) => {
              const isDisabled = i < minimumStage;
              const isActive = i === game.currentStage;
              const isRecommended = i === recommendedStage;
              return (
                <button key={`stage-${i}`} onClick={() => !isDisabled && onStageChange(i)} style={{
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
          <div style={{ textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 4 }}>
            MIN: S{minimumStage} | REC: S{recommendedStage}
          </div>
        </Card>

        {/* ═══ FLEET ═══ */}
        <div style={staggeredFadeUp(1)}>
          <SectionHeader icon={'\u{1F3ED}'}>Fleet ({game.plants.filter((p) => p.status === 'online' || p.status === 'derated').length}/{game.plants.length} active)</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {game.plants.map((p) => {
              const outputPct = p.maxCapacity > 0 ? (p.currentOutput / p.maxCapacity) * 100 : 0;
              const color = statusColors[p.status] || tokens.color.muted;
              const canMaintain = p.status === 'online' || p.status === 'derated';
              const canActivate = p.type === 'diesel' && p.status === 'standby';

              return (
                <div key={p.id} style={{
                  padding: '10px 12px', background: tokens.color.raised, borderRadius: 8,
                  border: `1px solid ${tokens.color.border}`, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tokens.color.text }}>{p.name}</span>
                      <StatusPill color={color}>{statusLabels[p.status]}</StatusPill>
                      {p.daysUntilRepair > 0 && p.status !== 'starting' && (
                        <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.red }}>{p.daysUntilRepair}d repair</span>
                      )}
                      {p.status === 'starting' && (
                        <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.cyan }}>online tomorrow</span>
                      )}
                      {p.maintenanceDaysLeft > 0 && (
                        <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.blue }}>{p.maintenanceDaysLeft}d maint</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MeterBar value={outputPct} color={color} height={3} />
                      <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, minWidth: 55, textAlign: 'right' }}>
                        {formatMW(p.currentOutput)}
                      </span>
                    </div>
                  </div>
                  {/* Inline actions */}
                  {canMaintain && (
                    <button onClick={() => onScheduleMaintenance(p.id)} style={{
                      padding: '6px 10px', background: tokens.color.surface, border: `1px solid ${tokens.color.blue}30`,
                      borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 9,
                      color: tokens.color.blue, fontWeight: 600, minHeight: 44, whiteSpace: 'nowrap',
                    }}>
                      {'\u{1F527}'} Maintain
                    </button>
                  )}
                  {canActivate && (
                    <button onClick={() => onActivateDiesel(p.id)} style={{
                      padding: '6px 10px', background: tokens.color.surface, border: `1px solid ${tokens.color.purple}30`,
                      borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 9,
                      color: tokens.color.purple, fontWeight: 600, minHeight: 44, whiteSpace: 'nowrap',
                    }}>
                      {'\u26FD'} Start (R{BALANCING.DIESEL_ACTIVATION_COST}M)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ FUEL & BUDGET ═══ */}
        <div style={staggeredFadeUp(2)}>
          <SectionHeader icon={'\u{1F4B0}'}>Fuel & Budget</SectionHeader>

          {/* Budget summary */}
          <Card style={{ marginBottom: 8, padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: tokens.font.mono, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: tokens.color.muted }}>Est. Revenue</span>
                <span style={{ color: tokens.color.green, fontWeight: 700 }}>+{formatMoney(estRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: tokens.color.muted }}>Fuel Costs</span>
                <span style={{ color: tokens.color.red, fontWeight: 700 }}>-{formatMoney(estFuelCost)}</span>
              </div>
              <div style={{ height: 1, background: tokens.color.border, margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: tokens.color.text, fontWeight: 700 }}>Est. Net</span>
                <span style={{ color: estRevenue - estFuelCost >= 0 ? tokens.color.green : tokens.color.red, fontWeight: 700 }}>
                  {estRevenue - estFuelCost >= 0 ? '+' : ''}{formatMoney(estRevenue - estFuelCost)}
                </span>
              </div>
              {game.tariffMultiplier > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ color: tokens.color.dim, fontSize: 9 }}>Tariff rate</span>
                  <span style={{ color: tokens.color.amber, fontSize: 9 }}>{'\u00D7'}{game.tariffMultiplier.toFixed(2)} ({game.tariffIncreases} hike{game.tariffIncreases !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
          </Card>

          {/* Fuel & capacity actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {/* Buy Diesel Fuel */}
            <button onClick={onBuyDieselFuel} disabled={game.budget < BALANCING.DIESEL_FUEL_COST || !hasDieselOnline} style={{
              padding: '10px 8px', background: tokens.color.raised,
              border: `1px solid ${tokens.color.purple}20`, borderRadius: 8,
              cursor: game.budget < BALANCING.DIESEL_FUEL_COST || !hasDieselOnline ? 'not-allowed' : 'pointer',
              textAlign: 'center', opacity: game.budget < BALANCING.DIESEL_FUEL_COST || !hasDieselOnline ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{'\u26FD'}</div>
              <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color: tokens.color.purple }}>Buy Diesel Fuel</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>
                R{BALANCING.DIESEL_FUEL_COST}M / {BALANCING.DIESEL_FUEL_DURATION} days
              </div>
              {hasDieselFuel && (
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.green, marginTop: 2 }}>
                  Fuel: {game.dieselFuelDays}d left
                </div>
              )}
            </button>

            {/* Emergency Import */}
            <button onClick={onBuyEmergencyImport} disabled={game.budget < BALANCING.EMERGENCY_IMPORT_COST || game.emergencyImportMW > 0} style={{
              padding: '10px 8px', background: tokens.color.raised,
              border: `1px solid ${tokens.color.cyan}20`, borderRadius: 8,
              cursor: game.budget < BALANCING.EMERGENCY_IMPORT_COST || game.emergencyImportMW > 0 ? 'not-allowed' : 'pointer',
              textAlign: 'center', opacity: game.budget < BALANCING.EMERGENCY_IMPORT_COST || game.emergencyImportMW > 0 ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{'\u{1F50C}'}</div>
              <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color: tokens.color.cyan }}>Emergency Import</div>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>
                R{BALANCING.EMERGENCY_IMPORT_COST}M / +{BALANCING.EMERGENCY_IMPORT_MW}MW
              </div>
              {game.emergencyImportMW > 0 && (
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.green, marginTop: 2 }}>
                  +{game.emergencyImportMW}MW active
                </div>
              )}
            </button>

            {/* Budget recovery actions */}
            {game.tariffIncreases < BALANCING.TARIFF_INCREASE_MAX && (
              <button onClick={onIncreaseTariff} style={{
                padding: '10px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.amber}20`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{'\u{1F4B5}'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color: tokens.color.amber }}>Raise Tariff</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>
                  +15% rev, +8 rage
                </div>
              </button>
            )}
            {!game.bailoutUsed && (
              <button onClick={onRequestBailout} style={{
                padding: '10px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.green}20`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{'\u{1F3E6}'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color: tokens.color.green }}>Bailout</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>+R800M, +12 heat</div>
              </button>
            )}
            {!game.emergencyLevyUsed && (
              <button onClick={onEmergencyLevy} style={{
                padding: '10px 8px', background: tokens.color.raised,
                border: `1px solid ${tokens.color.red}20`, borderRadius: 8,
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{'\u{1F4B8}'}</div>
                <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color: tokens.color.red }}>Emergency Levy</div>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>+R800M, -10% industry</div>
              </button>
            )}
          </div>
        </div>

        {/* ═══ DEALS & EVENTS ═══ */}
        {(pendingOpportunities.length > 0 || game.activeEvents.length > 0) && (
          <div style={staggeredFadeUp(3)}>
            <SectionHeader icon={'\u{1F4BC}'}>Today's Business</SectionHeader>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginBottom: 10, marginTop: -4 }}>
              Risk it for the biscuit {'\u2014'} or play it clean for R0.
            </div>

            {/* Active Events first */}
            {game.activeEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {game.activeEvents.map((ae) => (
                  <EventAlert key={ae.event.id} event={ae} onChoice={onEventChoice} />
                ))}
              </div>
            )}

            {/* Opportunities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingOpportunities.map((op, i) => (
                <div key={op.id} onClick={() => onDealClick(op)} style={{
                  padding: 14, background: tokens.color.raised, borderRadius: 10,
                  border: `1px solid ${(riskColors[op.riskLevel] || tokens.color.border)}20`,
                  cursor: 'pointer', ...staggeredFadeUp(i + 4),
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
                      <div style={{ fontFamily: tokens.font.serif, fontSize: 20, fontWeight: 900, color: tokens.color.goldBright }}>+{formatMoney(op.skimAmount)}</div>
                      <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber }}>+{op.heatCost} heat</div>
                    </div>
                  </div>
                  <p style={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.muted, lineHeight: 1.5, marginBottom: 6 }}>{op.description}</p>
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

        {/* Menu button */}
        <button onClick={onMenu} style={{
          padding: '12px', background: tokens.color.raised, border: `1px solid ${tokens.color.border}`,
          borderRadius: 8, cursor: 'pointer', textAlign: 'center',
          fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim,
          ...staggeredFadeUp(5),
        }}>
          {'\u2630'} Menu — Save & Options
        </button>

        <div style={{ height: 90 }} />
      </div>

      <BottomBar day={game.day} onEndDay={onEndDay} />
    </div>
  );
}
