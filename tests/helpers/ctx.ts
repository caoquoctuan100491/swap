import {
    PublicKey,
    Connection,
    Signer,
    LAMPORTS_PER_SOL,
    Keypair
} from '@solana/web3.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    Account as TokenAccount,
    mintTo,
    getAssociatedTokenAddress,
    getMint,
} from '@solana/spl-token';
import { Program } from "@project-serum/anchor";
import { Swap } from "../../target/types/swap";
import * as anchor from "@project-serum/anchor";
import { use } from 'chai';
import bs58 from 'bs58';

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
    initialTokenPrice: anchor.BN,
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

    // const owner = Keypair.generate();
    // await getAirdrop(owner.publicKey);
    const owner = Keypair.fromSecretKey(Uint8Array.from([
        33, 123, 37, 174, 39, 56, 86, 32, 28, 148, 34,
        106, 52, 161, 181, 218, 231, 132, 92, 16, 144, 166,
        173, 214, 107, 192, 80, 136, 1, 157, 101, 135, 126,
        125, 95, 155, 85, 178, 45, 106, 244, 206, 5, 63,
        75, 241, 44, 180, 102, 193, 143, 253, 252, 0, 57,
        202, 175, 154, 197, 197, 0, 9, 132, 246
    ]));
    console.log("Owner: " + owner.publicKey);
    console.log("Owner Private Key: " + owner.secretKey);

    const price = 0.1 * 1e-6;

    const token_mint = await createMint(
        connection,
        owner, // payer
        owner.publicKey, // mintAuthority
        owner.publicKey, // freezeAuthority
        6 // decimals
    );
    // const mint_pubkey = new PublicKey("F35EhFaytkAa5TzcKDkJhxNjPDecFaVxywWZNHTws7uA");
    // const token_mint = await getMint(connection, mint_pubkey);
    const tokensForDistribution = await getOrCreateAssociatedTokenAccount(connection, owner, token_mint, owner.publicKey);
    const tokensForDistributionAmount = 10_000 * 1e6;
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

    console.log("Token Move: " + token_mint);

    const user = Keypair.fromSecretKey(Uint8Array.from([
        43, 49, 182, 145, 223, 255, 23, 12, 179, 31, 104,
        83, 70, 235, 108, 25, 10, 33, 168, 242, 120, 201,
        207, 199, 249, 58, 4, 44, 129, 73, 18, 32, 112,
        143, 7, 143, 99, 245, 40, 74, 91, 107, 135, 236,
        254, 213, 243, 210, 205, 68, 73, 92, 44, 102, 202,
        19, 68, 14, 137, 243, 111, 74, 186, 150
    ]));

    console.log("User " + user.publicKey);
    console.log("User private key: " + user.secretKey);

    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        user,
        token_mint,
        user.publicKey
    );


    async function getAirdrop(publicKey) {
        const airdropSignature = await connection.requestAirdrop(
            publicKey,
            LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
    }



    // await connection.confirmTransaction(airdropSignature);
    return {
        connection,
        program,
        owner,
        token_mint: token_mint,
        tokensForDistribution,
        amountToVault: new anchor.BN(10_000 * 1e6),
        vault,
        initialTokenPrice: new anchor.BN(price * LAMPORTS_PER_SOL),
        user: {
            signer: user,
            ata: ata.address,
        },
        accounts: {
            pool: { key: poolPDA, bump: poolBump },
        }
    }
}
