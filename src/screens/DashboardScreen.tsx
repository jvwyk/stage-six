import { useState } from 'react';
import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { TopBar } from '../components/layout/TopBar';
import { BottomBar } from '../components/layout/BottomBar';
import { TabBar } from '../components/layout/TabBar';
import { Card } from '../components/shared/Card';
import { SectionHeader } from '../components/shared/SectionHeader';
import { StatusPill } from '../components/shared/StatusPill';
import { MeterBar } from '../components/shared/MeterBar';
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
  onBuyDieselFuel: () => void;
  onBuyEmergencyImport: () => void;
  onIncreaseTariff: () => void;
  onReduceTariff: () => void;
  onSellDieselFuel: () => void;
  onSetPlantMode: (plantId: string, mode: import('../data/types').PlantOperatingMode) => void;
  onRushRepair: (plantId: string) => void;
  onRushMaintenance: (plantId: string) => void;
  onSetDiversion: (mw: number) => void;
  onSpendInfluence: (action: 'suppress_rage' | 'deflect_investigation' | 'cover_diversion') => void;
  onRequestBailout: () => void;
  onEmergencyLevy: () => void;
  onMenu: () => void;
  hasUnresolvedEvents: boolean;
}

const statusColors: Record<string, string> = {
  online: tokens.color.green, derated: tokens.color.amber, maintenance: tokens.color.blue,
  forced_outage: tokens.color.red, standby: tokens.color.muted, starting: tokens.color.cyan,
};
const statusLabels: Record<string, string> = {
  online: 'ONLINE', derated: 'DERATED', maintenance: 'MAINT',
  forced_outage: 'OUTAGE', standby: 'STANDBY', starting: 'STARTING',
};

export function DashboardScreen({
  game, onDealClick, onEndDay, onStageChange, onActivateDiesel, onScheduleMaintenance,
  onBuyDieselFuel, onBuyEmergencyImport, onIncreaseTariff, onReduceTariff, onSellDieselFuel,
  onSetPlantMode, onRushRepair, onRushMaintenance, onSetDiversion, onSpendInfluence,
  onRequestBailout, onEmergencyLevy, onMenu, hasUnresolvedEvents,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState(1); // Default to GRID tab
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);

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

  const hasDieselOnline = game.plants.some((p) => p.type === 'diesel' && (p.status === 'online' || p.status === 'starting'));
  const dealsBadge = pendingOpportunities.length;
  const gridBadge = game.currentStage >= 6 ? 1 : undefined;

  const tabs = [
    { label: 'DEALS', icon: '\u{1F4BC}', badge: dealsBadge || undefined },
    { label: 'GRID', icon: '\u26A1', badge: gridBadge },
    { label: 'FINANCE', icon: '\u{1F4B0}', badge: undefined },
  ];

  const canEndDay = !hasUnresolvedEvents;

  return (
    <div style={{
      minHeight: '100dvh', background: tokens.color.bg, color: tokens.color.text,
      fontFamily: tokens.font.body, display: 'flex', flexDirection: 'column',
    }}>
      <TopBar day={game.day} budget={game.budget} bag={game.bag}
        lastSkim={lastSkim} heat={game.heat} rage={game.rage} budgetDelta={budgetDelta}
        influence={game.influence} eventCount={game.activeEvents.length} />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} onMenuClick={onMenu} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ═══ TAB 0: DEALS ═══ */}
        {activeTab === 0 && (
          <>
            {pendingOpportunities.length > 0 ? (
              <div>
                <div style={{
                  fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginBottom: 10,
                }}>
                  Set the inflation level {'\u2014'} or approve clean for R0.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingOpportunities.map((op, i) => {
                    const maxPct = Math.round((op.maxInflation - 1) * 100);
                    const maxCut = Math.round(op.baseCost * (op.maxInflation - 1));
                    return (
                    <div key={op.id} onClick={() => onDealClick(op)} style={{
                      padding: 14, background: tokens.color.raised, borderRadius: 10,
                      border: `1px solid ${op.delayCount > 0 ? tokens.color.amber : (riskColors[op.riskLevel] || tokens.color.border)}20`,
                      cursor: 'pointer', ...staggeredFadeUp(i),
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{op.icon}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{op.title}</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <StatusPill color={riskColors[op.riskLevel]}>{op.riskLevel} risk</StatusPill>
                              {op.delayCount > 0 && <StatusPill color={tokens.color.amber}>DELAYED</StatusPill>}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim }}>Base R{op.baseCost}M</div>
                          <div style={{ fontFamily: tokens.font.serif, fontSize: 18, fontWeight: 900, color: tokens.color.goldBright }}>up to +{formatMoney(maxCut)}</div>
                          <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber }}>max {maxPct}% inflation</div>
                        </div>
                      </div>
                      <p style={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.muted, lineHeight: 1.5, marginBottom: 6 }}>{op.description}</p>
                      <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, padding: '4px 8px', background: tokens.color.surface, borderRadius: 4, display: 'inline-block' }}>
                        Grid: {op.gridEffectLabel}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{
                padding: 40, textAlign: 'center', color: tokens.color.dim,
                fontFamily: tokens.font.mono, fontSize: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u2705'}</div>
                All deals decided for today.
                <br />Switch to GRID or FINANCE, then End Day.
              </div>
            )}
          </>
        )}

        {/* ═══ TAB 1: GRID ═══ */}
        {activeTab === 1 && (
          <>
            {/* Supply/Demand */}
            <Card style={staggeredFadeUp(0)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>CAPACITY</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.green }}>{formatMW(totalSupply)}</div>
                </div>
                <div style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: game.currentStage >= 6 ? tokens.color.red : game.currentStage >= 4 ? tokens.color.amber : tokens.color.green,
                }}>
                  <div style={{ fontFamily: tokens.font.display, fontSize: 28, color: tokens.color.bg, lineHeight: 1 }}>S{game.currentStage}</div>
                </div>
                <div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>DEMAND</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 20, fontWeight: 800, color: tokens.color.red }}>{formatMW(totalDemand)}</div>
                </div>
              </div>
              <div style={{ marginTop: 6, textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 10, color: deficit > 0 ? tokens.color.red : tokens.color.green }}>
                After shedding: {formatMW(effectiveDemand)} {'\u2022'} {deficit > 0 ? `DEFICIT: ${formatMW(deficit)}` : `SURPLUS: ${formatMW(-deficit)}`}
              </div>

              {game.currentStage >= 6 && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: `${tokens.color.red}10`, border: `1px solid ${tokens.color.red}20`, borderRadius: 6, textAlign: 'center', fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.red }}>
                  {'\u{1F6A8}'} GRID CRITICAL {'\u2014'} buy fuel or emergency import
                </div>
              )}

              {/* Stage Selector - wraps on narrow screens */}
              <div style={{ display: 'flex', gap: 2, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {Array.from({ length: 9 }, (_, i) => {
                  const isDisabled = i < minimumStage;
                  const isActive = i === game.currentStage;
                  const isRecommended = i === recommendedStage;
                  return (
                    <button key={`s-${i}`} onClick={() => !isDisabled && onStageChange(i)} style={{
                      flex: '1 0 30px', maxWidth: 38, minHeight: 44,
                      background: isActive ? (i >= 6 ? tokens.color.red : i >= 4 ? tokens.color.amber : tokens.color.green) : tokens.color.raised,
                      color: isDisabled ? `${tokens.color.dim}40` : isActive ? tokens.color.bg : tokens.color.dim,
                      border: `1px solid ${isActive ? 'transparent' : isRecommended ? `${tokens.color.amber}50` : tokens.color.border}`,
                      borderRadius: 6, cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700, opacity: isDisabled ? 0.4 : 1,
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

            {/* Fleet */}
            <div style={staggeredFadeUp(1)}>
              <SectionHeader icon={'\u{1F3ED}'}>Fleet ({game.plants.filter((p) => p.status === 'online' || p.status === 'derated').length}/{game.plants.length} active)</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {game.plants.map((p) => {
                  const outputPct = p.maxCapacity > 0 ? (p.currentOutput / p.maxCapacity) * 100 : 0;
                  const color = statusColors[p.status] || tokens.color.muted;
                  const canMaintain = p.status === 'online' || p.status === 'derated';
                  const canActivate = p.type === 'diesel' && p.status === 'standby';
                  const canSetMode = p.status === 'online' || p.status === 'derated';
                  const isExpanded = expandedPlant === p.id;
                  const modes: Array<{ key: import('../data/types').PlantOperatingMode; label: string; desc: string; color: string }> = [
                    { key: 'idle', label: 'IDLE', desc: '50% output, no wear', color: tokens.color.muted },
                    { key: 'normal', label: 'NORMAL', desc: '100% output', color: tokens.color.green },
                    { key: 'push_hard', label: 'PUSH', desc: '120%, 3× wear', color: tokens.color.amber },
                    { key: 'run_hot', label: 'HOT', desc: '140%, 6× wear', color: tokens.color.red },
                  ];
                  return (
                    <div key={p.id} style={{ background: tokens.color.raised, borderRadius: 8, border: `1px solid ${isExpanded ? tokens.color.gold + '30' : tokens.color.border}`, overflow: 'hidden' }}>
                      {/* Plant header row — tap to expand */}
                      <div onClick={() => setExpandedPlant(isExpanded ? null : p.id)} style={{
                        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                            <StatusPill color={color}>{statusLabels[p.status]}</StatusPill>
                            {canSetMode && p.operatingMode !== 'normal' && (
                              <StatusPill color={p.operatingMode === 'run_hot' ? tokens.color.red : p.operatingMode === 'push_hard' ? tokens.color.amber : tokens.color.muted}>
                                {p.operatingMode === 'run_hot' ? 'HOT' : p.operatingMode === 'push_hard' ? 'PUSH' : 'IDLE'}
                              </StatusPill>
                            )}
                            {p.status === 'starting' && <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.cyan }}>online tomorrow</span>}
                            {p.maintenanceDaysLeft > 0 && <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.blue }}>{p.maintenanceDaysLeft}d</span>}
                            {p.daysUntilRepair > 0 && p.status !== 'starting' && <span style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.red }}>{p.daysUntilRepair}d</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MeterBar value={outputPct} color={color} height={3} />
                            <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim, minWidth: 55, textAlign: 'right' }}>{formatMW(p.currentOutput)}</span>
                          </div>
                        </div>
                        <span style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                      </div>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${tokens.color.border}` }}>
                          {/* Stats row */}
                          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontFamily: tokens.font.mono, fontSize: 9 }}>
                            <span style={{ color: tokens.color.muted }}>Reliability: <span style={{ color: p.reliability > 70 ? tokens.color.green : p.reliability > 50 ? tokens.color.amber : tokens.color.red, fontWeight: 700 }}>{p.reliability}%</span></span>
                            <span style={{ color: tokens.color.muted }}>Wear: <span style={{ color: p.failureDebt > 60 ? tokens.color.red : p.failureDebt > 30 ? tokens.color.amber : tokens.color.green, fontWeight: 700 }}>{Math.round(p.failureDebt)}%</span></span>
                            <span style={{ color: tokens.color.muted }}>Fuel: <span style={{ fontWeight: 700 }}>{formatMoney(p.fuelCostPerDay)}/d</span></span>
                          </div>

                          {/* Operating mode buttons */}
                          {canSetMode && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginBottom: 4, letterSpacing: '0.1em' }}>OPERATING MODE</div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {modes.map((m) => (
                                  <button key={m.key} onClick={(e) => { e.stopPropagation(); onSetPlantMode(p.id, m.key); }} style={{
                                    flex: 1, padding: '6px 4px', minHeight: 44,
                                    background: p.operatingMode === m.key ? `${m.color}20` : tokens.color.surface,
                                    border: `1px solid ${p.operatingMode === m.key ? m.color : tokens.color.border}`,
                                    borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                  }}>
                                    <div style={{ fontFamily: tokens.font.mono, fontSize: 9, fontWeight: 700, color: p.operatingMode === m.key ? m.color : tokens.color.dim }}>{m.label}</div>
                                    <div style={{ fontFamily: tokens.font.mono, fontSize: 7, color: tokens.color.dim, marginTop: 1 }}>{m.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 6 }}>
                            {canMaintain && (
                              <button onClick={(e) => { e.stopPropagation(); onScheduleMaintenance(p.id); }} style={{
                                flex: 1, padding: '8px', background: tokens.color.surface, border: `1px solid ${tokens.color.blue}30`,
                                borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.blue,
                                fontWeight: 600, minHeight: 44,
                              }}>
                                {'\u{1F527}'} Maintain (R80-200M)
                              </button>
                            )}
                            {canActivate && (
                              <button onClick={(e) => { e.stopPropagation(); onActivateDiesel(p.id); }} style={{
                                flex: 1, padding: '8px', background: tokens.color.surface, border: `1px solid ${tokens.color.purple}30`,
                                borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.purple,
                                fontWeight: 600, minHeight: 44,
                              }}>
                                {'\u26FD'} Cold Start (R{BALANCING.DIESEL_ACTIVATION_COST}M)
                              </button>
                            )}
                            {p.status === 'forced_outage' && p.daysUntilRepair > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); onRushRepair(p.id); }} style={{
                                flex: 1, padding: '8px', background: tokens.color.surface, border: `1px solid ${tokens.color.amber}30`,
                                borderRadius: 6, cursor: game.budget < BALANCING.RUSH_REPAIR_COST ? 'not-allowed' : 'pointer',
                                fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.amber,
                                fontWeight: 600, minHeight: 44,
                                opacity: game.budget < BALANCING.RUSH_REPAIR_COST ? 0.5 : 1,
                              }}>
                                {'\u26A1'} Rush Repair (R{BALANCING.RUSH_REPAIR_COST}M)
                              </button>
                            )}
                            {p.status === 'maintenance' && p.maintenanceDaysLeft > 1 && (
                              <button onClick={(e) => { e.stopPropagation(); onRushMaintenance(p.id); }} style={{
                                flex: 1, padding: '8px', background: tokens.color.surface, border: `1px solid ${tokens.color.cyan}30`,
                                borderRadius: 6, cursor: game.budget < BALANCING.RUSH_MAINTENANCE_COST ? 'not-allowed' : 'pointer',
                                fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.cyan,
                                fontWeight: 600, minHeight: 44,
                                opacity: game.budget < BALANCING.RUSH_MAINTENANCE_COST ? 0.5 : 1,
                              }}>
                                {'\u26A1'} Rush Maint (R{BALANCING.RUSH_MAINTENANCE_COST}M, -1d)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fuel Status */}
            {(game.dieselFuelDays > 0 || game.emergencyImportMW > 0) && (
              <Card style={staggeredFadeUp(2)}>
                <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.muted, display: 'flex', gap: 16 }}>
                  {game.dieselFuelDays > 0 && <span style={{ color: tokens.color.purple }}>{'\u26FD'} Diesel fuel: {game.dieselFuelDays}d remaining</span>}
                  {game.emergencyImportMW > 0 && <span style={{ color: tokens.color.cyan }}>{'\u{1F50C}'} Import: +{game.emergencyImportMW}MW today</span>}
                </div>
              </Card>
            )}
            {/* Power Diversion */}
            <Card style={staggeredFadeUp(3)}>
              <SectionHeader icon={'\u{1F50C}'}>Power Diversion</SectionHeader>
              <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim, marginBottom: 8, marginTop: -4 }}>
                Sell grid power to private buyers for offshore payments.
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <button onClick={() => onSetDiversion(Math.max(0, game.diversionMW - BALANCING.DIVERSION_INCREMENT))} style={{
                  padding: '6px 12px', background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
                  borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.muted, minHeight: 44,
                }}>-{BALANCING.DIVERSION_INCREMENT}</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 18, fontWeight: 800, color: game.diversionMW > 0 ? tokens.color.gold : tokens.color.dim }}>
                    {formatMW(game.diversionMW)}
                  </div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim }}>DIVERTED</div>
                </div>
                <button onClick={() => onSetDiversion(game.diversionMW + BALANCING.DIVERSION_INCREMENT)} style={{
                  padding: '6px 12px', background: tokens.color.surface, border: `1px solid ${tokens.color.gold}30`,
                  borderRadius: 6, cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.gold, minHeight: 44,
                }}>+{BALANCING.DIVERSION_INCREMENT}</button>
              </div>
              {game.diversionMW > 0 && (
                <div style={{ display: 'flex', gap: 12, fontFamily: tokens.font.mono, fontSize: 9, justifyContent: 'center' }}>
                  <span style={{ color: tokens.color.goldBright }}>Income: +{formatMoney(Math.round((game.diversionMW / 100) * BALANCING.DIVERSION_INCOME_PER_100MW))}/day</span>
                  {game.diversionCovered ? (
                    <>
                      <span style={{ color: tokens.color.green, fontWeight: 700 }}>COVERED</span>
                      <span style={{ color: tokens.color.dim, textDecoration: 'line-through' }}>
                        {Math.round((game.diversionMW / 100) * BALANCING.DIVERSION_DETECTION_CHANCE_PER_100MW * 100)}%
                      </span>
                      <span style={{ color: tokens.color.green }}>
                        Detection: {Math.round((game.diversionMW / 200) * BALANCING.DIVERSION_DETECTION_CHANCE_PER_100MW * 100)}%
                      </span>
                    </>
                  ) : (
                    <span style={{ color: tokens.color.red }}>Detection: {Math.round((game.diversionMW / 100) * BALANCING.DIVERSION_DETECTION_CHANCE_PER_100MW * 100)}%</span>
                  )}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ═══ TAB 2: FINANCE ═══ */}
        {activeTab === 2 && (
          <>
            {/* Budget Overview */}
            <Card style={staggeredFadeUp(0)}>
              <SectionHeader icon={'\u{1F4CA}'}>Budget Overview</SectionHeader>
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

            {/* Revenue Actions */}
            <div style={staggeredFadeUp(1)}>
              <SectionHeader icon={'\u{1F4B5}'}>Revenue</SectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {game.tariffIncreases < BALANCING.TARIFF_INCREASE_MAX && (
                  <ActionButton icon={'\u2B06\uFE0F'} label="Raise Tariff" desc="+15% rev, +8 rage" color={tokens.color.amber} onClick={onIncreaseTariff} />
                )}
                {game.tariffIncreases > 0 && (
                  <ActionButton icon={'\u2B07\uFE0F'} label="Reduce Tariff" desc="-15% rev, -5 rage" color={tokens.color.green} onClick={onReduceTariff} />
                )}
              </div>
            </div>

            {/* Fuel Purchases */}
            <div style={staggeredFadeUp(2)}>
              <SectionHeader icon={'\u26FD'}>Fuel & Imports</SectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <ActionButton icon={'\u26FD'} label="Buy Diesel Fuel"
                  desc={`R${BALANCING.DIESEL_FUEL_COST}M / ${BALANCING.DIESEL_FUEL_DURATION}d${game.dieselFuelDays > 0 ? ` (${game.dieselFuelDays}d left)` : ''}`}
                  color={tokens.color.purple}
                  onClick={onBuyDieselFuel}
                  disabled={game.budget < BALANCING.DIESEL_FUEL_COST || !hasDieselOnline} />
                {game.dieselFuelDays > 0 && (
                  <ActionButton icon={'\u{1F4B8}'} label="Sell Diesel Fuel"
                    desc={`+R${BALANCING.DIESEL_FUEL_SELL_PRICE_PER_DAY * game.dieselFuelDays}M + skim, +3 heat`}
                    color={tokens.color.gold}
                    onClick={onSellDieselFuel} />
                )}
                <ActionButton icon={'\u{1F50C}'} label="Emergency Import"
                  desc={`R${BALANCING.EMERGENCY_IMPORT_COST}M / +${BALANCING.EMERGENCY_IMPORT_MW}MW today`}
                  color={tokens.color.cyan}
                  onClick={onBuyEmergencyImport}
                  disabled={game.budget < BALANCING.EMERGENCY_IMPORT_COST || game.emergencyImportMW > 0} />
              </div>
            </div>

            {/* Budget Actions */}
            {(!game.bailoutUsed || !game.emergencyLevyUsed) && (
              <div style={staggeredFadeUp(3)}>
                <SectionHeader icon={'\u{1F3E6}'}>Emergency Funding</SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {!game.bailoutUsed && (
                    <ActionButton icon={'\u{1F3E6}'} label="Gov Bailout" desc="+R800M, +12 heat" color={tokens.color.green} onClick={onRequestBailout} />
                  )}
                  {!game.emergencyLevyUsed && (
                    <ActionButton icon={'\u{1F4B8}'} label="Emergency Levy" desc="+R800M, -10% industry" color={tokens.color.red} onClick={onEmergencyLevy} />
                  )}
                </div>
              </div>
            )}

            {/* Influence Actions */}
            {game.influence > 0 && (
              <div style={staggeredFadeUp(4)}>
                <SectionHeader icon={'\u{1F3DB}\uFE0F'}>Influence ({Math.round(game.influence)}/{BALANCING.INFLUENCE_MAX})</SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <ActionButton icon={'\u{1F910}'} label="Suppress Rage" desc={`-${BALANCING.INFLUENCE_SUPPRESS_RAGE_AMOUNT} rage (cost: ${BALANCING.INFLUENCE_SUPPRESS_RAGE_COST})`}
                    color={tokens.color.green} onClick={() => onSpendInfluence('suppress_rage')}
                    disabled={game.influence < BALANCING.INFLUENCE_SUPPRESS_RAGE_COST} />
                  <ActionButton icon={'\u{1F6E1}\uFE0F'} label="Deflect Audit" desc={`Block investigation (cost: ${BALANCING.INFLUENCE_DEFLECT_INVESTIGATION_COST})`}
                    color={tokens.color.blue} onClick={() => onSpendInfluence('deflect_investigation')}
                    disabled={game.influence < BALANCING.INFLUENCE_DEFLECT_INVESTIGATION_COST} />
                  <ActionButton icon={'\u{1F50C}'} label="Cover Diversion" desc={`Halve detection risk (cost: ${BALANCING.INFLUENCE_COVER_DIVERSION_COST})`}
                    color={tokens.color.cyan} onClick={() => onSpendInfluence('cover_diversion')}
                    disabled={game.influence < BALANCING.INFLUENCE_COVER_DIVERSION_COST || game.diversionCovered} />
                </div>
              </div>
            )}

            {/* Transaction Log */}
            {game.transactionLog.length > 0 && (
              <Card style={staggeredFadeUp(4)}>
                <SectionHeader icon={'\u{1F4DD}'}>Today's Transactions</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {game.transactionLog.map((tx, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: tokens.font.mono, fontSize: 10, padding: '4px 0', borderBottom: `1px solid ${tokens.color.border}08` }}>
                      <span style={{ color: tokens.color.muted }}>{tx.label}</span>
                      {tx.amount !== 0 && <span style={{ color: tx.amount >= 0 ? tokens.color.green : tokens.color.red, fontWeight: 700 }}>{tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}</span>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        <div style={{ height: 90 }} />
      </div>

      <BottomBar day={game.day} onEndDay={onEndDay} disabled={!canEndDay}
        disabledReason={hasUnresolvedEvents ? 'Resolve events first' : undefined} />
    </div>
  );
}

// Reusable action button
function ActionButton({ icon, label, desc, color, onClick, disabled }: {
  icon: string; label: string; desc: string; color: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      padding: '10px 8px', background: tokens.color.raised,
      border: `1px solid ${color}20`, borderRadius: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'center', opacity: disabled ? 0.5 : 1, minHeight: 44,
    }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 600, color }}>{label}</div>
      <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim, marginTop: 2 }}>{desc}</div>
    </button>
  );
}
