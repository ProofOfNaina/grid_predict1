import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '@/lib/utils';
import type { GridCell } from '@/lib/grid-types';
import { PAYOUT_MULTIPLIER } from '@/lib/grid-types';
import { isProgramDeployed, buildPlaceBetTransaction } from '@/lib/anchor-client';
import { toast } from 'sonner';

interface BettingModalProps {
  cell: GridCell;
  symbol: string;
  onClose: () => void;
  onPlaceBet: (cell: GridCell, amount: number, txHash?: string) => void;
}

const QUICK_AMOUNTS = [0.1, 0.5, 1, 2];

export function BettingModal({ cell, symbol, onClose, onPlaceBet }: BettingModalProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('0.5');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const potentialWin = numAmount * PAYOUT_MULTIPLIER;
  const onChain = isProgramDeployed() && wallet.connected;

  const handlePlaceBet = async () => {
    if (numAmount <= 0 || !wallet.connected) return;
    setPlacing(true);
    setError('');

    try {
      if (onChain && wallet.sendTransaction && wallet.publicKey) {
        // Log debug info
        console.log('[BET DEBUG]', {
          priceMin: cell.priceMin,
          startTime: cell.startTime,
          amount: numAmount,
          wallet: wallet.publicKey.toBase58()
        });

        // Pre-check balance
        const balance = await connection.getBalance(wallet.publicKey);
        const required = (numAmount * 1e9) + 5000000; // Bet + ~0.005 SOL for rent/fees
        
        if (balance < required) {
          throw new Error(`Insufficient SOL. Need ~${(required/1e9).toFixed(3)} SOL for bet and fees.`);
        }

        const tx = await buildPlaceBetTransaction(
          connection,
          wallet,
          cell.priceMin,
          cell.priceMax,
          cell.startTime,
          cell.endTime,
          numAmount,
        );
        
        if (tx) {
          // Manual simulation for better error visibility
          console.log('[BET SIMULATING]...');
          const simulation = await connection.simulateTransaction(tx);
          if (simulation.value.err) {
            console.error('[SIMULATION FAILED]', simulation.value);
            if (simulation.value.logs) {
              console.log('[SIMUALTION LOGS]', simulation.value.logs);
            }
            throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
          }

          const sig = await wallet.sendTransaction(tx, connection);
          console.log('[BET SUCCESS] Signature:', sig);
          await connection.confirmTransaction(sig, 'confirmed');
          toast.success(`Bet placed!`, {
            description: `TX: ${sig.slice(0, 12)}...`,
            action: {
              label: 'View Explorer',
              onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, '_blank')
            }
          });
          onPlaceBet(cell, numAmount, sig);
        }
      } else {
        await new Promise(r => setTimeout(r, 800));
        toast.success('Bet placed (simulated)');
        onPlaceBet(cell, numAmount);
      }

      onClose();
    } catch (err: any) {
      console.error('[BET ERROR]', err);
      
      let msg = err?.message || 'Transaction failed';
      
      // Specifically handle common Anchor/Solana errors
      if (err.message?.includes('0x1771')) msg = 'Too early to bet on this slot';
      if (err.message?.includes('Account already in use')) msg = 'Someone already bet on this slot';
      if (err.message?.includes('0x1')) msg = 'Insufficient SOL in your wallet';
      
      if (err.logs) {
        console.log('[BET LOGS]', err.logs);
        // Extract better error message from logs if possible
        const anchorError = err.logs.find((l: string) => l.includes('Error Number:'));
        if (anchorError) {
          msg = `Program Error: ${anchorError.split(':').pop()?.trim()}`;
        }
      }
      
      setError(msg.length > 120 ? msg.slice(0, 120) + '...' : msg);
      toast.error('Transaction failed');
    } finally {
      setPlacing(false);
    }
  };

  const timeUntilStart = Math.max(0, Math.floor((cell.startTime - Date.now()) / 1000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-bold text-sm tracking-tight">Place Prediction</h2>
            {onChain && (
              <span className="text-[8px] text-primary font-mono bg-primary/10 rounded px-1.5 py-0.5 border border-primary/20">
                ON-CHAIN
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-sm leading-none active:scale-95"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Info cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/60 rounded-lg p-2.5 border border-border/50">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">
                Price Range
              </div>
              <div className="font-mono font-semibold text-xs tabular-nums">
                ${cell.priceMin}–${cell.priceMax}
              </div>
            </div>
            <div className="bg-muted/60 rounded-lg p-2.5 border border-border/50">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">
                Time Window
              </div>
              <div className="font-mono font-semibold text-xs">
                {timeUntilStart > 0 ? `In ${timeUntilStart}s` : 'Active'}
              </div>
            </div>
          </div>

          {/* Amount Selection Section */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/40 space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground/70 mb-1.5 block uppercase tracking-wider font-semibold">
                Amount ({symbol})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  step="0.1"
                  min="0.01"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 font-mono text-sm tabular-nums
                             focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-foreground"
                  placeholder="0.5"
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-1.5">
              {QUICK_AMOUNTS.map(qa => (
                <button
                  key={qa}
                  onClick={() => setAmount(String(qa))}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[10px] font-mono font-bold border transition-all duration-150 active:scale-95',
                    amount === String(qa)
                      ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                      : 'bg-muted/60 border-border text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {qa}
                </button>
              ))}
            </div>
          </div>

          {/* Potential win */}
          {numAmount > 0 && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-primary/5 border border-primary/15">
              <span className="text-[10px] text-muted-foreground">Potential Win</span>
              <span className="font-mono font-bold text-primary text-sm tabular-nums">
                {potentialWin.toFixed(2)} {symbol}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-[11px] text-destructive bg-destructive/8 border border-destructive/15 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Action */}
          {wallet.connected ? (
            <button
              onClick={handlePlaceBet}
              disabled={numAmount <= 0 || placing}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-150',
                'bg-primary text-primary-foreground',
                'hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] active:scale-[0.98]',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
              )}
            >
              {placing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {onChain ? 'Signing...' : 'Confirming...'}
                </span>
              ) : (
                `Bet ${numAmount} ${symbol}`
              )}
            </button>
          ) : (
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/50 text-center tracking-wide">
            {PAYOUT_MULTIPLIER}× payout · Devnet only · Bets are final
          </p>
        </div>
      </div>
    </div>
  );
}
