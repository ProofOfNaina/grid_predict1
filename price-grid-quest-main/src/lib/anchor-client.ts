// Anchor Program Integration Layer
// Connects the frontend to a deployed Solana program.
// Replace PROGRAM_ID with your actual deployed program ID.

import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';

// Replace with your deployed program ID after `anchor deploy`
export const PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

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

// Instruction builders using Anchor discriminators
// These match the Anchor program in anchor-program/lib.rs

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
// These are pre-computed for the instruction names in the Anchor program
const DISCRIMINATORS = {
  place_bet: Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]),  // sha256("global:place_bet")[0..8]
  claim_reward: Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]), // sha256("global:claim_reward")[0..8]
};

export async function buildPlaceBetTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  startTime: number,
  amount: number, // in SOL
): Promise<Transaction | null> {
  if (!wallet.publicKey || !isProgramDeployed()) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [betPDA] = getBetPDA(gridPDA, wallet.publicKey);
  const [vaultPDA] = getVaultPDA();

  const lamports = Math.round(amount * 1e9); // SOL to lamports

  const data = Buffer.concat([
    DISCRIMINATORS.place_bet,
    encodeU64(lamports),
  ]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gridPDA, isSigner: false, isWritable: true },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
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

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: gridPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: DISCRIMINATORS.claim_reward,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return tx;
}
