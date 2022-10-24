use anchor_lang::prelude::*;

use account::*;
use types::*;
mod currency; use currency::{Lamports, Tokens};

mod account;
mod types;
mod initialize;pub use initialize::*;
mod helper; use helper::send_lamports;
mod error; use error::ErrorCode;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod swap {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        amount: Tokens,
    ) -> Result<()> {
        let tokens_for_vault = Tokens::new(ctx.accounts.tokens_for_distribution.amount);
        require!(amount <= tokens_for_vault, ErrorCode::NotEnoughTokens);
        let pool_account = &mut ctx.accounts.pool_account;
        pool_account.bump = *ctx.bumps.get("pool_account").expect("pool_account bump exists");
        pool_account.owner = ctx.accounts.distribution_authority.key();
        pool_account.token_mint = ctx.accounts.token_mint.key();
        pool_account.vault = ctx.accounts.vault.key();

        ctx.accounts.send_tokens_to_pool(amount)
    }

    pub fn withdraw_lamports(ctx: Context<WithdrawLamports>) -> Result<()> {
        ctx.accounts.send_lamports_from_pool_to_owner()
    }

    pub fn swap_token(ctx: Context<SwapTokens>, amount: Tokens) -> Result<()> {
        let amount_in_vault = Tokens::new(ctx.accounts.vault.amount);
        let lamports_amount = ctx.accounts.pool_account
            .try_tokens_to_lamports(amount).expect("Converts tokens to lamports");
        let user_lamports = **ctx.accounts.user.to_account_info().try_borrow_lamports()?;

        require!(amount_in_vault >= amount, ErrorCode::NotEnoughTokensInVault);
        require!(user_lamports >= lamports_amount.into(), ErrorCode::NotEnoughLamports);

        let user = &mut ctx.accounts.user;
        let pool = &mut ctx.accounts.pool_account;

        send_lamports(user.to_account_info(), pool.to_account_info(), lamports_amount)?;
        ctx.accounts.send_tokens_from_pool_to_user(amount)?;

        Ok(())
    }


}
