import { tokens } from '../styles/tokens';
import { staggeredFadeUp } from '../styles/animations';
import { Card } from '../components/shared/Card';
import { MeterBar } from '../components/shared/MeterBar';
import { StatusPill } from '../components/shared/StatusPill';
import { formatMW, formatMoney } from '../utils/format';
import type { PlantState } from '../data/types';
import { PLANTS } from '../data/plants';

interface PlantDetailScreenProps {
  plants: PlantState[];
  onMaintenance: (plantId: string) => void;
  onActivateDiesel: (plantId: string) => void;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  online: tokens.color.green,
  derated: tokens.color.amber,
  maintenance: tokens.color.blue,
  forced_outage: tokens.color.red,
  standby: tokens.color.muted,
};

const statusLabels: Record<string, string> = {
  online: 'ONLINE',
  derated: 'DERATED',
  maintenance: 'MAINTENANCE',
  forced_outage: 'OUTAGE',
  standby: 'STANDBY',
};

export function PlantDetailScreen({ plants, onMaintenance, onActivateDiesel, onBack }: PlantDetailScreenProps) {
  const onlineCount = plants.filter((p) => p.status === 'online').length;
  const deratedCount = plants.filter((p) => p.status === 'derated').length;
  const outageCount = plants.filter((p) => p.status === 'forced_outage' || p.status === 'maintenance').length;
  const totalOutput = plants.reduce((sum, p) =>
    (p.status === 'online' || p.status === 'derated') ? sum + p.currentOutput : sum, 0);
  const totalCapacity = plants.reduce((sum, p) => sum + p.maxCapacity, 0);

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
          <div style={{ fontFamily: tokens.font.display, fontSize: 24, letterSpacing: '0.04em' }}>FLEET STATUS</div>
          <div style={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.dim }}>
            {onlineCount} online {'\u2022'} {deratedCount} derated {'\u2022'} {outageCount} offline
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card style={{ ...staggeredFadeUp(1), marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>TOTAL OUTPUT</div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 24, fontWeight: 800, color: tokens.color.green }}>{formatMW(totalOutput)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.muted, letterSpacing: '0.1em' }}>TOTAL CAPACITY</div>
            <div style={{ fontFamily: tokens.font.mono, fontSize: 24, fontWeight: 800, color: tokens.color.dim }}>{formatMW(totalCapacity)}</div>
          </div>
        </div>
        <MeterBar value={totalOutput} max={totalCapacity} color={tokens.color.green} height={6} glow />
      </Card>

      {/* Plant Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plants.map((plant, i) => {
          const def = PLANTS.find((p) => p.id === plant.id);
          const outputPct = plant.maxCapacity > 0 ? (plant.currentOutput / plant.maxCapacity) * 100 : 0;
          const statusColor = statusColors[plant.status] || tokens.color.muted;
          const canMaintain = plant.status === 'online' || plant.status === 'derated';
          const canActivate = plant.type === 'diesel' && plant.status === 'standby';

          return (
            <Card key={plant.id} style={{ ...staggeredFadeUp(i + 2), padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{def?.icon || '\u{1F3ED}'}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{plant.name}</div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.dim }}>
                      {plant.type.toUpperCase()} {'\u2022'} {formatMW(plant.maxCapacity)} max
                    </div>
                  </div>
                </div>
                <StatusPill color={statusColor} pulse={plant.status === 'forced_outage'}>
                  {statusLabels[plant.status]}
                </StatusPill>
              </div>

              {/* Output bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: tokens.color.muted }}>Output</span>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 9, color: statusColor, fontWeight: 700 }}>
                    {formatMW(plant.currentOutput)} ({Math.round(outputPct)}%)
                  </span>
                </div>
                <MeterBar value={outputPct} color={statusColor} height={4} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim }}>RELIABILITY</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 700, color: plant.reliability > 70 ? tokens.color.green : plant.reliability > 50 ? tokens.color.amber : tokens.color.red }}>
                    {plant.reliability}%
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim }}>FUEL/DAY</div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 700, color: tokens.color.muted }}>
                    {plant.fuelCostPerDay > 0 ? formatMoney(plant.fuelCostPerDay) : 'Free'}
                  </div>
                </div>
                {plant.daysUntilRepair > 0 && (
                  <div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim }}>REPAIR</div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 700, color: tokens.color.red }}>
                      {plant.daysUntilRepair}d
                    </div>
                  </div>
                )}
                {plant.maintenanceDaysLeft > 0 && (
                  <div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 8, color: tokens.color.dim }}>MAINT</div>
                    <div style={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 700, color: tokens.color.blue }}>
                      {plant.maintenanceDaysLeft}d
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {canMaintain && (
                  <button onClick={() => onMaintenance(plant.id)} style={{
                    flex: 1, padding: '8px 12px', background: tokens.color.raised,
                    border: `1px solid ${tokens.color.border}`, borderRadius: 6,
                    cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 10,
                    color: tokens.color.blue, fontWeight: 600,
                  }}>
                    {'\u{1F527}'} Schedule Maintenance
                  </button>
                )}
                {canActivate && (
                  <button onClick={() => onActivateDiesel(plant.id)} style={{
                    flex: 1, padding: '8px 12px', background: tokens.color.raised,
                    border: `1px solid ${tokens.color.purple}30`, borderRadius: 6,
                    cursor: 'pointer', fontFamily: tokens.font.mono, fontSize: 10,
                    color: tokens.color.purple, fontWeight: 600,
                  }}>
                    {'\u26FD'} Activate
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
