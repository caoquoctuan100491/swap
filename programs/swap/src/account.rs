use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, Mint, transfer, Transfer};
use crate::currency::Tokens;


/// The main state of the program
#[account]
pub struct PoolAccount {
    pub bump: u8,
    /// The owner of the token sale program.
    pub owner: Pubkey,
    /// Describes the type of the selling tokens.
    /// The mint itself does not need to be under control of the token sale owner.
    pub token_mint: Pubkey,
    /// Describes the type of the tokens that are accepted as a payment for selling tokens.
    pub payment_mint: Pubkey,
    /// The vault with selling tokens.
    pub vault: Pubkey,
}

impl PoolAccount {
    pub const SPACE: usize = 1 + 32 * 4;
}

// ***********************************************************************************************************************
#[derive(Accounts)]
pub struct WithdrawLamports<'info> {
    #[account(
        mut,
        seeds = [token_mint.to_account_info().key.as_ref()],
        bump = pool_account.bump,
        has_one = token_mint,
        has_one = owner,
    )]
    pub pool_account: Account<'info, PoolAccount>,
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> WithdrawLamports<'info> {
    pub fn send_lamports_from_pool_to_owner(&mut self) -> Result<()> {
        let pool_info = self.pool_account.to_account_info();
        let pool_data_len = pool_info.try_data_len()?;
        let pool_minimum_rent_exempt_balance = self.rent.minimum_balance(pool_data_len);
        let all_pool_lamports = **pool_info.try_borrow_lamports()?;
        let available_lamports = all_pool_lamports - pool_minimum_rent_exempt_balance;

        **pool_info.try_borrow_mut_lamports()? -= available_lamports;
        **self.owner.try_borrow_mut_lamports()? += available_lamports;

        Ok(())
    }
}

// ***********************************************************************************************************************
#[derive(Accounts)]
pub struct SwapTokens<'info> {
    #[account(
        mut,
        seeds = [token_mint.to_account_info().key.as_ref()],
        bump = pool_account.bump,
        has_one = token_mint,
        has_one = vault,
    )]
    pub pool_account: Account<'info, PoolAccount>,
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == token_mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

impl<'info> SwapTokens<'info> {
    pub fn send_tokens_from_pool_to_user(&self, tokens_amount: Tokens) -> Result<()> {
        let seeds = &[
            self.token_mint.to_account_info().key.as_ref(),
            &[self.pool_account.bump]
        ];

        transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.vault.to_account_info(),
                    to: self.user_token_account.to_account_info(),
                    authority: self.pool_account.to_account_info(),
                },
                &[&seeds[..]]
            ),
            tokens_amount.into()
        )
    }
}
