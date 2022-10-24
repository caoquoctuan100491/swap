use anchor_lang::prelude::*;

#[event]
pub struct SwapCompleted {
    pub token: u64,
    pub sol: u64,
    pub user: Pubkey,
}

#[event]
pub struct SwapFailed {
    pub user: Pubkey,
}