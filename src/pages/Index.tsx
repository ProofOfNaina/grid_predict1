import { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { PriceDisplay } from '@/components/PriceDisplay';
import { PriceChart } from '@/components/PriceChart';
import { PredictionGrid } from '@/components/PredictionGrid';
import { BettingModal } from '@/components/BettingModal';
import { BetHistoryPanel } from '@/components/BetHistoryPanel';
import { StatsBar } from '@/components/StatsBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePriceFeed } from '@/hooks/use-price-feed';
import { useGridEngine } from '@/hooks/use-grid-engine';
import { useBetHistory } from '@/hooks/use-bet-history';
import { DEFAULT_GRID_CONFIG, PRICE_STEP_MAP } from '@/lib/grid-types';
import type { GridCell } from '@/lib/grid-types';

const Index = () => {
  const [activePair, setActivePair] = useState('SOL/USD');
  const { currentPrice, priceHistory, priceChange, connected } = usePriceFeed(activePair);
  
  const config = useMemo(() => ({
    ...DEFAULT_GRID_CONFIG,
    priceStep: PRICE_STEP_MAP[activePair] || 0.1
  }), [activePair]);

  const { grid, placeBet, timeSlots, priceLevels, epoch } = useGridEngine(currentPrice, config);
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
      
      <div className="px-6 py-2 border-b">
        <Tabs value={activePair} onValueChange={setActivePair} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="SOL/USD">SOL</TabsTrigger>
            <TabsTrigger value="ETH/USD">ETH</TabsTrigger>
            <TabsTrigger value="BTC/USD">BTC</TabsTrigger>
            <TabsTrigger value="JUP/USD">JUP</TabsTrigger>
            <TabsTrigger value="PYTH/USD">PYTH</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <PriceDisplay price={currentPrice} change={priceChange} pair={activePair} connected={connected} />
      <PriceChart history={priceHistory} />
      
      <PredictionGrid
        grid={grid}
        timeSlots={timeSlots}
        priceLevels={priceLevels}
        currentPrice={currentPrice}
        symbol={activePair.split('/')[0]}
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
          symbol={activePair.split('/')[0]}
          onClose={() => setSelectedCell(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}
    </div>
  );
};

export default Index;
