import { 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction, 
  Connection, 
  Keypair 
} from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';

// Config
const PROGRAM_ID = new PublicKey('FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G');

async function main() {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  
  // 2. Load wallet (Check multiple common locations)
  const paths = [
    `${os.homedir()}/.config/solana/id.json`,
    'id.json',
    './id.json'
  ];
  
  let wallet;
  for (const path of paths) {
    if (fs.existsSync(path)) {
      const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
      wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      console.log('[INIT] Loaded wallet from:', path);
      break;
    }
  }

  if (!wallet) {
    console.error('[INIT] ❌ ERROR: No Solana wallet found. Please place your id.json in this folder.');
    return;
  }

  // Derive PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );

  console.log('[INIT] Target Vault (v1 Stable):', vaultPDA.toBase58());

  // instruction discriminator for initialize_vault
  const discriminator = Buffer.from([144, 186, 114, 185, 204, 128, 59, 137]);
  
  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator,
    })
  );

  try {
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signature = await connection.sendTransaction(tx, [wallet]);
    console.log('[INIT] ✅ SUCCESS! Vault initialized. Signature:', signature);
  } catch (err) {
    console.log('[INIT] ⚠️ Error or Already Initialized:', err.message);
  }
}

main();
