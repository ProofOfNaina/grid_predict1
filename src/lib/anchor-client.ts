// Anchor Program Integration Layer
// Connects the frontend to a deployed Solana program.
// Replace PROGRAM_ID with your actual deployed program ID.

import { PublicKey, SystemProgram, Transaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';

// Replace with your deployed program ID after `anchor deploy`
export const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');

// PDA derivation helpers
export function getGridPDA(priceMin: number, startTime: number): [PublicKey, number] {
  const priceMinBuf = Buffer.alloc(8);
  priceMinBuf.writeBigUInt64LE(BigInt(Math.round(priceMin * 100))); // cents

  const startTimeBuf = Buffer.alloc(8);
  startTimeBuf.writeBigInt64LE(BigInt(Math.floor(startTime / 1000))); // unix seconds

  return PublicKey.findProgramAddressSync(
    [Buffer.from('grid'), priceMinBuf, startTimeBuf],
    PROGRAM_ID
  );
}

export function getBetPDA(gridKey: PublicKey, bettor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), gridKey.toBuffer(), bettor.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
}

// Check if we're connected to a real program (not the system program placeholder)
export function isProgramDeployed(): boolean {
  return PROGRAM_ID.toBase58() !== '11111111111111111111111111111111';
}

// Helper methods for encoding
function encodeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(Math.round(value)));
  return buf;
}

function encodeI64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(Math.floor(value)));
  return buf;
}

// Anchor instruction discriminators (first 8 bytes of sha256("global:<instruction_name>"))
const DISCRIMINATORS = {
  initialize_vault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]), // sha256("global:initialize_vault")[0..8]
  create_grid: Buffer.from([100, 135, 127, 158, 30, 0, 37, 82]), // sha256("global:create_grid")[0..8]
  place_bet: Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]),  // sha256("global:place_bet")[0..8]
  claim_reward: Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]), // sha256("global:claim_reward")[0..8]
  collect_revenue: Buffer.from([87, 96, 211, 36, 240, 43, 246, 87]), // sha256("global:collect_revenue")
  resolve_grid: Buffer.from([140, 52, 19, 246, 85, 99, 60, 249]), // sha256("global:resolve_grid")[0..8]
};

const ADMIN_PUBKEY = new PublicKey('3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN');

export async function buildCollectRevenueTransaction(
  connection: Connection,
  wallet: WalletContextState,
  amount: number, // in SOL
): Promise<Transaction | null> {
  if (!wallet.publicKey || !isProgramDeployed()) return null;

  const [vaultPDA] = getVaultPDA();
  const lamports = Math.round(amount * 1e9);

  const data = Buffer.concat([
    DISCRIMINATORS.collect_revenue,
    encodeU64(lamports),
  ]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // Owner
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // Authority
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return tx;
}

export async function buildPlaceBetTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  priceMax: number,
  startTime: number,
  endTime: number,
  amount: number, // in SOL
): Promise<Transaction | null> {
  if (!wallet.publicKey || !isProgramDeployed()) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [betPDA] = getBetPDA(gridPDA, wallet.publicKey);
  const [vaultPDA] = getVaultPDA();

  const tx = new Transaction();

  // 0. Add Compute Budget (Multi-instruction transactions need more units)
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }));

  // Check vault and grid existence
  const [vaultInfo, gridInfo] = await Promise.all([
    connection.getAccountInfo(vaultPDA),
    connection.getAccountInfo(gridPDA)
  ]);

  // 1. Initialize Vault if it doesn't exist
  if (!vaultInfo) {
    tx.add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: DISCRIMINATORS.initialize_vault,
    }));
  }

  // 2. Create Grid if it doesn't exist
  if (!gridInfo) {
    const initData = Buffer.concat([
      DISCRIMINATORS.create_grid,
      encodeU64(priceMin * 100),
      encodeU64(priceMax * 100),
      encodeI64(startTime / 1000),
      encodeI64(endTime / 1000),
    ]);

    tx.add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: gridPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initData,
    }));
  }

  const lamports = Math.round(amount * 1e9);
  const betData = Buffer.concat([
    DISCRIMINATORS.place_bet,
    encodeU64(priceMin * 100),
    encodeI64(startTime / 1000),
    encodeU64(lamports),
  ]);

  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gridPDA, isSigner: false, isWritable: true },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: betData,
  }));

  tx.feePayer = wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return tx;
}

export async function buildClaimRewardTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  startTime: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey || !isProgramDeployed()) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [betPDA] = getBetPDA(gridPDA, wallet.publicKey);
  const [vaultPDA] = getVaultPDA();

  const tx = new Transaction();

  // Add Compute Budget
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }));

  // Check grid status to see if we need to resolve it first
  const gridInfo = await connection.getAccountInfo(gridPDA);
  if (gridInfo && gridInfo.data.length >= 73) {
    const status = gridInfo.data[72]; // 2 means Touched
    if (status !== 2) {
      const vaultInfo = await connection.getAccountInfo(vaultPDA);
      const vaultOwner = vaultInfo ? new PublicKey(vaultInfo.data.subarray(8, 40)) : ADMIN_PUBKEY;

      const resolveIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: gridPDA, isSigner: false, isWritable: true },
          { pubkey: vaultPDA, isSigner: false, isWritable: true },
          { pubkey: vaultOwner, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        data: DISCRIMINATORS.resolve_grid,
      });
      tx.add(resolveIx);
    }
  }

  const data = Buffer.concat([
    DISCRIMINATORS.claim_reward,
    encodeU64(priceMin * 100),
    encodeI64(startTime / 1000),
  ]);

  const claimIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: gridPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data,
  });

  tx.add(claimIx);

  tx.feePayer = wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return tx;
}
