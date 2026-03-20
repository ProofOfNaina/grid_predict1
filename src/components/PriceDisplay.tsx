import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  change: 'up' | 'down' | null;
  pair: string;
  connected?: boolean;
}

export function PriceDisplay({ price, change, pair, connected }: PriceDisplayProps) {
  return (
    <div className="flex items-center gap-5 px-6 py-3 bg-card/40 border-b border-border animate-slide-in-bottom">
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-muted-foreground font-medium tracking-tight">{pair}</span>
        <span className={cn(
          'text-[9px] font-mono font-medium px-2 py-0.5 rounded-full uppercase tracking-wider',
          connected
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-accent/10 text-accent border border-accent/20'
        )}>
          {connected ? 'Pyth Live' : 'Simulated'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-2xl font-bold font-mono tabular-nums transition-colors duration-200',
            change === 'up' && 'text-primary',
            change === 'down' && 'text-destructive',
            !change && 'text-foreground'
          )}
        >
          ${price.toFixed(2)}
        </span>
        {change && (
          <span
            className={cn(
              'text-xs font-mono animate-price-tick leading-none',
              change === 'up' ? 'text-primary' : 'text-destructive'
            )}
          >
            {change === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] grid-cell-open border" /> Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] grid-cell-bet border" /> Your Bet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] grid-cell-locked border" /> Locked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] grid-cell-touched border" /> Won
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] grid-cell-expired border" /> Expired
        </span>
      </div>
    </div>
  );
}
