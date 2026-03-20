import { useState, useEffect, useRef } from 'react';
import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import type { PricePoint } from '@/lib/grid-types';

const HERMES_URL = 'https://hermes.pyth.network';

// Pyth feed IDs (without 0x prefix for the client)
const FEED_IDS: Record<string, string> = {
  'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
};

const FALLBACK_PRICE = 172; // SOL approximate
const VOLATILITY = 0.3;

export function usePriceFeed(pair: string = 'SOL/USD') {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null);
  const [connected, setConnected] = useState(false);
  const prevPriceRef = useRef(0);
  const connectionRef = useRef<PriceServiceConnection | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const feedId = FEED_IDS[pair] || FEED_IDS['SOL/USD'];

  // Push a new price into state
  const pushPrice = (price: number) => {
    const direction = price > prevPriceRef.current ? 'up' : price < prevPriceRef.current ? 'down' : null;
    prevPriceRef.current = price;
    setCurrentPrice(price);
    setPriceChange(direction);

    const point: PricePoint = { time: Date.now(), price };
    setPriceHistory(h => {
      const updated = [...h, point];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  };

  // Start simulated fallback
  const startFallback = (basePrice: number) => {
    if (fallbackIntervalRef.current) return;
    console.log('⚠️ Pyth connection failed, using simulated prices');
    let p = basePrice || FALLBACK_PRICE;
    prevPriceRef.current = p;

    // Seed history
    const now = Date.now();
    const initial: PricePoint[] = [];
    for (let i = 60; i >= 0; i--) {
      p += (Math.random() - 0.5) * VOLATILITY;
      initial.push({ time: now - i * 1000, price: p });
    }
    setPriceHistory(initial);
    setCurrentPrice(p);
    prevPriceRef.current = p;

    fallbackIntervalRef.current = setInterval(() => {
      const delta = (Math.random() - 0.5) * VOLATILITY;
      const next = Math.max(prevPriceRef.current + delta, 1);
      pushPrice(next);
    }, 500);
  };

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const pyth = new PriceServiceConnection(HERMES_URL, {
          priceFeedRequestConfig: { binary: false },
        });
        connectionRef.current = pyth;

        // Get initial price
        const feeds = await pyth.getLatestPriceFeeds([feedId]);
        if (cancelled) return;

        if (feeds && feeds.length > 0) {
          const pf = feeds[0];
          const priceData = pf.getPriceUnchecked();
          const initialPrice = Number(priceData.price) * Math.pow(10, priceData.expo);

          if (initialPrice > 0) {
            prevPriceRef.current = initialPrice;
            setCurrentPrice(initialPrice);
            setPriceHistory([{ time: Date.now(), price: initialPrice }]);
            setConnected(true);

            // Subscribe to streaming updates
            pyth.subscribePriceFeedUpdates([feedId], (priceFeed) => {
              if (cancelled) return;
              const pd = priceFeed.getPriceUnchecked();
              const price = Number(pd.price) * Math.pow(10, pd.expo);
              if (price > 0) {
                pushPrice(price);
              }
            });

            console.log(`✅ Connected to Pyth ${pair} feed — $${initialPrice.toFixed(2)}`);
            return;
          }
        }

        // If we get here, no valid price — fallback
        startFallback(FALLBACK_PRICE);
      } catch (err) {
        console.warn('Pyth connection error:', err);
        if (!cancelled) {
          startFallback(FALLBACK_PRICE);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (connectionRef.current) {
        try {
          connectionRef.current.unsubscribePriceFeedUpdates([feedId]);
          connectionRef.current.closeWebSocket();
        } catch {}
        connectionRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [feedId, pair]);

  // Clear price change indicator after flash
  useEffect(() => {
    if (priceChange) {
      const t = setTimeout(() => setPriceChange(null), 300);
      return () => clearTimeout(t);
    }
  }, [priceChange]);

  return { currentPrice, priceHistory, priceChange, connected };
}
