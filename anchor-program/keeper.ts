// GridPredict Keeper Bot — Reference Code
// Watches Pyth price feed and resolves grids when price enters range.
// Run: ANCHOR_WALLET=~/.config/solana/id.json ts-node keeper.ts

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import * as fs from "fs";

// Configuration
const SOLANA_RPC = "https://api.devnet.solana.com";
const PYTH_HERMES_URL = "https://hermes.pyth.network";
const SOL_USD_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const PROGRAM_ID = new PublicKey("GridPredictXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// Load wallet
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!, "utf-8"))
  )
);

async function main() {
  console.log("🤖 GridPredict Keeper Bot starting...");

  const connection = new Connection(SOLANA_RPC, "confirmed");
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {});

  // Load the program
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/grid_predict.json", "utf8")
  );
  const program = new Program(idl, PROGRAM_ID, provider);

  // Connect to Pyth Hermes for real-time prices
  const pythConnection = new PriceServiceConnection(PYTH_HERMES_URL);

  console.log("📡 Subscribing to SOL/USD price feed...");

  pythConnection.subscribePriceFeedUpdates([SOL_USD_FEED_ID], async (priceFeed) => {
    const price = priceFeed.getPriceUnchecked();
    const currentPrice = Number(price.price) * Math.pow(10, price.expo);

    console.log(`💰 SOL/USD: $${currentPrice.toFixed(2)}`);

    // Fetch all active GridAccounts from the program
    const grids = await program.account.gridAccount.all();

    for (const grid of grids) {
      const now = Math.floor(Date.now() / 1000);
      if (grid.account.status === 'Open' || grid.account.status === 'Locked') {
        if (now >= grid.account.startTime && now <= grid.account.endTime) {
          if (currentPrice >= grid.account.priceMin && currentPrice <= grid.account.priceMax) {
            try {
              await program.methods.resolveGrid().accounts({ 
                grid: grid.publicKey, 
                authority: wallet.publicKey 
              }).rpc();
              console.log(`✅ Grid ${grid.publicKey} TOUCHED at $${currentPrice}`);
            } catch (error) {
              console.error(`Failed to resolve grid ${grid.publicKey}:`, error);
            }
          }
        } else if (now > grid.account.endTime) {
          try {
            await program.methods.expireGrid().accounts({ 
              grid: grid.publicKey, 
              authority: wallet.publicKey 
            }).rpc();
            console.log(`⏰ Grid ${grid.publicKey} EXPIRED`);
          } catch (error) {
            console.error(`Failed to expire grid ${grid.publicKey}:`, error);
          }
        }
      }
    }
  });

  // Keep alive
  process.on("SIGINT", () => {
    console.log("👋 Keeper bot shutting down...");
    pythConnection.closeWebSocket();
    process.exit();
  });
}

main().catch(console.error);
