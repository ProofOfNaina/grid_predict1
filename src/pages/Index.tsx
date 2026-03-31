import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { PriceDisplay } from '@/components/PriceDisplay';
import { PriceChart } from '@/components/PriceChart';
import { PredictionGrid } from '@/components/PredictionGrid';
import { BettingModal } from '@/components/BettingModal';
import { BetHistoryPanel } from '@/components/BetHistoryPanel';
import { StatsBar } from '@/components/StatsBar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrading } from '@/contexts/TradingContext';
import { buildClaimRewardTransaction, checkIsAdmin } from '@/lib/anchor-client';
import type { GridCell, BetRecord } from '@/lib/grid-types';

const Index = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const {
    activePair, setActivePair,
    currentPrice, priceHistory, priceChange, priceConnected,
    grid, placeBet, timeSlots, priceLevels, epoch,
    bets, recordBet, claimReward
  } = useTrading();

  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [vaultBalance, setVaultBalance] = useState(0);

  // Sync vault balance periodically
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { getVaultPDA } = await import('@/lib/anchor-client');
        const [vaultPDA] = getVaultPDA();
        const balance = await connection.getBalance(vaultPDA);
        setVaultBalance(balance / 1e9);
      } catch (err) {
        console.error('[VAULT FETCH ERROR]', err);
      }
    };

    fetchBalance();
    const timer = setInterval(fetchBalance, 10000);
    return () => clearInterval(timer);
  }, [connection]);

  const handleCellClick = useCallback((cell: GridCell) => {
    setSelectedCell(cell);
  }, []);

  const handlePlaceBet = useCallback(
    (cell: GridCell, amount: number, txHash?: string) => {
      placeBet(cell.id, amount);
      recordBet(cell, amount, txHash);
    },
    [placeBet, recordBet]
  );

  const handleClaim = useCallback(async (betId: string) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet || !wallet.connected || !wallet.publicKey || !wallet.sendTransaction) return;

    try {
      const tx = await buildClaimRewardTransaction(connection, wallet, bet.priceMin, bet.startTime);
      if (tx) {
        const sig = await wallet.sendTransaction(tx, connection);
        toast.info('Claiming reward...', { description: 'Confirming on chain...' });
        await connection.confirmTransaction(sig, 'confirmed');
        toast.success('Reward claimed successfully!', {
          description: `TX: ${sig.slice(0, 12)}...`,
          action: {
            label: 'View Explorer',
            onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, '_blank')
          }
        });
        claimReward(betId);
      }
    } catch (err: any) {
      console.error('[CLAIM ERROR]', err);
      toast.error('Failed to claim reward', { description: err.message || 'Check console' });
    }
  }, [bets, connection, wallet, claimReward]);

  const handleCollectRevenue = useCallback(async (amount: number) => {
    if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) return;
    try {
      const { buildCollectRevenueTransaction } = await import('@/lib/anchor-client');
      const tx = await buildCollectRevenueTransaction(connection, wallet, amount);
      if (tx) {
        const sig = await wallet.sendTransaction(tx, connection);
        toast.info('Withdrawing revenue...', { description: 'Confirming on chain...' });
        await connection.confirmTransaction(sig, 'confirmed');
        toast.success(`Withdrawn ${amount} SOL!`, {
          description: `TX: ${sig.slice(0, 12)}...`,
          action: {
            label: 'View Explorer',
            onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, '_blank')
          }
        });
      }
    } catch (err: any) {
      console.error('[COLLECT ERROR]', err);
      toast.error('Failed to withdraw revenue', { description: err.message || 'Check console' });
    }
  }, [connection, wallet]);

  const handleResolveGrid = useCallback(async (betId: string) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet || !wallet.connected || !wallet.publicKey || !wallet.sendTransaction) return;
    try {
      const { buildResolveGridTransaction } = await import('@/lib/anchor-client');
      const tx = await buildResolveGridTransaction(connection, wallet, bet.priceMin, bet.startTime);
      if (tx) {
        const sig = await wallet.sendTransaction(tx, connection);
        toast.info('Resolving Grid on-chain...', { description: 'Confirming state change...' });
        await connection.confirmTransaction(sig, 'confirmed');
        toast.success('Grid resolved successfully!', {
          description: `TX: ${sig.slice(0, 12)}...`,
        });
      }
    } catch (err: any) {
      console.error('[RESOLVE ERROR]', err);
      toast.error('Failed to resolve grid', { description: err.message || 'Check console' });
    }
  }, [bets, connection, wallet]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Header />
      <div className="px-6 py-2 border-b">
        <Tabs value={activePair} onValueChange={setActivePair} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="SOL/USD">SOL</TabsTrigger>
            <TabsTrigger value="ETH/USD">ETH</TabsTrigger>
            <TabsTrigger value="BTC/USD">BTC</TabsTrigger>
            <TabsTrigger value="JUP/USD">JUP</TabsTrigger>
            <TabsTrigger value="PYTH/USD">PYTH</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <PriceDisplay price={currentPrice} change={priceChange} pair={activePair} connected={priceConnected} />
      <PriceChart history={priceHistory} />
      <PredictionGrid
        grid={grid}
        timeSlots={timeSlots}
        priceLevels={priceLevels}
        currentPrice={currentPrice}
        symbol={activePair.split('/')[0]}
        onCellClick={handleCellClick}
      />
      <StatsBar grid={grid} epoch={epoch} />
      <BetHistoryPanel
        bets={bets}
        onClaim={handleClaim}
        visible={historyVisible}
        onToggle={() => setHistoryVisible(v => !v)}
        vaultBalance={vaultBalance}
        onCollectRevenue={handleCollectRevenue}
        onResolveGrid={handleResolveGrid}
        isAdmin={checkIsAdmin(wallet.publicKey?.toBase58())}
      />
      {selectedCell && (
        <BettingModal
          cell={selectedCell}
          symbol={activePair.split('/')[0]}
          onClose={() => setSelectedCell(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}
    </div>
  );
};

export default Index;
