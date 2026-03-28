import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');
const CONNECTION_URL = 'https://api.devnet.solana.com';

async function checkVault() {
  const connection = new Connection(CONNECTION_URL, 'confirmed');
  const [vaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID);

  console.log('Vault Address:', vaultPDA.toBase58());

  const info = await connection.getAccountInfo(vaultPDA);
  if (!info) {
    console.log('Account not found.');
    return;
  }

  console.log('Balance (SOL):', info.lamports / 1e9);
  console.log('Data Length:', info.data.length);
  console.log('Data Hex:', info.data.toString('hex'));
}

checkVault().catch(console.error);
