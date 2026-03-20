import { useEffect, useState } from 'react';
import type { GridCell } from '@/lib/grid-types';

interface StatsBarProps {
  grid: GridCell[];
  epoch: number;
}

function StatItem({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-mono">
      <span className="text-muted-foreground/60">{label}</span>
      <span className={accent ? 'text-primary font-semibold' : 'text-foreground/80'}>
        {value}
      </span>
    </span>
  );
}

export function StatsBar({ grid, epoch }: StatsBarProps) {
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefresh(Math.max(0, Math.ceil((epoch + 30000 - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [epoch]);

  const open = grid.filter(c => c.status === 'OPEN').length;
  const locked = grid.filter(c => c.status === 'LOCKED').length;
  const touched = grid.filter(c => c.status === 'TOUCHED').length;
  const totalBets = grid.reduce((sum, c) => sum + c.totalBets, 0);
  const totalVolume = grid.reduce((sum, c) => sum + c.totalAmount, 0);
  const userWins = grid.filter(c => c.status === 'TOUCHED' && c.userBet).length;

  return (
    <div className="flex items-center gap-5 px-6 py-2 border-t border-border bg-card/40 animate-slide-in-bottom" style={{ animationDelay: '200ms' }}>
      <StatItem label="Open" value={open} />
      <StatItem label="Locked" value={locked} />
      <StatItem label="Touched" value={touched} accent />
      <StatItem label="Bets" value={totalBets} />
      <StatItem label="Vol" value={`${totalVolume.toFixed(2)} SOL`} />
      {userWins > 0 && <StatItem label="Wins" value={userWins} accent />}
      <span className="ml-auto flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/50">
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30 animate-pulse" />
        {refresh}s
      </span>
    </div>
  );
}
