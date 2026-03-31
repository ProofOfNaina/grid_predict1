import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram, 
  Keypair 
} from '@solana/web3.js';
import pkg from '@solana/web3.js';
const { sendAndConfirmTransaction } = pkg;
import fs from 'fs';
import os from 'os';

// Config
const PROGRAM_ID = new PublicKey('FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G');
const CONNECTION_URL = 'https://api.devnet.solana.com';

// Discriminator for "initialize_vault"
const DISCRIMINATOR = Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]);

async function main() {
  const connection = new Connection(CONNECTION_URL, 'confirmed');
  
  // Try to load your local Solana CLI keypair to pay for the transaction
  const idPath = `${os.homedir()}/.config/solana/id.json`;
  if (!fs.existsSync(idPath)) {
    console.error("❌ Could not find local Solana keypair at ~/.config/solana/id.json");
    console.log("Please create one with 'solana-keygen new' or point this script to your key file.");
    return;
  }
  
  const secretKey = JSON.parse(fs.readFileSync(idPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log(`Using Payer: ${payer.publicKey.toBase58()}`);

  const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID);
  console.log(`Vault PDA: ${vaultPDA.toBase58()}`);

  const vaultInfo = await connection.getAccountInfo(vaultPDA);
  if (vaultInfo && vaultInfo.owner.toBase58() === PROGRAM_ID.toBase58()) {
    console.log("✅ Vault is already initialized!");
    return;
  }

  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: DISCRIMINATOR
    })
  );

  console.log("Sending initialization transaction...");
  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(`🚀 Success! Signature: ${signature}`);
    console.log("The Vault is now owned by your program.");
  } catch (err) {
    console.error("❌ Initialization failed:", err);
  }
}

main();
