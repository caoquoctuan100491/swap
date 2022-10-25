use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("not enough lamports to swap")]
    NotEnoughLamports,
    #[msg("You don't have enough tokens to swap")]
    UserNotHaveEnoughTokens,
    #[msg("not enough tokens in vault to complete the swap")]
    NotEnoughTokensInVault,
}