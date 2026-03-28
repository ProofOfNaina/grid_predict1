import { Connection, PublicKey } from '@solana/web3.js';

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
  console.log('Vault Address:', vaultPDA.toBase58());
  console.log('Bump:', bump);

  const vaultInfo = await connection.getAccountInfo(vaultPDA);

  if (!vaultInfo) {
    console.log('\n❌ Account: NOT CREATED');
  } else {
    console.log(`\n✅ Account Found`);
    console.log(`💰 Balance: ${vaultInfo.lamports / 1e9} SOL`);
    console.log(`👤 Owner Program: ${vaultInfo.owner.toBase58()}`);
    console.log(`📦 Data Size: ${vaultInfo.data.length} bytes`);

    if (vaultInfo.data.length >= 40) {
        const ownerPubkey = new PublicKey(vaultInfo.data.slice(8, 40));
        console.log(`👑 Registered Owner: ${ownerPubkey.toBase58()}`);
    } else {
        console.log('⚠️ Warning: Data length suggests it hasn\'t been initialized as a PDA yet.');
    }
  }
}

checkVault().catch(console.error);
