import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
const c = new Connection('https://api.devnet.solana.com');
const PROGRAM_ID = new PublicKey('5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh');
async function run() {
    const pub = new PublicKey('3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN');
    const vaultPDA = PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0];
    const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: vaultPDA, isSigner: false, isWritable: true },
            { pubkey: pub, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164])
    });
    
    // Test the specific claim tx structure too since that's what's failing in their environment!
    const tx = new Transaction().add(ix);
    tx.feePayer = pub;
    const { blockhash } = await c.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    
    console.log("simulating Init");
    const sim = await c.simulateTransaction(tx, [pub]); // Not strictly signed but provider can simulated
    console.log("sim result:", sim);
}
run();
