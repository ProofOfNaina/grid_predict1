import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');

async function test() {
  const c = new Connection('https://api.devnet.solana.com');
  const accounts = await c.getProgramAccounts(PROGRAM_ID);
  
  let validBet = null;
  for (const acc of accounts) {
    if (acc.account.data.length === 90) {
       const claimed = acc.account.data[80] === 1;
       if (!claimed) {
         validBet = acc;
         break;
       }
    }
  }

  if (!validBet) {
    console.log("No unclaimed bet found to simulate.");
    return;
  }

  const bettor = new PublicKey(validBet.account.data.subarray(8, 40));
  const gridPDA = new PublicKey(validBet.account.data.subarray(40, 72));
  const amount = validBet.account.data.readBigUInt64LE(72);

  const gridInfo = await c.getAccountInfo(gridPDA);
  if (!gridInfo) return;
  
  const priceMin = gridInfo.data.readBigUInt64LE(40);
  const startTime = gridInfo.data.readBigInt64LE(56);
  const status = gridInfo.data[72];
  
  const vaultPDA = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0];
  const tx = new Transaction();

  // INVISIBLE FIX 
  const vaultInfo = await c.getAccountInfo(vaultPDA);
  if (!vaultInfo || vaultInfo.data.length === 0) {
      tx.add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: vaultPDA, isSigner: false, isWritable: true },
          { pubkey: bettor, isSigner: true, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
        ],
        data: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
      }));
  }

  if (status !== 2) {
      tx.add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: gridPDA, isSigner: false, isWritable: true },
          { pubkey: bettor, isSigner: true, isWritable: false },
        ],
        data: Buffer.from([140, 52, 19, 246, 85, 99, 60, 249]),
      }));
  }

  const claimData = Buffer.alloc(8 + 8 + 8);
  Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]).copy(claimData, 0);
  claimData.writeBigUInt64LE(priceMin, 8);
  claimData.writeBigInt64LE(startTime, 16);

  tx.add(new TransactionInstruction({
     programId: PROGRAM_ID,
     keys: [
       { pubkey: validBet.pubkey, isSigner: false, isWritable: true },
       { pubkey: gridPDA, isSigner: false, isWritable: false },
       { pubkey: vaultPDA, isSigner: false, isWritable: true },
       { pubkey: bettor, isSigner: true, isWritable: true },
     ],
     data: claimData
  }));
  
  tx.feePayer = bettor;
  const { blockhash } = await c.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  
  console.log("Simulating block...");
  const sim = await c.simulateTransaction(tx, []);
  if (sim.value.err) {
    console.log("ERR DETECTED:", JSON.stringify(sim.value.err));
    console.log("LOGS:", JSON.stringify(sim.value.logs, null, 2));
  } else {
    console.log("Simulation SUCCESS!!");
  }
}
test().catch(e => console.error("Catch Error:", e));
