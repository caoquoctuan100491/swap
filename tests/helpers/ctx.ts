import {
    PublicKey,
    Connection,
    Signer,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    Account as TokenAccount,
    mintTo,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Program } from "@project-serum/anchor";
import { Swap } from "../../target/types/swap";
import * as anchor from "@project-serum/anchor";
import {
    createUserWithLamports,
    createUserWithATA,
} from "./helper";

// This interface is passed to every RPC test functions
export interface Ctx {
    connection: Connection,
    program: Program<Swap>,
    // The owner of the program and tokens
    owner: Signer,
    // The mint of the tokens
    token_mint: PublicKey,
    // Owner's ATA with tokens
    tokensForDistribution: TokenAccount,
    amountToVault: anchor.BN,
    // pool ATA for storing
    vault: PublicKey,
    user: CtxUser,
    accounts: {
        pool: CtxAccountPDA,
    }
}

export interface CtxUser {
    signer: Signer,
    ata: PublicKey,
}

export interface CtxAccount {
    key: PublicKey,
}

export interface CtxAccountPDA extends CtxAccount {
    bump: number,
}

export async function createCtx(connection: Connection, program: Program<Swap>): Promise<Ctx> {
    const owner = await createUserWithLamports(connection, 1);
    const token_mint = await createMint(
        connection,
        owner, // payer
        owner.publicKey, // mintAuthority
        owner.publicKey, // freezeAuthority
        6 // decimals
    );
    const tokensForDistribution = await getOrCreateAssociatedTokenAccount(connection, owner, token_mint, owner.publicKey);
    const tokensForDistributionAmount = 10_000;
    await mintTo(
        connection,
        owner,
        token_mint,
        tokensForDistribution.address,
        owner,
        tokensForDistributionAmount,
    );
    const [poolPDA, poolBump] = await anchor.web3.PublicKey.findProgramAddress(
        [token_mint.toBuffer()],
        program.programId
    );
    const vault = await getAssociatedTokenAddress(token_mint, poolPDA, true);
    const [user1, ata1] = await createUserWithATA(connection, token_mint);

    return {
        connection,
        program,
        owner,
        token_mint,
        tokensForDistribution,
        amountToVault: new anchor.BN(10_000),
        vault,
        user: {
            signer: user1,
            ata: ata1.address,
        },
        accounts: {
            pool: { key: poolPDA, bump: poolBump },
        }
    }
}
