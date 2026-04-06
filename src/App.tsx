import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useHistoryStore } from './store/historyStore';
import { useSettingsStore } from './store/settingsStore';
import { TitleScreen } from './screens/TitleScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DaySummaryScreen } from './screens/DaySummaryScreen';
import { BreakingNewsScreen } from './screens/BreakingNewsScreen';
import { CorruptionReceiptScreen } from './screens/CorruptionReceiptScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { PlantDetailScreen } from './screens/PlantDetailScreen';
import { RunHistoryScreen } from './screens/RunHistoryScreen';
import { DealModal } from './components/game/DealModal';
import { PauseMenu } from './components/screens/PauseMenu';
import { BALANCING } from './data/balancing';
import type { Opportunity } from './data/types';

function App() {
  const {
    game, screen, setScreen, newGame, resumeGame, takeDeal, cleanDeal, skipDeal,
    setStage, activateDiesel, scheduleMaintenance, makeEventChoice, endDay, continueTomorrow, flee, abandonRun,
  } = useGameStore();
  const { runs, stats, loadFromStorage: loadHistory, clearHistory } = useHistoryStore();
  const loadSettings = useSettingsStore((s) => s.loadFromStorage);

  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadHistory();
    loadSettings();
  }, []);

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', position: 'relative', minHeight: '100dvh' }}>
      {screen === 'title' && (
        <TitleScreen
          onStart={() => newGame('standard')}
          onResume={() => resumeGame()}
          onHistory={() => setScreen('run_history')}
        />
      )}

      {screen === 'dashboard' && game && (
        <>
          <DashboardScreen
            game={game}
            onDealClick={(op) => setSelectedDeal(op)}
            onEndDay={endDay}
            onPlants={() => setScreen('plant_detail')}
            onStageChange={setStage}
            onActivateDiesel={activateDiesel}
            onEventChoice={makeEventChoice}
            onMenu={() => setShowMenu(true)}
          />
          {selectedDeal && (
            <DealModal
              opportunity={selectedDeal}
              currentHeat={game.heat}
              onTake={() => { takeDeal(selectedDeal.id); setSelectedDeal(null); }}
              onClean={() => { cleanDeal(selectedDeal.id); setSelectedDeal(null); }}
              onSkip={() => { skipDeal(selectedDeal.id); setSelectedDeal(null); }}
              onClose={() => setSelectedDeal(null)}
            />
          )}
          {showMenu && (
            <PauseMenu
              canFlee={game.heat >= BALANCING.HEAT_FLEE_THRESHOLD}
              onResume={() => setShowMenu(false)}
              onFlee={() => { setShowMenu(false); flee(); }}
              onAbandon={() => { setShowMenu(false); abandonRun(); }}
              onTitle={() => { setShowMenu(false); setScreen('title'); }}
            />
          )}
        </>
      )}

      {screen === 'day_summary' && game?.dayReport && (
        <DaySummaryScreen
          report={game.dayReport}
          onContinue={continueTomorrow}
        />
      )}

      {screen === 'breaking_news' && game && (
        <BreakingNewsScreen
          bag={game.bag}
          day={game.day}
          onReceipt={() => setScreen('corruption_receipt')}
        />
      )}

      {screen === 'corruption_receipt' && game && (
        <CorruptionReceiptScreen
          game={game}
          onRestart={() => newGame('standard')}
          onTitle={() => setScreen('title')}
        />
      )}

      {screen === 'game_over' && game && (
        <GameOverScreen
          game={game}
          onRestart={() => newGame('standard')}
          onTitle={() => setScreen('title')}
        />
      )}

      {screen === 'plant_detail' && game && (
        <PlantDetailScreen
          plants={game.plants}
          onMaintenance={scheduleMaintenance}
          onActivateDiesel={activateDiesel}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {screen === 'run_history' && (
        <RunHistoryScreen
          runs={runs}
          stats={stats}
          onBack={() => setScreen('title')}
          onClear={clearHistory}
        />
      )}
    </div>
  );
}

export default App;
