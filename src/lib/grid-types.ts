export type GridStatus = 'OPEN' | 'LOCKED' | 'TOUCHED' | 'EXPIRED';

export interface GridCell {
  id: string;
  priceMin: number;
  priceMax: number;
  startTime: number; // ms timestamp
  endTime: number;   // ms timestamp
  status: GridStatus;
  totalBets: number;
  totalAmount: number;
  userBet?: number;
}

export interface PricePoint {
  time: number;
  price: number;
}

export interface GridConfig {
  priceStep: number;
  timeStep: number;     // seconds
  futureWindow: number; // seconds
  priceLevels: number;  // number of price levels above and below
}

export const PRICE_STEP_MAP: Record<string, number> = {
  'SOL/USD': 0.1,   // 10 cents
  'ETH/USD': 1.0,   // $1
  'BTC/USD': 10.0,  // $10
  'JUP/USD': 0.01,  // 1 cent
  'PYTH/USD': 0.01, // 1 cent
};

export const DEFAULT_GRID_CONFIG: GridConfig = {
  priceStep: 0.1, 
  timeStep: 5,
  futureWindow: 30,
  priceLevels: 4,
};

export const PAYOUT_MULTIPLIER = 4;
export const BET_CUTOFF_SECONDS = 2;

export interface BetRecord {
  id: string;
  cellId: string;
  priceMin: number;
  priceMax: number;
  startTime: number;
  endTime: number;
  amount: number;
  status: GridStatus;
  placedAt: number;
  payout: number;
  claimed: boolean;
}
