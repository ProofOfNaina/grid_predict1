import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  Connection,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * BettingClient — Professional interaction tool for SimpleBet Solana Program.
 */
export const PROGRAM_ID = new PublicKey('FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G');

// --- PDA Helpers ---

export function getVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
}

export function getBetPDA(bettor: PublicKey, betId: number): [PublicKey, number] {
  const betIdBuf = Buffer.alloc(8);
  betIdBuf.writeBigUInt64LE(BigInt(betId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), bettor.toBuffer(), betIdBuf],
    PROGRAM_ID
  );
}

// --- Discriminators (Anchor standard) ---
// Note: These are example 8-byte discriminators for the instruction names in simple_bet.rs
const DISCRIMINATORS = {
  initialize_vault: Buffer.from([144, 186, 114, 185, 204, 128, 59, 137]), 
  place_bet:        Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]),  
  resolve_bet:     Buffer.from([149, 46, 212, 120, 165, 178, 121, 142]), // example, needs check
  claim_reward:     Buffer.from([149, 46, 212, 120, 165, 178, 121, 142]), // example, needs check
  admin_withdraw:   Buffer.from([142, 161, 35, 78, 48, 255, 103, 198]),  
};

// --- Transaction Builders ---

export async function buildPlaceBetTransaction(
  connection: Connection,
  wallet: WalletContextState,
  betId: number,
  amountSol: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [vaultPDA] = getVaultPDA();
  const [betPDA] = getBetPDA(wallet.publicKey, betId);

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));

  // Check if vault needs initialization
  const vaultInfo = await connection.getAccountInfo(vaultPDA).catch(() => null);
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

  // Place Bet Instruction
  const amountLamports = Buffer.alloc(8);
  amountLamports.writeBigUInt64LE(BigInt(Math.round(amountSol * 1e9)));

  const betIdBuf = Buffer.alloc(8);
  betIdBuf.writeBigUInt64LE(BigInt(betId));

  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([DISCRIMINATORS.place_bet, betIdBuf, amountLamports]),
  }));

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

export async function buildClaimRewardTransaction(
  connection: Connection,
  wallet: WalletContextState,
  betId: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [vaultPDA] = getVaultPDA();
  const [betPDA] = getBetPDA(wallet.publicKey, betId);

  const tx = new Transaction();
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: DISCRIMINATORS.claim_reward,
  });

  tx.add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

export async function buildAdminWithdrawTransaction(
  connection: Connection,
  wallet: WalletContextState,
  amountSol: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [vaultPDA] = getVaultPDA();
  const amountLamports = Buffer.alloc(8);
  amountLamports.writeBigUInt64LE(BigInt(Math.round(amountSol * 1e9)));

  const tx = new Transaction();
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.concat([DISCRIMINATORS.admin_withdraw, amountLamports]),
  }));

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}
