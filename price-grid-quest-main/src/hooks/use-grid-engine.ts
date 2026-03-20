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

  // Regenerate grid every futureWindow seconds
  const regenerateGrid = useCallback(() => {
    const now = Date.now();
    epochRef.current = now;
    setEpoch(now);

    const centerPrice = Math.round(currentPrice / config.priceStep) * config.priceStep;
    const cells: GridCell[] = [];

    for (let pLevel = -config.priceLevels; pLevel <= config.priceLevels; pLevel++) {
      const priceMin = centerPrice + pLevel * config.priceStep;
      const priceMax = priceMin + config.priceStep;

      for (let tSlot = 0; tSlot < config.futureWindow / config.timeStep; tSlot++) {
        const startTime = now + tSlot * config.timeStep * 1000;
        const endTime = startTime + config.timeStep * 1000;

        cells.push({
          id: generateGridId(priceMin, startTime),
          priceMin,
          priceMax,
          startTime,
          endTime,
          status: 'OPEN',
          totalBets: 0,
          totalAmount: 0,
        });
      }
    }

    setGrid(cells);
  }, [currentPrice, config]);

  // Initial generation
  useEffect(() => {
    regenerateGrid();
  }, []); // only on mount

  // Regenerate when window expires
  useEffect(() => {
    const timer = setInterval(() => {
      regenerateGrid();
    }, config.futureWindow * 1000);
    return () => clearInterval(timer);
  }, [config.futureWindow, regenerateGrid]);

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

  // Compute price levels
  const centerPrice = Math.round(currentPrice / config.priceStep) * config.priceStep;
  const priceLevels = Array.from({ length: config.priceLevels * 2 + 1 }, (_, i) => {
    const level = config.priceLevels - i;
    const min = centerPrice + level * config.priceStep;
    return { min, max: min + config.priceStep, label: `$${min}–$${min + config.priceStep}` };
  }).reverse();

  return { grid, placeBet, timeSlots, priceLevels, epoch };
}
