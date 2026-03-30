import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { BetRecord, GridCell } from '@/lib/grid-types';
import { PAYOUT_MULTIPLIER } from '@/lib/grid-types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export function useBetHistory() {
  const { publicKey } = useWallet();
  const [bets, setBets] = useState<BetRecord[]>([]);

  // Load from local storage and Supabase when wallet connects
  useEffect(() => {
    if (!publicKey) {
      setBets([]);
      return;
    }
    
    const loadBets = async () => {
      let loadedFromDb = false;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase!
            .from('bets')
            .select('*')
            .eq('wallet_address', publicKey.toBase58());
            
          if (data && data.length > 0 && !error) {
            const mappedBets = data.map(b => ({
              id: b.id,
              cellId: b.cell_id,
              priceMin: Number(b.price_min),
              priceMax: Number(b.price_max),
              startTime: Number(b.start_time),
              endTime: Number(b.end_time),
              amount: Number(b.amount),
              status: b.status,
              payout: Number(b.payout),
              txHash: b.tx_hash,
              claimed: b.claimed,
              placedAt: Number(b.placed_at),
            }));
            setBets(mappedBets);
            // Sync this to local storage
            localStorage.setItem(`bets_${publicKey.toBase58()}`, JSON.stringify(mappedBets));
            loadedFromDb = true;
          }
        } catch(e) { console.error('Error loading bets from db', e); }
      }
      
      if (!loadedFromDb) {
        const stored = localStorage.getItem(`bets_${publicKey.toBase58()}`);
        if (stored) {
          try {
            setBets(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse stored bets", e);
            setBets([]);
          }
        } else {
          setBets([]);
        }
      }
    };
    
    loadBets();
  }, [publicKey]);

  // Save to local storage and Supabase whenever bets change
  useEffect(() => {
    if (publicKey && bets.length > 0) {
      localStorage.setItem(`bets_${publicKey.toBase58()}`, JSON.stringify(bets));
      
      if (isSupabaseConfigured()) {
        const dbBets = bets.map(b => ({
          id: b.id,
          wallet_address: publicKey.toBase58(),
          cell_id: b.cellId,
          price_min: b.priceMin,
          price_max: b.priceMax,
          start_time: b.startTime,
          end_time: b.endTime,
          amount: b.amount,
          status: b.status,
          payout: b.payout,
          tx_hash: b.txHash || null,
          claimed: b.claimed,
          placed_at: b.placedAt,
        }));

        supabase!.from('bets').upsert(dbBets, { onConflict: 'id' })
        .then(({error}) => { 
          if (error) console.error("Error saving bets to db", error); 
        });
      }
    }
  }, [bets, publicKey]);

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
