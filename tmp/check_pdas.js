import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G');

function getVaultPDA(seed) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    PROGRAM_ID
  );
  return { pda: pda.toBase58(), bump };
}

console.log('vault:', getVaultPDA('vault'));
console.log('vault_v1:', getVaultPDA('vault_v1'));
console.log('vault_v6:', getVaultPDA('vault_v6'));
