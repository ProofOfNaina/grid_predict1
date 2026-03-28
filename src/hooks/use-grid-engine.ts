import { useState, useEffect, useCallback, useRef } from 'react';
import type { GridCell, GridConfig } from '@/lib/grid-types';
import { DEFAULT_GRID_CONFIG, BET_CUTOFF_SECONDS } from '@/lib/grid-types';

function generateGridId(priceMin: number, startTime: number) {
  return `grid-${priceMin}-${startTime}`;
}

export function useGridEngine(currentPrice: number, config: GridConfig = DEFAULT_GRID_CONFIG) {
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [epoch, setEpoch] = useState(() => Date.now());
  const epochRef = useRef(epoch);
  const [priceLevels, setPriceLevels] = useState<{ min: number; max: number; label: string }[]>([]);

  const evolveGrid = useCallback(() => {
    const now = Date.now();
    const timeStepMs = config.timeStep * 1000;
    
    setGrid(prev => {
      // 1. Remove cells that have ended more than 30s ago to keep state lean
      const cutoff = now - 30000;
      let updated = prev.filter(cell => cell.endTime > cutoff);

      // 2. Identify the current maximum start time in the grid
      // Align to fixed timeStep boundaries for reliable UI indexing
      const nowRounded = Math.floor(now / timeStepMs) * timeStepMs;
      const maxStartTime = updated.length > 0 
        ? Math.max(...updated.map(c => c.startTime))
        : nowRounded - timeStepMs;

      // 3. If we don't have enough future cells, append them
      const targetMaxTime = nowRounded + config.futureWindow * 1000;
      
      if (maxStartTime < targetMaxTime) {
        const centerPrice = Math.round(currentPrice / config.priceStep) * config.priceStep;
        const newCells: GridCell[] = [];

        // Generate next columns
        let nextStartTime = maxStartTime + timeStepMs;
        while (nextStartTime <= targetMaxTime) {
          for (let pLevel = -config.priceLevels; pLevel <= config.priceLevels; pLevel++) {
            const priceMin = Number((centerPrice + pLevel * config.priceStep).toFixed(2));
            newCells.push({
              id: generateGridId(priceMin, nextStartTime),
              priceMin,
              priceMax: Number((priceMin + config.priceStep).toFixed(2)),
              startTime: nextStartTime,
              endTime: nextStartTime + timeStepMs,
              status: 'OPEN',
              totalBets: 0,
              totalAmount: 0,
            });
          }
          nextStartTime += timeStepMs;
        }
        updated = [...updated, ...newCells];
      }

      return updated;
    });

    // Update price levels (y-axis) only if price drifts out of current center
    const currentCenter = priceLevels.length > 0 ? (priceLevels[0].min + priceLevels[priceLevels.length - 1].max) / 2 : currentPrice;
    const drift = Math.abs(currentPrice - currentCenter);
    const threshold = config.priceStep * (config.priceLevels / 2);

    if (priceLevels.length === 0 || drift > threshold) {
      const centerPrice = Math.round(currentPrice / config.priceStep) * config.priceStep;
      const levels = [];
      for (let pLevel = -config.priceLevels; pLevel <= config.priceLevels; pLevel++) {
        const priceMin = Number((centerPrice + pLevel * config.priceStep).toFixed(2));
        const priceMax = Number((priceMin + config.priceStep).toFixed(2));
        levels.push({ min: priceMin, max: priceMax, label: `$${priceMin}–$${priceMax}` });
      }
      setPriceLevels(levels);
    }
  }, [currentPrice, config, priceLevels]);

  // Initial and periodic update
  useEffect(() => {
    evolveGrid();
    const timer = setInterval(evolveGrid, 2000); // Check every 2s if we need more cells
    return () => clearInterval(timer);
  }, [evolveGrid]);


  // Update statuses based on time and price
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setGrid(prev => prev.map(cell => {
        if (cell.status === 'TOUCHED' || cell.status === 'EXPIRED') return cell;

        // Lock if within cutoff
        if (cell.status === 'OPEN' && now >= cell.startTime - BET_CUTOFF_SECONDS * 1000) {
          return { ...cell, status: 'LOCKED' };
        }

        // Check if price is in range during active window
        if (cell.status === 'LOCKED' && now >= cell.startTime && now <= cell.endTime) {
          if (currentPrice >= cell.priceMin && currentPrice < cell.priceMax) {
            return { ...cell, status: 'TOUCHED' };
          }
        }

        // Expire if window passed
        if (cell.status === 'LOCKED' && now > cell.endTime) {
          if (currentPrice >= cell.priceMin && currentPrice < cell.priceMax) {
            return { ...cell, status: 'TOUCHED' };
          }
          return { ...cell, status: 'EXPIRED' };
        }

        return cell;
      }));
    }, 250);

    return () => clearInterval(interval);
  }, [currentPrice]);

  const placeBet = useCallback((cellId: string, amount: number) => {
    setGrid(prev => prev.map(cell => {
      if (cell.id !== cellId || cell.status !== 'OPEN') return cell;
      return {
        ...cell,
        totalBets: cell.totalBets + 1,
        totalAmount: cell.totalAmount + amount,
        userBet: (cell.userBet || 0) + amount,
      };
    }));
  }, []);

  // Compute time labels
  const timeSlots = Array.from({ length: config.futureWindow / config.timeStep }, (_, i) => ({
    index: i,
    startOffset: i * config.timeStep,
    endOffset: (i + 1) * config.timeStep,
    label: `${i * config.timeStep}–${(i + 1) * config.timeStep}s`,
  }));

  return { grid, placeBet, timeSlots, priceLevels, epoch };
}
