import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';

async function fix() {
  const c = new Connection('https://api.devnet.solana.com');
  const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');
  const vaultPDA = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0];
  
  const kp = Keypair.generate();
  console.log("Air dropping SOL to", kp.publicKey.toBase58());
  const airdropSignature = await c.requestAirdrop(kp.publicKey, 1e9);
  await c.confirmTransaction(airdropSignature);
  console.log("Airdrop complete");
  
  const tx = new Transaction().add(
      new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: vaultPDA, isSigner: false, isWritable: true },
            { pubkey: kp.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]), // initialize_vault discriminator
      })
  );
  
  console.log("Sending init...");
  const sig = await sendAndConfirmTransaction(c, tx, [kp]);
  console.log("SUCCESS:", sig);
}

fix().catch(console.error);
