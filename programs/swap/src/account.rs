use anchor_lang::prelude::*;
use anchor_spl::token::{ TokenAccount, Token, Mint, transfer, Transfer };
use anchor_spl::associated_token::AssociatedToken;
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
    /// The price for one token
    pub token_price: u64,
    /// The vault with selling tokens.
    pub vault: Pubkey,
}

impl PoolAccount {
    pub const SPACE: usize = 1 + 32 * 4 + 8;
}


// ***********************************************************************************************************************
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = distribution_authority,
        space = 8 + PoolAccount::SPACE,
        seeds = [token_mint.to_account_info().key.as_ref()],
        bump,
    )]
    pub pool_account: Account<'info, PoolAccount>,
    // The one who will sign the transaction of transferring tokens from the `tokens_for_distribution` account
    // to the `vault` account.
    // And then allowed to withdraw payment from the pool.
    #[account(mut)]
    pub distribution_authority: Signer<'info>,
    #[account(
        mut,
        constraint = tokens_for_distribution.owner == distribution_authority.key(),
    )]
    pub tokens_for_distribution: Account<'info, TokenAccount>,
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = distribution_authority,
        associated_token::mint = token_mint,
        associated_token::authority = pool_account,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn send_tokens_to_pool(&self, amount: Tokens) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.tokens_for_distribution.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.distribution_authority.to_account_info(),
        };
        transfer(
            CpiContext::new(self.token_program.to_account_info(), cpi_accounts),
            amount.into()
        )
    }
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
}

impl<'info> SwapTokens<'info> {
    pub fn send_tokens_from_pool_to_user(&self, tokens_amount: Tokens) -> Result<()> {
        let seeds = &[self.token_mint.to_account_info().key.as_ref(), &[self.pool_account.bump]];

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