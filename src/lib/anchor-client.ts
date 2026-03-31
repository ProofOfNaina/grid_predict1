import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';

console.log('[ANCHOR CLIENT] Final Accuracy Version Active.');

// ---------------- PROGRAM ----------------

export const CONNECTION_URL = 'https://api.devnet.solana.com';
export const PROGRAM_ID = new PublicKey('FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G');
export const VAULT_PDA = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0];
export const ADMIN_PUBKEY = new PublicKey('3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN');

// ---------------- PDA DERIVATION ----------------
export const isProgramDeployed = () => true;

// ---------------- PDA ----------------

export function getGridPDA(priceMin: number, startTime: number): [PublicKey, number] {
  const priceMinBuf = Buffer.alloc(8);
  priceMinBuf.writeBigUInt64LE(BigInt(Math.round(priceMin * 100)));

  const startTimeBuf = Buffer.alloc(8);
  startTimeBuf.writeBigInt64LE(BigInt(Math.floor(startTime / 1000)));

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
  // Uses "vault" seeds to match the smart contract and check-vault script
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
}

// ---------------- ENCODERS ----------------

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

// ---------------- DISCRIMINATORS ----------------

// ---------------- DISCRIMINATORS ----------------

const DISCRIMINATORS = {
  initialize_vault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  create_grid: Buffer.from([100, 135, 127, 158, 30, 0, 37, 82]),
  place_bet: Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]),
  resolve_grid: Buffer.from([140, 52, 19, 246, 85, 99, 207, 149]),
  expire_grid: Buffer.from([104, 216, 211, 125, 7, 188, 2, 43]),
  claim_reward: Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]),
  collect_revenue: Buffer.from([87, 96, 211, 36, 240, 43, 246, 87]),
};

// ---------------- ADMIN ----------------

const ADMIN_LIST = [
  '3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN',
  'B9jyXfYdyKpGsLR569VHcpfWqxnyVBCnBMPZxSyoucHj'
];

export function checkIsAdmin(pubkey?: string): boolean {
  if (!pubkey) return false;
  return ADMIN_LIST.includes(pubkey);
}

// ---------------- TRANSACTIONS ----------------

export async function buildResolveGridTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  startTime: number,
  isExpiry: boolean = false
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [vaultPDA] = getVaultPDA();

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gridPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: ADMIN_PUBKEY, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data: isExpiry ? DISCRIMINATORS.expire_grid : DISCRIMINATORS.resolve_grid,
  });

  tx.add(ix);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return tx;
}

export async function buildCollectRevenueTransaction(
  connection: Connection,
  wallet: WalletContextState,
  amount: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [vaultPDA] = getVaultPDA();
  const lamports = Math.round(amount * 1e9);

  const tx = new Transaction();
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // Owner
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // Authority
    ],
    data: Buffer.concat([DISCRIMINATORS.collect_revenue, encodeU64(lamports)]),
  }));

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

export async function buildClaimRewardTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  startTime: number
) {
  if (!wallet.publicKey) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [betPDA] = getBetPDA(gridPDA, wallet.publicKey);
  const [vaultPDA] = getVaultPDA();

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })
  );

  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: gridPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.concat([
      DISCRIMINATORS.claim_reward,
      encodeU64(Math.round(priceMin * 100)),
      encodeI64(Math.floor(startTime / 1000)),
    ]),
  }));

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = wallet.publicKey;
  return tx;
}

export async function buildPlaceBetTransaction(
  connection: Connection,
  wallet: WalletContextState,
  priceMin: number,
  priceMax: number,
  startTime: number,
  endTime: number,
  amount: number,
): Promise<Transaction | null> {
  if (!wallet.publicKey) return null;

  const [gridPDA] = getGridPDA(priceMin, startTime);
  const [betPDA] = getBetPDA(gridPDA, wallet.publicKey);
  const [vaultPDA] = getVaultPDA();

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }));

  // Check state to avoid "Double-Initialization" or "Not Initialized" errors
  const [vaultInfo, gridInfo] = await Promise.all([
    connection.getAccountInfo(vaultPDA).catch(() => null),
    connection.getAccountInfo(gridPDA).catch(() => null)
  ]);

  // If the account has no owner yet or is owned by system program (111...) with 0 data, it needs init
  const needsVaultInit = !vaultInfo || vaultInfo.owner.toBase58() === '11111111111111111111111111111111' || vaultInfo.data.length === 0;
  const needsGridInit = !gridInfo || gridInfo.owner.toBase58() === '11111111111111111111111111111111' || gridInfo.data.length === 0;

  if (needsVaultInit) {
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

  if (needsGridInit) {
    tx.add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: gridPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        DISCRIMINATORS.create_grid,
        encodeU64(Math.round(priceMin * 100)),
        encodeU64(Math.round(priceMax * 100)),
        encodeI64(Math.floor(startTime / 1000)),
        encodeI64(Math.floor(endTime / 1000)),
      ]),
    }));
  }

  // Mandatory: place_bet
  const lamports = Math.round(amount * 1e9);
  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gridPDA, isSigner: false, isWritable: true },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      DISCRIMINATORS.place_bet,
      encodeU64(Math.round(priceMin * 100)),
      encodeI64(Math.floor(startTime / 1000)),
      encodeU64(lamports),
    ]),
  }));

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}