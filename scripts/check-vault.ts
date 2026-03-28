import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');
const CONNECTION_URL = 'https://api.devnet.solana.com';

async function checkVault() {
  const connection = new Connection(CONNECTION_URL, 'confirmed');

  // Derive Vault PDA
  const [vaultPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );

  console.log('--- Vault Status Report ---');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Vault PDA Address:', vaultPDA.toBase58());
  console.log('Bump:', bump);

  const vaultInfo = await connection.getAccountInfo(vaultPDA);

  if (!vaultInfo) {
    console.log('\n❌ Vault Account: NOT CREATED (No SOL, No Data)');
  } else {
    console.log(`\n✅ Vault Account: CREATED`);
    console.log(`💰 Balance: ${vaultInfo.lamports / 1e9} SOL`);
    console.log(`📦 Data Length: ${vaultInfo.data.length} bytes`);
    console.log(`👤 Owner Program: ${vaultInfo.owner.toBase58()}`);

    if (vaultInfo.data.length > 8) {
        // Simple heuristic to find owner address in data (it's at index 8 after discriminator)
        const ownerPubkey = new PublicKey(vaultInfo.data.slice(8, 40));
        console.log(`👑 Vault Owner (from data): ${ownerPubkey.toBase58()}`);
    } else if (vaultInfo.data.length === 0) {
        console.log('⚠️ Warning: Account has balance but NO PDA DATA (possibly uninitialized)');
    }
  }
}

checkVault().catch(console.error);
