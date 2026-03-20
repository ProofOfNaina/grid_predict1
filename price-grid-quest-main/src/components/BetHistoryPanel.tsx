import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BetRecord } from '@/lib/grid-types';
import { PAYOUT_MULTIPLIER } from '@/lib/grid-types';

interface BetHistoryPanelProps {
  bets: BetRecord[];
  onClaim: (betId: string) => void;
  visible: boolean;
  onToggle: () => void;
}

function statusLabel(status: string) {
  switch (status) {
    case 'OPEN': return 'Pending';
    case 'LOCKED': return 'Active';
    case 'TOUCHED': return 'Won';
    case 'EXPIRED': return 'Lost';
    default: return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'OPEN': return 'text-muted-foreground';
    case 'LOCKED': return 'text-accent';
    case 'TOUCHED': return 'text-primary';
    case 'EXPIRED': return 'text-destructive/70';
    default: return 'text-muted-foreground';
  }
}

export function BetHistoryPanel({ bets, onClaim, visible, onToggle }: BetHistoryPanelProps) {
  const stats = useMemo(() => {
    const totalBet = bets.reduce((s, b) => s + b.amount, 0);
    const wins = bets.filter(b => b.status === 'TOUCHED');
    const totalWon = wins.reduce((s, b) => s + b.amount * PAYOUT_MULTIPLIER, 0);
    const pending = bets.filter(b => b.status === 'OPEN' || b.status === 'LOCKED').length;
    const claimable = wins.filter(b => !b.claimed);
    return { totalBet, totalWon, pending, claimable, wins: wins.length };
  }, [bets]);

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40 px-1 py-5 rounded-l-md border border-r-0 border-border',
          'bg-card text-muted-foreground/60 hover:text-foreground transition-all duration-200',
          'text-[9px] font-mono font-medium tracking-widest uppercase',
          'hover:bg-muted active:scale-95',
          visible && 'opacity-0 pointer-events-none'
        )}
        style={{ writingMode: 'vertical-rl' }}
      >
        Bets ({bets.length})
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-40 w-72 bg-card border-l border-border',
          'flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-xs tracking-tight">Bet History</h2>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-sm leading-none transition-all active:scale-95"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 p-3 border-b border-border">
          <div className="bg-muted/50 rounded-md p-2 text-center border border-border/50">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-medium">Wagered</div>
            <div className="font-mono font-semibold text-[11px] mt-0.5 tabular-nums">{stats.totalBet.toFixed(2)}</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2 text-center border border-border/50">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-medium">Won</div>
            <div className="font-mono font-semibold text-[11px] mt-0.5 text-primary tabular-nums">{stats.totalWon.toFixed(2)}</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2 text-center border border-border/50">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-medium">Pending</div>
            <div className="font-mono font-semibold text-[11px] mt-0.5 tabular-nums">{stats.pending}</div>
          </div>
        </div>

        {/* Claimable banner */}
        {stats.claimable.length > 0 && (
          <div className="mx-3 mt-3 p-2.5 rounded-lg bg-primary/8 border border-primary/15 animate-pulse-glow">
            <div className="text-[11px] font-semibold text-primary mb-0.5">
              {stats.claimable.length} reward{stats.claimable.length > 1 ? 's' : ''} ready
            </div>
            <div className="text-[9px] text-muted-foreground font-mono tabular-nums">
              {stats.claimable.reduce((s, b) => s + b.amount * PAYOUT_MULTIPLIER, 0).toFixed(2)} SOL claimable
            </div>
          </div>
        )}

        {/* Bet list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-muted-foreground/60 text-xs mb-1">No bets yet</div>
              <div className="text-muted-foreground/30 text-[10px] leading-relaxed">
                Click an open grid cell to place your first prediction
              </div>
            </div>
          ) : (
            [...bets].reverse().map((bet, i) => (
              <div
                key={bet.id}
                className={cn(
                  'rounded-md border p-2.5 transition-all duration-200 animate-slide-in-bottom',
                  bet.status === 'TOUCHED' && !bet.claimed
                    ? 'border-primary/25 bg-primary/5'
                    : 'border-border/60 bg-muted/20'
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-semibold tabular-nums">
                    ${bet.priceMin}–${bet.priceMax}
                  </span>
                  <span className={cn('text-[9px] font-semibold', statusColor(bet.status))}>
                    {statusLabel(bet.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 font-mono">
                  <span className="tabular-nums">{bet.amount} SOL</span>
                  <span className="tabular-nums">
                    {new Date(bet.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {bet.status === 'TOUCHED' && !bet.claimed && (
                  <button
                    onClick={() => onClaim(bet.id)}
                    className={cn(
                      'w-full mt-2 py-1.5 rounded-md text-[10px] font-semibold',
                      'bg-primary text-primary-foreground',
                      'hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)] active:scale-[0.97] transition-all'
                    )}
                  >
                    Claim {(bet.amount * PAYOUT_MULTIPLIER).toFixed(2)} SOL
                  </button>
                )}

                {bet.status === 'TOUCHED' && bet.claimed && (
                  <div className="mt-1 text-[9px] text-primary/70 font-mono">
                    ✓ {(bet.amount * PAYOUT_MULTIPLIER).toFixed(2)} SOL claimed
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
