import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';

export function Header() {
  const { connected, disconnect } = useWallet();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/60 backdrop-blur-md animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <span className="text-primary font-bold text-sm font-mono">G</span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-none">GridPredict</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">
            SOL Price Predictions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground font-mono bg-muted/50 rounded-md px-2.5 py-1.5 border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          devnet
        </div>
        {connected && (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/50 rounded-md px-2.5 py-1.5 border border-border">
            Payout <span className="text-primary font-semibold">4×</span>
          </div>
        )}
        {connected ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all uppercase tracking-wider"
            >
              <UserCircle className="w-4 h-4" />
              Profile
            </button>
            <WalletMultiButton className="!bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" />
            <button
              onClick={() => { disconnect(); navigate('/'); }}
              className="px-3 py-1.5 rounded-md text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-all uppercase tracking-wider"
            >
              Log Out
            </button>
          </div>
        ) : (
          <WalletMultiButton />
        )}
      </div>
    </header>
  );
}
