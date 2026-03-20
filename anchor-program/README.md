# Solana Anchor Program — GridPredict

This directory contains reference code for the on-chain Solana program.
Deploy with Anchor CLI (`anchor build && anchor deploy`).

## Structure

- `lib.rs` — Main program with all instructions
- `keeper.ts` — Off-chain keeper bot that watches Pyth prices and resolves grids

## Setup

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Initialize (if starting fresh)
anchor init grid_predict
# Then copy lib.rs into programs/grid_predict/src/lib.rs

# Build & deploy to devnet
anchor build
anchor deploy --provider.cluster devnet
```

## Program Instructions

1. `create_grid(price_min, price_max, start_time, end_time)` — Creates a new grid cell
2. `place_bet(amount)` — Places a bet on an open grid
3. `resolve_grid()` — Marks grid as TOUCHED (called by keeper)
4. `expire_grid()` — Marks grid as EXPIRED
5. `claim_reward()` — Winners claim 4× payout

## Keeper Bot

Run the keeper separately:
```bash
ANCHOR_WALLET=~/.config/solana/id.json ts-node keeper.ts
```
