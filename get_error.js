const { Connection, PublicKey, Transaction, TransactionInstruction } = require('@solana/web3.js');

async function test() {
  const c = new Connection('https://api.devnet.solana.com');
  const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');
  
  const accounts = await c.getProgramAccounts(PROGRAM_ID);
  
  let validBet = null;
  // BetAccount discriminator: 147, 23, 35, 59, 13, 107, 185, 41 or something? We don't know it offhand.
  // We can just rely on size = 90
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
  
  console.log(`Found unclaimed bet. Bettor: ${bettor.toBase58()}, grid: ${gridPDA.toBase58()}, amount: ${amount}`);

  // Need priceMin and startTime to form claim transaction
  // They are in GridAccount.
  const gridInfo = await c.getAccountInfo(gridPDA);
  if (!gridInfo) {
    console.log("Grid not found!");
    return;
  }
  
  const priceMin = gridInfo.data.readBigUInt64LE(40);
  const startTime = gridInfo.data.readBigInt64LE(56);
  const status = gridInfo.data[72];
  
  console.log(`Grid priceMin: ${priceMin}, startTime: ${startTime}, status: ${status}`);

  // Build the TX
  const vaultPDA = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0];
  const betPDA = validBet.pubkey;
  
  const tx = new Transaction();

  if (status !== 2) {
      console.log("Adding resolve_grid instruction...");
      tx.add(new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: gridPDA, isSigner: false, isWritable: true },
          { pubkey: vaultPDA, isSigner: false, isWritable: true },
          { pubkey: new PublicKey('3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN'), isSigner: false, isWritable: true },
          { pubkey: bettor, isSigner: true, isWritable: false },
        ],
        data: Buffer.from([140, 52, 19, 246, 85, 99, 60, 249]),
      }));
  }

  // Claim
  const claimData = Buffer.alloc(8 + 8 + 8);
  Buffer.from([149, 95, 181, 242, 94, 90, 158, 162]).copy(claimData, 0); // discriminator
  claimData.writeBigUInt64LE(priceMin, 8);
  claimData.writeBigInt64LE(startTime, 16);

  tx.add(new TransactionInstruction({
     programId: PROGRAM_ID,
     keys: [
       { pubkey: betPDA, isSigner: false, isWritable: true },
       { pubkey: gridPDA, isSigner: false, isWritable: false },
       { pubkey: vaultPDA, isSigner: false, isWritable: true },
       { pubkey: bettor, isSigner: true, isWritable: true },
     ],
     data: claimData
  }));
  
  tx.feePayer = bettor;
  
  console.log("Simulating transaction...");
  try {
    const simRes = await c.simulateTransaction(tx, []);
    console.log("Logs:", simRes.value.logs);
    if (simRes.value.err) console.log("Error object:", simRes.value.err);
  } catch(e) {
    console.log("Simulation exception:", e.message);
  }
}
test();
