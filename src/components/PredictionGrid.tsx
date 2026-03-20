import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { GridCell } from '@/lib/grid-types';

interface PredictionGridProps {
  grid: GridCell[];
  timeSlots: { index: number; label: string }[];
  priceLevels: { min: number; max: number; label: string }[];
  currentPrice: number;
  onCellClick: (cell: GridCell) => void;
}

function getCellStyle(cell: GridCell): string {
  const base = 'flex-1 h-12 rounded-md border transition-all duration-200 flex flex-col items-center justify-center gap-0.5';

  switch (cell.status) {
    case 'OPEN':
      return cell.userBet
        ? cn(base, 'grid-cell-bet cursor-pointer active:scale-[0.96]')
        : cn(base, 'grid-cell-open cursor-pointer active:scale-[0.96]');
    case 'LOCKED':
      return cn(base, 'grid-cell-locked cursor-not-allowed');
    case 'TOUCHED':
      return cell.userBet
        ? cn(base, 'grid-cell-touched animate-pulse-glow')
        : cn(base, 'grid-cell-touched');
    case 'EXPIRED':
      return cn(base, 'grid-cell-expired cursor-not-allowed');
    default:
      return cn(base, 'grid-cell-open');
  }
}

export function PredictionGrid({
  grid,
  timeSlots,
  priceLevels,
  currentPrice,
  onCellClick,
}: PredictionGridProps) {
  const gridMap = useMemo(() => {
    const map = new Map<string, GridCell>();
    grid.forEach(cell => {
      const key = `${cell.priceMin}-${cell.startTime}`;
      map.set(key, cell);
    });
    return map;
  }, [grid]);

  const activePriceLevel = priceLevels.findIndex(
    pl => currentPrice >= pl.min && currentPrice < pl.max
  );

  const reversedLevels = useMemo(() => [...priceLevels].reverse(), [priceLevels]);

  return (
    <div className="flex-1 overflow-auto px-6 py-3">
      <div className="min-w-[600px]">
        {/* Time header */}
        <div className="flex gap-[3px] mb-[3px] ml-[110px]">
          {timeSlots.map((slot, i) => (
            <div
              key={slot.index}
              className="flex-1 text-center text-[9px] font-mono text-muted-foreground/70 py-1 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {slot.label}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="flex flex-col gap-[3px]">
          {reversedLevels.map((priceLevel, rowIdx) => {
            const isActiveRow = priceLevels.length - 1 - rowIdx === activePriceLevel;

            return (
              <div
                key={priceLevel.min}
                className="flex gap-[3px] items-stretch animate-fade-in"
                style={{ animationDelay: `${rowIdx * 50}ms` }}
              >
                {/* Price label */}
                <div
                  className={cn(
                    'w-[110px] flex items-center justify-end pr-3 text-[10px] font-mono shrink-0 transition-colors duration-200',
                    isActiveRow ? 'text-primary font-bold' : 'text-muted-foreground/60'
                  )}
                >
                  <span className="tabular-nums">{priceLevel.label}</span>
                  {isActiveRow && (
                    <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>

                {/* Cells */}
                {timeSlots.map((slot, colIdx) => {
                  const actualPriceLevel = priceLevels[priceLevels.length - 1 - rowIdx];
                  const cell = grid.find(
                    c => c.priceMin === actualPriceLevel.min &&
                    Math.abs(c.startTime - (grid[0]?.startTime || 0) - slot.index * 5000) < 100
                  );

                  if (!cell) {
                    return (
                      <div
                        key={slot.index}
                        className="flex-1 h-12 rounded-md border border-border/30 bg-muted/20"
                      />
                    );
                  }

                  return (
                    <button
                      key={cell.id}
                      onClick={() => cell.status === 'OPEN' && onCellClick(cell)}
                      disabled={cell.status !== 'OPEN'}
                      className={cn(
                        getCellStyle(cell),
                        'animate-cell-reveal',
                        `stagger-${Math.min(colIdx + 1, 6)}`
                      )}
                    >
                      {cell.totalBets > 0 && (
                        <span className="text-[9px] font-mono opacity-60 leading-none">
                          {cell.totalBets} bet{cell.totalBets > 1 ? 's' : ''}
                        </span>
                      )}
                      {cell.userBet && cell.userBet > 0 && (
                        <span className="text-[9px] font-mono font-semibold leading-none">
                          {cell.userBet} SOL
                        </span>
                      )}
                      {cell.status === 'TOUCHED' && cell.userBet && (
                        <span className="text-[9px] font-bold text-primary leading-none">
                          WIN ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
