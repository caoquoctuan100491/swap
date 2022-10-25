import { PublicKey, Signer, SystemProgram } from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { Ctx } from "./ctx";

export namespace RPC {
    export async function initialize(ctx: Ctx) {
        let tx = await ctx.program.methods.initialize(
            ctx.initialTokenPrice,
            { tokens: ctx.amountToVault },
        ).accounts({
            poolAccount: ctx.accounts.pool.key,
            distributionAuthority: ctx.owner.publicKey,
            tokensForDistribution: ctx.tokensForDistribution.address,
            tokenMint: ctx.token_mint,
            vault: ctx.vault,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        }).signers([ctx.owner]).rpc();
        console.log("transaction: " + tx);
    }

    export async function swapTokens(ctx: Ctx, trader: Signer, tokensAmount: anchor.BN) {
        const ata = await getOrCreateAssociatedTokenAccount(ctx.connection, trader, ctx.token_mint, trader.publicKey);
        let tx = await ctx.program.methods.swapToken(
            { tokens: tokensAmount },
        ).accounts({
            poolAccount: ctx.accounts.pool.key,
            tokenMint: ctx.token_mint,
            vault: ctx.vault,
            user: trader.publicKey,
            userTokenAccount: ata.address,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([trader]).rpc();
        console.log("transaction: " + tx);
    }

    export async function withdrawLamports(ctx: Ctx) {
        await ctx.program.methods.withdrawLamports()
            .accounts({
                poolAccount: ctx.accounts.pool.key,
                tokenMint: ctx.token_mint,
                owner: ctx.owner.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([ctx.owner])
            .rpc();
    }
}
