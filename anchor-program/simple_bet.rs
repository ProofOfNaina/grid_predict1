// DirectBetting Solana Program — Anchor Framework
// This contract allows users to place bets, claim rewards if they win, 
// and admins to collect funds from lost bets.

use anchor_lang::prelude::*;
use anchor_lang::system_program;

use anchor_lang::solana_program::pubkey;

declare_id!("FCQ9SJBCPTP7Umt2aijpr8KN9DF5qHj4WmbWmCwKqm3G");

pub const ADMIN_1: Pubkey = pubkey!("3mkMtv9kbVYi1Zh2dANQgPzR3d8oQ9hiMxsHZb515pBN");
pub const ADMIN_2: Pubkey = pubkey!("B9jyXfYdyKpGsLR569VHcpfWqxnyVBCnBMPZxSyoucHj");

#[program]
pub mod direct_betting {
    use super::*;

    /// Initializes the global vault that holds all bet funds.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let admin_key = ctx.accounts.admin.key();
        
        // Ensure only one of our hardcoded admins can initialize
        require!(
            admin_key == ADMIN_1 || admin_key == ADMIN_2,
            BettingError::Unauthorized
        );

        vault.admin = admin_key;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// User places a bet. SOL is transferred to the Vault PDA.
    pub fn place_bet(ctx: Context<PlaceBet>, bet_id: u64, amount: u64) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        bet.bettor = ctx.accounts.bettor.key();
        bet.amount = amount;
        bet.status = BetStatus::Active;
        bet.bet_id = bet_id;
        bet.bump = ctx.bumps.bet;

        // Transfer SOL from bettor to vault
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

        Ok(())
    }

    /// Admin marks a bet as Won or Lost.
    pub fn resolve_bet(ctx: Context<ResolveBet>, status: BetStatus) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        require!(bet.status == BetStatus::Active, BettingError::AlreadyResolved);
        bet.status = status;
        Ok(())
    }

    /// User claims their reward if the bet is marked as Won.
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        require!(bet.status == BetStatus::Won, BettingError::NotAWinner);
        
        let payout = bet.amount * 2; // Example: 2x payout. Logic can be dynamic.

        let vault_info = ctx.accounts.vault.to_account_info();
        let bettor_info = ctx.accounts.bettor.to_account_info();

        // Perform the transfer from PDA
        **vault_info.try_borrow_mut_lamports()? -= payout;
        **bettor_info.try_borrow_mut_lamports()? += payout;

        bet.status = BetStatus::Claimed;
        Ok(())
    }

    /// Admin transfers funds from the vault (e.g., from lost bets) to their wallet.
    pub fn admin_withdraw(ctx: Context<AdminWithdraw>, amount: u64) -> Result<()> {
        let vault_info = ctx.accounts.vault.to_account_info();
        let admin_info = ctx.accounts.admin.to_account_info();

        require!(vault_info.lamports() >= amount, BettingError::InsufficientFunds);

        **vault_info.try_borrow_mut_lamports()? -= amount;
        **admin_info.try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

// --- Account States ---

#[account]
pub struct VaultAccount {
    pub admin: Pubkey,
    pub total_collected: u64,
    pub bump: u8,
}

#[account]
pub struct BetAccount {
    pub bettor: Pubkey,
    pub amount: u64,
    pub status: BetStatus,
    pub bet_id: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BetStatus {
    Active,
    Won,
    Lost,
    Claimed,
}

// --- Contexts ---

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 1,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: u64)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 8 + 1 + 8 + 1,
        seeds = [b"bet", bettor.key().as_ref(), bet_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bet: Account<'info, BetAccount>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveBet<'info> {
    #[account(mut)]
    pub bet: Account<'info, BetAccount>,
    #[account(
        seeds = [b"vault"],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        constraint = admin.key() == ADMIN_1 || admin.key() == ADMIN_2 @ BettingError::Unauthorized
    )]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        has_one = bettor,
        seeds = [b"bet", bettor.key().as_ref(), bet.bet_id.to_le_bytes().as_ref()],
        bump = bet.bump
    )]
    pub bet: Account<'info, BetAccount>,
    /// CHECK: Safe PDA transfer
    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub bettor: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        mut,
        constraint = admin.key() == ADMIN_1 || admin.key() == ADMIN_2 @ BettingError::Unauthorized
    )]
    pub admin: Signer<'info>,
}

// --- Errors ---

#[error_code]
pub enum BettingError {
    #[msg("Unauthorized: Only admin can perform this action")]
    Unauthorized,
    #[msg("Bet is already resolved")]
    AlreadyResolved,
    #[msg("This bet is not a winner")]
    NotAWinner,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
}
