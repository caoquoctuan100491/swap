use anchor_lang::prelude::*;

use account::*;
use types::*;
mod currency; use currency::{Lamports, Tokens};

mod account;
mod types;
mod helper; use helper::send_lamports;
mod error; use error::ErrorCode;

declare_id!("6g7FMSAAjJK33JADSprJwaDwL5FPuyqRfqv6ekPKCdDz");

#[program]
pub mod swap {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        token_price: u64,
        amount: Tokens,
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool_account;
        pool_account.bump = *ctx.bumps.get("pool_account").expect("pool_account bump exists");
        pool_account.owner = ctx.accounts.distribution_authority.key();
        pool_account.token_mint = ctx.accounts.token_mint.key();
        pool_account.vault = ctx.accounts.vault.key();
        pool_account.token_price = token_price;

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
