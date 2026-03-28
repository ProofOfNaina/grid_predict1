import { useState, useCallback } from 'react';
import type { BetRecord, GridCell } from '@/lib/grid-types';
import { PAYOUT_MULTIPLIER } from '@/lib/grid-types';

export function useBetHistory() {
  const [bets, setBets] = useState<BetRecord[]>([]);

  const recordBet = useCallback((cell: GridCell, amount: number, txHash?: string) => {
    const bet: BetRecord = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cellId: cell.id,
      priceMin: cell.priceMin,
      priceMax: cell.priceMax,
      startTime: cell.startTime,
      endTime: cell.endTime,
      amount,
      status: 'OPEN',
      placedAt: Date.now(),
      payout: amount * PAYOUT_MULTIPLIER,
      txHash,
      claimed: false,
    };
    setBets(prev => [...prev, bet]);
  }, []);

  // Sync bet statuses with grid state
  const syncWithGrid = useCallback((grid: GridCell[]) => {
    setBets(prev => {
      let changed = false;
      const updated = prev.map(bet => {
        const cell = grid.find(c => c.id === bet.cellId);
        if (cell && cell.status !== bet.status) {
          changed = true;
          return { ...bet, status: cell.status };
        }
        return bet;
      });
      return changed ? updated : prev;
    });
  }, []);

  const claimReward = useCallback((betId: string) => {
    setBets(prev => prev.map(b =>
      b.id === betId ? { ...b, claimed: true } : b
    ));
  }, []);

  return { bets, recordBet, syncWithGrid, claimReward };
}
