// GridPredict Solana Program — Anchor Framework
// This is REFERENCE CODE. Deploy with `anchor build && anchor deploy`.

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("5WnkG5k947XrUK1Lcf3bJ7Y31ncRWBFJbL51LyV8sLUh");

pub const PROGRAM_ADMIN_ID: Pubkey = pubkey!("3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN");
const PAYOUT_MULTIPLIER: u64 = 4;

#[program]
pub mod grid_predict {
    use super::*;

    pub fn initialize_vault(_ctx: Context<InitializeVault>) -> Result<()> {
        Ok(())
    }

    pub fn create_grid(
        ctx: Context<CreateGrid>,
        price_min: u64,
        price_max: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let grid = &mut ctx.accounts.grid;
        grid.authority = ctx.accounts.authority.key();
        grid.price_min = price_min;
        grid.price_max = price_max;
        grid.start_time = start_time;
        grid.end_time = end_time;
        grid.status = GridStatus::Open;
        grid.total_bets = 0;
        grid.total_amount = 0;
        grid.bump = ctx.bumps.grid;
        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        _price_min: u64,
        _start_time: i64,
        amount: u64,
    ) -> Result<()> {
        let grid = &mut ctx.accounts.grid;
        require!(grid.status == GridStatus::Open, GridError::GridNotOpen);

        let clock = Clock::get()?;
        let cutoff = grid.start_time - 2; // 2 second cutoff
        require!(clock.unix_timestamp < cutoff, GridError::BettingClosed);
        require!(amount > 0, GridError::InvalidAmount);

        // Transfer SOL to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bettor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let bet = &mut ctx.accounts.bet;
        bet.bettor = ctx.accounts.bettor.key();
        bet.grid = grid.key();
        bet.amount = amount;
        bet.claimed = false;
        bet.timestamp = clock.unix_timestamp;
        bet.bump = ctx.bumps.bet;

        grid.total_bets += 1;
        grid.total_amount += amount;

        Ok(())
    }

    pub fn resolve_grid(ctx: Context<ResolveGrid>) -> Result<()> {
        let grid = &mut ctx.accounts.grid;
        require!(
            grid.status == GridStatus::Open || grid.status == GridStatus::Locked,
            GridError::GridAlreadyResolved
        );
        grid.status = GridStatus::Touched;
        Ok(())
    }

    pub fn expire_grid(ctx: Context<ResolveGrid>) -> Result<()> {
        let grid = &mut ctx.accounts.grid;
        require!(
            grid.status == GridStatus::Open || grid.status == GridStatus::Locked,
            GridError::GridAlreadyResolved
        );
        grid.status = GridStatus::Expired;
        Ok(())
    }

    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        _price_min: u64,
        _start_time: i64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let grid = &ctx.accounts.grid;

        require!(!bet.claimed, GridError::AlreadyClaimed);
        require!(grid.status == GridStatus::Touched, GridError::GridNotTouched);

        let payout = bet.amount * PAYOUT_MULTIPLIER;

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += payout;

        bet.claimed = true;
        Ok(())
    }

    pub fn collect_revenue(ctx: Context<CollectRevenue>, amount: u64) -> Result<()> {
        let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
        require!(vault_lamports >= amount, GridError::InsufficientVaultFunds);
        
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

// === Accounts ===

#[account]
pub struct GridAccount {
    pub authority: Pubkey,
    pub price_min: u64,       // Price in cents (e.g., 215000 = $2150.00)
    pub price_max: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub status: GridStatus,
    pub total_bets: u64,
    pub total_amount: u64,
    pub bump: u8,
}

#[account]
pub struct BetAccount {
    pub bettor: Pubkey,
    pub grid: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct VaultAccount {
    pub bump: u8,
}

// === Status Enum ===

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GridStatus {
    Open,
    Locked,
    Touched,
    Expired,
}

// === Instruction Contexts ===

#[derive(Accounts)]
#[instruction(price_min: u64, price_max: u64, start_time: i64, end_time: i64)]
pub struct CreateGrid<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1,
        seeds = [b"grid", price_min.to_le_bytes().as_ref(), start_time.to_le_bytes().as_ref()],
        bump
    )]
    pub grid: Account<'info, GridAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(price_min: u64, start_time: i64, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"grid", price_min.to_le_bytes().as_ref(), start_time.to_le_bytes().as_ref()],
        bump = grid.bump
    )]
    pub grid: Account<'info, GridAccount>,
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 32 + 8 + 1 + 8 + 1,
        seeds = [b"bet", grid.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, BetAccount>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    /// CHECK: Vault PDA address verified by seeds, does not need to be initialized for SOL transfers
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 1,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveGrid<'info> {
    #[account(mut)]
    pub grid: Account<'info, GridAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(price_min: u64, start_time: i64)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        has_one = grid,
        has_one = bettor
    )]
    pub bet: Account<'info, BetAccount>,
    #[account(
        seeds = [b"grid", price_min.to_le_bytes().as_ref(), start_time.to_le_bytes().as_ref()],
        bump = grid.bump
    )]
    pub grid: Account<'info, GridAccount>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    /// CHECK: Vault PDA address verified by seeds
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub bettor: Signer<'info>,
}

#[derive(Accounts)]
pub struct CollectRevenue<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    /// CHECK: Vault PDA address verified by seeds.
    pub vault: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = authority.key() == PROGRAM_ADMIN_ID @ GridError::Unauthorized
    )]
    pub authority: Signer<'info>,
}

// === Errors ===

#[error_code]
pub enum GridError {
    #[msg("Grid is not open for betting")]
    GridNotOpen,
    #[msg("Betting window has closed")]
    BettingClosed,
    #[msg("Invalid bet amount")]
    InvalidAmount,
    #[msg("Grid is already resolved")]
    GridAlreadyResolved,
    #[msg("Grid has not been touched")]
    GridNotTouched,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds in vault")]
    InsufficientVaultFunds,
}
