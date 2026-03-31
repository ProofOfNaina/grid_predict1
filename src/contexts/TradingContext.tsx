import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { usePriceFeed } from '@/hooks/use-price-feed';
import { useGridEngine } from '@/hooks/use-grid-engine';
import { useBetHistory } from '@/hooks/use-bet-history';
import { DEFAULT_GRID_CONFIG, PRICE_STEP_MAP } from '@/lib/grid-types';
import type { GridCell, BetRecord } from '@/lib/grid-types';

interface TradingContextValue {
  activePair: string;
  setActivePair: (pair: string) => void;
  currentPrice: number;
  priceHistory: { time: number; price: number }[];
  priceChange: 'up' | 'down';
  priceConnected: boolean;
  grid: GridCell[];
  placeBet: (cellId: string, amount: number) => void;
  timeSlots: { index: number; startOffset: number; endOffset: number; label: string }[];
  priceLevels: { min: number; max: number; label: string }[];
  epoch: number;
  bets: BetRecord[];
  recordBet: (cell: GridCell, amount: number, txHash?: string) => void;
  syncWithGrid: (grid: GridCell[]) => void;
  claimReward: (betId: string) => void;
  config: typeof DEFAULT_GRID_CONFIG;
}

const TradingContext = createContext<TradingContextValue | null>(null);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [activePair, setActivePair] = useState('SOL/USD');
  const { currentPrice, priceHistory, priceChange, connected: priceConnected } = usePriceFeed(activePair);
  
  const config = useMemo(() => ({
    ...DEFAULT_GRID_CONFIG,
    priceStep: PRICE_STEP_MAP[activePair] || 0.1
  }), [activePair]);

  const { grid, placeBet, timeSlots, priceLevels, epoch } = useGridEngine(currentPrice, config);
  const { bets, recordBet, syncWithGrid, claimReward } = useBetHistory();

  // Keep bets synced with grid
  useEffect(() => {
    syncWithGrid(grid);
  }, [grid, syncWithGrid]);

  const value = {
    activePair,
    setActivePair,
    currentPrice,
    priceHistory,
    priceChange,
    priceConnected,
    grid,
    placeBet,
    timeSlots,
    priceLevels,
    epoch,
    bets,
    recordBet,
    syncWithGrid,
    claimReward,
    config
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
