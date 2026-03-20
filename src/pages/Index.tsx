import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PriceDisplay } from '@/components/PriceDisplay';
import { PriceChart } from '@/components/PriceChart';
import { PredictionGrid } from '@/components/PredictionGrid';
import { BettingModal } from '@/components/BettingModal';
import { BetHistoryPanel } from '@/components/BetHistoryPanel';
import { StatsBar } from '@/components/StatsBar';
import { usePriceFeed } from '@/hooks/use-price-feed';
import { useGridEngine } from '@/hooks/use-grid-engine';
import { useBetHistory } from '@/hooks/use-bet-history';
import type { GridCell } from '@/lib/grid-types';

const Index = () => {
  const { currentPrice, priceHistory, priceChange, connected } = usePriceFeed('SOL/USD');
  const { grid, placeBet, timeSlots, priceLevels, epoch } = useGridEngine(currentPrice);
  const { bets, recordBet, syncWithGrid, claimReward } = useBetHistory();
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Sync bet statuses with grid
  useEffect(() => {
    syncWithGrid(grid);
  }, [grid, syncWithGrid]);

  const handleCellClick = useCallback((cell: GridCell) => {
    setSelectedCell(cell);
  }, []);

  const handlePlaceBet = useCallback(
    (cell: GridCell, amount: number) => {
      placeBet(cell.id, amount);
      recordBet(cell, amount);
    },
    [placeBet, recordBet]
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Header />
      <PriceDisplay price={currentPrice} change={priceChange} pair="SOL / USD" connected={connected} />
      <PriceChart history={priceHistory} />
      <PredictionGrid
        grid={grid}
        timeSlots={timeSlots}
        priceLevels={priceLevels}
        currentPrice={currentPrice}
        onCellClick={handleCellClick}
      />
      <StatsBar grid={grid} epoch={epoch} />

      <BetHistoryPanel
        bets={bets}
        onClaim={claimReward}
        visible={historyVisible}
        onToggle={() => setHistoryVisible(v => !v)}
      />

      {selectedCell && (
        <BettingModal
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}
    </div>
  );
};

export default Index;
